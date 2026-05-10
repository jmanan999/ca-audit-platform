"""
Dashboard risk aggregation: per-audit and per-client summary of
high-risk flags, rejection rates, and lagging audits.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.audit import Audit
from app.models.client import Client
from app.models.user import User
from app.models.verification_item import VerificationItem, VerificationStatus
from app.routes.auth import get_current_user

router = APIRouter(tags=["risk_summary"])


@router.get("/dashboard/risk-summary")
def get_risk_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Aggregate risk data for the dashboard heatmap.
    Returns per-audit and per-client breakdowns.
    """
    ws = current_user.workspace_id

    # Per-audit counts
    audit_rows = (
        db.query(
            Audit.id,
            Audit.audit_type,
            Audit.status,
            Audit.client_id,
            func.count(VerificationItem.id).label("total"),
            func.sum(
                func.cast(VerificationItem.is_high_risk, db.bind.dialect.name == "postgresql" and "int" or "integer")
                if False else VerificationItem.is_high_risk
            ).label("high_risk"),
        )
        .outerjoin(VerificationItem, VerificationItem.audit_id == Audit.id)
        .filter(Audit.workspace_id == ws)
        .group_by(Audit.id, Audit.audit_type, Audit.status, Audit.client_id)
        .all()
    )

    # Simpler approach: raw counts per audit
    audit_totals = (
        db.query(
            VerificationItem.audit_id,
            func.count(VerificationItem.id).label("total"),
        )
        .filter(VerificationItem.workspace_id == ws)
        .group_by(VerificationItem.audit_id)
        .all()
    )
    audit_high = (
        db.query(
            VerificationItem.audit_id,
            func.count(VerificationItem.id).label("high_risk"),
        )
        .filter(VerificationItem.workspace_id == ws, VerificationItem.is_high_risk == True)
        .group_by(VerificationItem.audit_id)
        .all()
    )
    audit_rejected = (
        db.query(
            VerificationItem.audit_id,
            func.count(VerificationItem.id).label("rejected"),
        )
        .filter(VerificationItem.workspace_id == ws, VerificationItem.status == VerificationStatus.REJECTED)
        .group_by(VerificationItem.audit_id)
        .all()
    )

    totals_map = {r.audit_id: r.total for r in audit_totals}
    high_map = {r.audit_id: r.high_risk for r in audit_high}
    rejected_map = {r.audit_id: r.rejected for r in audit_rejected}

    audits = (
        db.query(Audit)
        .filter(Audit.workspace_id == ws)
        .all()
    )
    clients = {c.id: c.company_name for c in db.query(Client).filter(Client.workspace_id == ws).all()}

    by_audit = [
        {
            "audit_id": a.id,
            "audit_type": a.audit_type,
            "status": a.status,
            "client_name": clients.get(a.client_id, "—"),
            "total": totals_map.get(a.id, 0),
            "high_risk": high_map.get(a.id, 0),
            "rejected": rejected_map.get(a.id, 0),
        }
        for a in audits
        if totals_map.get(a.id, 0) > 0
    ]

    # Per-client rollup
    client_map: dict[int, dict] = {}
    for row in by_audit:
        cid = next((a.client_id for a in audits if a.id == row["audit_id"]), None)
        if cid is None:
            continue
        if cid not in client_map:
            client_map[cid] = {
                "client_name": row["client_name"],
                "total": 0,
                "high_risk": 0,
                "rejected": 0,
                "audit_count": 0,
            }
        client_map[cid]["total"] += row["total"]
        client_map[cid]["high_risk"] += row["high_risk"]
        client_map[cid]["rejected"] += row["rejected"]
        client_map[cid]["audit_count"] += 1

    by_client = sorted(client_map.values(), key=lambda x: x["high_risk"], reverse=True)

    return {"by_audit": by_audit, "by_client": by_client}
