"""
Workpaper Export: bundle all evidence + verification data into a
downloadable ZIP file or a summary PDF.

ZIP contents:
  audit_summary.csv      – all verification items with status/risk
  audit_trail.csv        – immutable change log
  evidence/<item_id>/    – photos, named by file_name
  README.txt             – cover sheet with audit metadata

PDF:
  Uses reportlab for a formatted workpaper report.
"""
import csv
import io
import json
import logging
import zipfile
from datetime import datetime

import boto3
import requests as http_requests
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.audit import Audit
from app.models.audit_log import AuditLog
from app.models.client import Client
from app.models.document import Document, DocumentCategory
from app.models.user import User
from app.models.verification_item import VerificationItem
from app.routes.auth import get_current_user
from app.utils.audit_log import log_action

logger = logging.getLogger(__name__)
router = APIRouter(tags=["export"])


def _s3_client():
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        return boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
    return None


def _fetch_s3_bytes(s3, key: str) -> bytes:
    """Download an S3 object; return empty bytes on failure."""
    try:
        resp = s3.get_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
        return resp["Body"].read()
    except Exception as e:
        logger.warning("Could not fetch S3 object %s: %s", key, e)
        return b""


def _fetch_url_bytes(url: str) -> bytes:
    """Fetch a presigned URL or any HTTP URL; return empty on failure."""
    try:
        r = http_requests.get(url, timeout=10)
        r.raise_for_status()
        return r.content
    except Exception as e:
        logger.warning("Could not fetch URL %s: %s", url, e)
        return b""


def _build_zip(audit: Audit, client: Client, items: list, docs: list, trail: list) -> io.BytesIO:
    buf = io.BytesIO()
    s3 = _s3_client()

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # ── README ────────────────────────────────────────────────
        readme = (
            f"CA Audit Workpaper Package\n"
            f"{'=' * 40}\n"
            f"Client      : {client.company_name if client else 'Unknown'}\n"
            f"GSTIN       : {(client.gst_number if client else '') or '—'}\n"
            f"Audit Type  : {audit.audit_type}\n"
            f"Status      : {audit.status}\n"
            f"Deadline    : {audit.deadline.strftime('%d %b %Y') if audit.deadline else '—'}\n"
            f"Generated   : {datetime.utcnow().strftime('%d %b %Y %H:%M UTC')}\n\n"
            f"Contents\n"
            f"--------\n"
            f"  audit_summary.csv  – all {len(items)} verification items\n"
            f"  audit_trail.csv    – change log ({len(trail)} entries)\n"
            f"  evidence/          – {len(docs)} evidence files organised by item ID\n"
        )
        zf.writestr("README.txt", readme)

        # ── Verification Items CSV ────────────────────────────────
        csv_buf = io.StringIO()
        writer = csv.writer(csv_buf)
        writer.writerow([
            "ID", "Title", "Type", "Reference Value", "Status",
            "CA Notes", "Is High Risk", "Risk Reason", "Rejection Reason",
            "Is Tally Import", "Transaction ID", "Ledger Name", "Vendor Name",
            "Created At", "Updated At",
        ])
        for i in items:
            writer.writerow([
                i.id, i.title, i.item_type, i.reference_value or "", i.status,
                i.ca_notes or "", "Yes" if i.is_high_risk else "No", i.risk_reason or "",
                i.rejection_reason or "", "Yes" if i.is_tally_import else "No",
                i.transaction_id or "", i.ledger_name or "", i.vendor_name or "",
                i.created_at.strftime("%d %b %Y %H:%M") if i.created_at else "",
                i.updated_at.strftime("%d %b %Y %H:%M") if i.updated_at else "",
            ])
        zf.writestr("audit_summary.csv", csv_buf.getvalue())

        # ── Audit Trail CSV ────────────────────────────────────────
        trail_buf = io.StringIO()
        tw = csv.writer(trail_buf)
        tw.writerow(["Timestamp", "User", "Action", "Entity", "Description"])
        for log in trail:
            tw.writerow([
                log.timestamp.strftime("%d %b %Y %H:%M:%S") if log.timestamp else "",
                log.user_name or "System",
                log.action,
                f"{log.entity_type} #{log.entity_id}" if log.entity_id else log.entity_type,
                log.description or "",
            ])
        zf.writestr("audit_trail.csv", trail_buf.getvalue())

        # ── Evidence Photos ────────────────────────────────────────
        for doc in docs:
            folder = f"evidence/item_{doc.verification_item_id or 'misc'}"
            safe_name = doc.file_name.replace("/", "_").replace("\\", "_")
            dest = f"{folder}/{safe_name}"

            if s3 and doc.file_path and not doc.file_path.startswith("http"):
                data = _fetch_s3_bytes(s3, doc.file_path)
            elif doc.file_path and doc.file_path.startswith("http"):
                data = _fetch_url_bytes(doc.file_path)
            else:
                data = b""

            if data:
                zf.writestr(dest, data)
            else:
                zf.writestr(f"{folder}/{safe_name}.missing.txt",
                            f"Could not retrieve: {doc.file_path}")

            # Metadata sidecar
            meta = {
                "file_name": doc.file_name,
                "uploaded_at": doc.created_at.isoformat() if doc.created_at else None,
                "latitude": doc.latitude,
                "longitude": doc.longitude,
                "device_timestamp": doc.device_timestamp.isoformat() if doc.device_timestamp else None,
                "executive_notes": doc.executive_notes,
                "verification_status": doc.verification_status,
            }
            zf.writestr(f"{folder}/{safe_name}.meta.json", json.dumps(meta, indent=2))

    buf.seek(0)
    return buf


def _build_pdf(audit: Audit, client: Client, items: list, docs: list) -> io.BytesIO:
    """Generate a formatted PDF workpaper using reportlab."""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
        )
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="PDF export requires reportlab. Install it with: pip install reportlab",
        )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    story = []

    h1 = styles["Heading1"]
    h2 = styles["Heading2"]
    normal = styles["Normal"]
    small = ParagraphStyle("small", parent=normal, fontSize=8)

    # Cover
    story.append(Paragraph("CA Audit Workpaper", h1))
    story.append(Spacer(1, 0.4*cm))
    meta_data = [
        ["Client", client.company_name if client else "—"],
        ["GSTIN", (client.gst_number if client else "") or "—"],
        ["Audit Type", audit.audit_type],
        ["Status", audit.status],
        ["Deadline", audit.deadline.strftime("%d %b %Y") if audit.deadline else "—"],
        ["Generated", datetime.utcnow().strftime("%d %b %Y %H:%M UTC")],
    ]
    meta_table = Table(meta_data, colWidths=[4*cm, 12*cm])
    meta_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#F3F4F6")]),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E7EB")),
        ("PADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 0.8*cm))

    # Verification Items
    story.append(Paragraph("Verification Checklist", h2))
    story.append(Spacer(1, 0.3*cm))

    headers = ["#", "Title", "Type", "Ref. Value", "Status", "High Risk"]
    rows = [headers]
    for idx, i in enumerate(items, 1):
        rows.append([
            str(idx),
            Paragraph(i.title[:80], small),
            (i.item_type or "").replace("_", " "),
            i.reference_value or "—",
            (i.status or "").replace("_", " "),
            "YES" if i.is_high_risk else "no",
        ])

    col_widths = [1*cm, 7*cm, 3*cm, 2.5*cm, 2.5*cm, 1.5*cm]
    tbl = Table(rows, colWidths=col_widths, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1D4ED8")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
        ("TEXTCOLOR", (5, 1), (5, -1), colors.HexColor("#DC2626")),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E7EB")),
        ("PADDING", (0, 0), (-1, -1), 3),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(
        f"Total items: {len(items)} | "
        f"Verified: {sum(1 for i in items if i.status == 'verified')} | "
        f"Rejected: {sum(1 for i in items if i.status == 'rejected')} | "
        f"High Risk: {sum(1 for i in items if i.is_high_risk)}",
        small,
    ))
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph(
        f"Evidence files: {len(docs)} photos uploaded by field executives.",
        small,
    ))

    doc.build(story)
    buf.seek(0)
    return buf


@router.get("/audits/{audit_id}/export")
def export_workpaper(
    audit_id: int,
    format: str = Query("zip", regex="^(zip|pdf)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Download all workpapers for an audit as a ZIP archive or summary PDF.

    ?format=zip  (default) – full package with photos + CSVs
    ?format=pdf             – summary PDF workpaper (requires reportlab)
    """
    audit = db.query(Audit).filter(
        Audit.id == audit_id,
        Audit.workspace_id == current_user.workspace_id,
    ).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    client = db.query(Client).filter(Client.id == audit.client_id).first()
    items = db.query(VerificationItem).filter(VerificationItem.audit_id == audit_id).all()
    docs = (
        db.query(Document)
        .filter(
            Document.audit_id == audit_id,
            Document.document_category == DocumentCategory.EVIDENCE,
        )
        .all()
    )
    trail = (
        db.query(AuditLog)
        .filter(AuditLog.audit_id == audit_id)
        .order_by(AuditLog.timestamp.asc())
        .all()
    )

    safe_type = audit.audit_type.replace(" ", "_").replace("/", "-")[:30]
    timestamp = datetime.utcnow().strftime("%Y%m%d")

    log_action(
        db,
        action="exported",
        entity_type="audit",
        entity_id=audit_id,
        audit_id=audit_id,
        description=f"Workpaper exported as {format.upper()} by {current_user.name}",
        user_id=current_user.id,
        user_name=current_user.name,
        workspace_id=audit.workspace_id,
    )
    db.commit()

    if format == "pdf":
        buf = _build_pdf(audit, client, items, docs)
        filename = f"workpaper_{safe_type}_{timestamp}.pdf"
        return StreamingResponse(
            buf,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    buf = _build_zip(audit, client, items, docs, trail)
    filename = f"workpaper_{safe_type}_{timestamp}.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
