"""
Tally Hot-Sync: connect directly to a running Tally Prime / Tally ERP 9
instance's built-in HTTP server and pull the Voucher Register into
VerificationItems — no manual CSV export required.

How to enable Tally's HTTP server:
  Gateway of Tally → F12 Configuration → Advanced Configuration
  Enable ODBC / HTTP Server → set port (default 9000).
"""
import re
import xml.etree.ElementTree as ET
from datetime import datetime, date
from typing import Optional

import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.audit import Audit
from app.models.user import User
from app.models.verification_item import VerificationItem, ItemType, VerificationStatus
from app.routes.auth import get_current_user
from app.utils.audit_log import log_action

router = APIRouter(tags=["tally_hot_sync"])

_TALLY_XML = """
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Voucher Register</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <SVFROMDATE>{from_date}</SVFROMDATE>
          <SVTODATE>{to_date}</SVTODATE>
          {company_tag}
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>
""".strip()

DATE_FORMATS = ["%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"]


class TallySyncRequest(BaseModel):
    host: str = "localhost"
    port: int = 9000
    from_date: str  # YYYYMMDD  e.g. "20230401"
    to_date: str    # YYYYMMDD  e.g. "20240331"
    company: Optional[str] = None


def _tally_date_to_dt(val: str) -> Optional[datetime]:
    """Parse Tally date string (YYYYMMDD) → datetime."""
    val = val.strip()
    try:
        return datetime.strptime(val, "%Y%m%d")
    except ValueError:
        pass
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(val, fmt)
        except ValueError:
            continue
    return None


def _get_text(el: Optional[ET.Element]) -> str:
    if el is None:
        return ""
    return (el.text or "").strip()


def _fetch_vouchers(host: str, port: int, from_date: str, to_date: str, company: Optional[str]) -> list[dict]:
    company_tag = f"<SVCURRENTCOMPANY>{company}</SVCURRENTCOMPANY>" if company else ""
    xml_body = _TALLY_XML.format(
        from_date=from_date,
        to_date=to_date,
        company_tag=company_tag,
    )
    try:
        resp = requests.post(
            f"http://{host}:{port}",
            data=xml_body,
            headers={"Content-Type": "text/xml"},
            timeout=15,
        )
        resp.raise_for_status()
    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=503,
            detail=f"Cannot connect to Tally at {host}:{port}. Make sure Tally is running and its HTTP server is enabled (F12 → Advanced Config).",
        )
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Tally server timed out. Try a shorter date range.")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Tally connection error: {e}")

    try:
        root = ET.fromstring(resp.text)
    except ET.ParseError as e:
        raise HTTPException(status_code=502, detail=f"Invalid XML from Tally: {e}")

    vouchers = []
    for voucher in root.iter("VOUCHER"):
        guid = _get_text(voucher.find("GUID"))
        txn_date = _get_text(voucher.find("DATE"))
        voucher_type = _get_text(voucher.find("VOUCHERTYPENAME"))
        voucher_number = _get_text(voucher.find("VOUCHERNUMBER"))
        narration = _get_text(voucher.find("NARRATION"))

        # First ledger entry = the main account (vendor/party)
        ledger_entries = voucher.findall(".//ALLLEDGERENTRIES.LIST/ALLLEDGERENTRIES")
        if not ledger_entries:
            ledger_entries = voucher.findall(".//LEDGERENTRIES.LIST/LEDGERENTRIES")

        ledger_name = ""
        amount_str = ""
        for entry in ledger_entries:
            lname = _get_text(entry.find("LEDGERNAME"))
            amt = _get_text(entry.find("AMOUNT"))
            if lname and amt:
                try:
                    amt_f = float(re.sub(r"[^0-9.\-]", "", amt))
                    if amt_f < 0:  # credit side = the vendor/expense
                        ledger_name = lname
                        amount_str = str(abs(amt_f))
                        break
                except ValueError:
                    pass
        if not ledger_name and ledger_entries:
            ledger_name = _get_text(ledger_entries[0].find("LEDGERNAME"))
            amount_str = _get_text(ledger_entries[0].find("AMOUNT"))

        if not guid and not voucher_number:
            continue

        txn_id = guid or f"{voucher_type}-{voucher_number}-{txn_date}"
        vouchers.append(
            {
                "transaction_id": txn_id,
                "ledger_name": ledger_name or voucher_type,
                "vendor_name": ledger_name or None,
                "amount": amount_str,
                "transaction_date": txn_date,
                "voucher_type": voucher_type,
                "description": narration or None,
            }
        )
    return vouchers


@router.post("/audits/{audit_id}/tally-hot-sync")
def tally_hot_sync(
    audit_id: int,
    req: TallySyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Pull the Voucher Register directly from a running Tally instance."""
    audit = db.query(Audit).filter(
        Audit.id == audit_id,
        Audit.workspace_id == current_user.workspace_id,
    ).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    vouchers = _fetch_vouchers(req.host, req.port, req.from_date, req.to_date, req.company)

    created = []
    skipped = 0
    for v in vouchers:
        txn_id = v["transaction_id"]
        if not txn_id:
            skipped += 1
            continue

        existing = (
            db.query(VerificationItem)
            .filter(
                VerificationItem.audit_id == audit_id,
                VerificationItem.transaction_id == txn_id,
            )
            .first()
        )
        if existing:
            skipped += 1
            continue

        parts = [v["ledger_name"]]
        if v.get("voucher_type"):
            parts.append(f"({v['voucher_type']})")
        title = " – ".join(filter(None, parts))[:255]

        item = VerificationItem(
            audit_id=audit_id,
            title=title,
            description=v.get("description"),
            item_type=ItemType.FINANCIAL_RECORD,
            reference_value=v["amount"] or None,
            status=VerificationStatus.PENDING,
            transaction_id=txn_id,
            ledger_name=v["ledger_name"],
            vendor_name=v.get("vendor_name"),
            transaction_date=_tally_date_to_dt(v["transaction_date"]) if v.get("transaction_date") else None,
            is_tally_import=True,
            workspace_id=audit.workspace_id,
        )
        db.add(item)
        created.append(item)

    if created:
        db.flush()
        log_action(
            db,
            action="imported",
            entity_type="audit",
            entity_id=audit_id,
            audit_id=audit_id,
            description=f"Tally hot-sync: {len(created)} vouchers pulled from {req.host}:{req.port} (skipped {skipped} duplicates)",
            user_id=current_user.id,
            user_name=current_user.name,
            workspace_id=audit.workspace_id,
        )

    db.commit()
    for item in created:
        db.refresh(item)

    return {
        "created": len(created),
        "skipped": skipped,
        "items": [
            {
                "id": i.id,
                "title": i.title,
                "transaction_id": i.transaction_id,
                "reference_value": i.reference_value,
            }
            for i in created
        ],
    }
