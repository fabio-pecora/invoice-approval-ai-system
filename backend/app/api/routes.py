from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.approval import ApprovalResponse
from app.services.approval_service import ApprovalService
from app.utils.file_utils import save_upload
from app.core.config import get_settings

router = APIRouter(prefix="/api")
settings = get_settings()
service = ApprovalService()


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.post("/approve", response_model=ApprovalResponse)
async def approve_invoice(
    invoice: Annotated[UploadFile, File(...)],
    tickets: Annotated[list[UploadFile] | None, File()] = None,
    pricing_breakdown: Annotated[UploadFile | None, File()] = None,
) -> ApprovalResponse:
    try:
        invoice_path = await save_upload(invoice, settings.upload_path)
        ticket_paths = []
        for ticket in tickets or []:
            ticket_paths.append(await save_upload(ticket, settings.upload_path))
        pricing_path = await save_upload(pricing_breakdown, settings.upload_path) if pricing_breakdown else None
        return service.run(invoice_path, ticket_paths, pricing_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Approval process failed: {exc}") from exc
