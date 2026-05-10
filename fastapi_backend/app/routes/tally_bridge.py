import csv
import io
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.audit import Audit
from app.models.verification_item import VerificationItem, ItemType, VerificationStatus
from app.services.ai_service import run_risk_sampling

router = APIRouter()

# Expected CSV columns (Tally export format)
REQUIRED_COLS = {"transaction_id", "ledger_name", "amount"}
DATE_FORMATS = ["%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"]


def _parse_date(val: str) -> Optional[datetime]:
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(val.strip(), fmt)
        except ValueError:
            continue
    return None


def _parse_amount(val: str) -> Optional[str]:
    try:
        cleaned = val.replace(",", "").replace("₹", "").strip()
        float(cleaned)
        return cleaned
    except (ValueError, AttributeError):
        return val


@router.post("/audits/{audit_id}/tally-import")
async def tally_import(
    audit_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Import a Tally/Zoho CSV export and auto-create VerificationItems.

    Expected CSV columns: transaction_id, ledger_name, amount
    Optional columns:     vendor_name, transaction_date, description, voucher_type
    """
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")  # handles BOM from Excel/Tally exports
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV file is empty or has no header row")

    headers = {h.strip().lower() for h in reader.fieldnames}
    missing = REQUIRED_COLS - headers
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"CSV is missing required columns: {', '.join(sorted(missing))}",
        )

    created = []
    skipped = 0
    for row in reader:
        # Normalise keys
        row = {k.strip().lower(): (v or "").strip() for k, v in row.items()}
        txn_id = row.get("transaction_id", "")
        ledger = row.get("ledger_name", "")
        amount = _parse_amount(row.get("amount", ""))
        vendor = row.get("vendor_name", "") or None
        txn_date = _parse_date(row.get("transaction_date", "")) if row.get("transaction_date") else None
        description = row.get("description", "") or None
        voucher_type = row.get("voucher_type", "") or None

        if not txn_id or not ledger:
            skipped += 1
            continue

        # Skip if already imported (idempotent)
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

        title_parts = [ledger]
        if vendor:
            title_parts.append(vendor)
        if voucher_type:
            title_parts.append(f"({voucher_type})")
        title = " – ".join(title_parts)

        item = VerificationItem(
            audit_id=audit_id,
            title=title[:255],
            description=description,
            item_type=ItemType.FINANCIAL_RECORD,
            reference_value=amount,
            status=VerificationStatus.PENDING,
            transaction_id=txn_id,
            ledger_name=ledger,
            vendor_name=vendor,
            transaction_date=txn_date,
            is_tally_import=True,
            workspace_id=audit.workspace_id,
        )
        db.add(item)
        created.append(item)

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


class SamplingRequest(BaseModel):
    min_value: float = 50000.0
    sample_size: int = 25


@router.post("/audits/{audit_id}/ai-sample")
async def ai_sample(
    audit_id: int,
    params: SamplingRequest,
    db: Session = Depends(get_db),
):
    """
    Run Gemini risk-sampling on all Tally-imported VerificationItems for an audit.
    Flagged items are marked is_high_risk=True with a risk_reason.
    """
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    tally_items = (
        db.query(VerificationItem)
        .filter(
            VerificationItem.audit_id == audit_id,
            VerificationItem.is_tally_import == True,
        )
        .all()
    )

    if not tally_items:
        raise HTTPException(
            status_code=404,
            detail="No Tally-imported transactions found. Import a CSV first.",
        )

    # Build payload for Gemini
    payload = [
        {
            "id": item.id,
            "transaction_id": item.transaction_id,
            "ledger_name": item.ledger_name,
            "vendor_name": item.vendor_name,
            "amount": item.reference_value,
            "transaction_date": item.transaction_date.isoformat() if item.transaction_date else None,
            "title": item.title,
        }
        for item in tally_items
    ]

    flagged = await run_risk_sampling(
        transactions=payload,
        min_value=params.min_value,
        sample_size=params.sample_size,
    )

    # Map by transaction_id → item
    txn_map = {item.transaction_id: item for item in tally_items if item.transaction_id}
    id_map = {str(item.id): item for item in tally_items}

    updated_count = 0
    for f in flagged:
        tid = str(f.get("transaction_id", ""))
        item = txn_map.get(tid) or id_map.get(tid)
        if not item:
            continue
        item.is_high_risk = True
        item.risk_reason = f.get("risk_reason", "")
        updated_count += 1

    db.commit()

    return {
        "total_transactions": len(tally_items),
        "flagged_count": updated_count,
        "flagged": flagged,
    }
