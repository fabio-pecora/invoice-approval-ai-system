from __future__ import annotations

from pathlib import Path

from app.schemas.approval import ApprovalResponse, ExtractedDocumentData, StageResult
from app.services.llm_service import LLMService
from app.services.pdf_extraction import PDFExtractionService


class ApprovalService:
    def __init__(self) -> None:
        self.pdf_extractor = PDFExtractionService()
        self.llm_service = LLMService()

    def run(
        self,
        invoice_path: Path,
        ticket_paths: list[Path],
        pricing_path: Path | None,
    ) -> ApprovalResponse:
        extraction_details: list[ExtractedDocumentData] = []

        invoice_text, invoice_details = self.pdf_extractor.extract_document(invoice_path, "Invoice")
        invoice_details.key_fields = {
            "document_type": "invoice",
            "filename": invoice_path.name,
            "character_count": len(invoice_text),
            "has_text": bool(invoice_text.strip()),
        }
        extraction_details.append(invoice_details)

        ticket_documents: list[dict[str, str]] = []
        for ticket_path in ticket_paths:
            ticket_text, ticket_details = self.pdf_extractor.extract_document(ticket_path, ticket_path.name)
            ticket_details.key_fields = {
                "document_type": "ticket",
                "filename": ticket_path.name,
                "character_count": len(ticket_text),
                "has_text": bool(ticket_text.strip()),
            }
            extraction_details.append(ticket_details)
            ticket_documents.append(
                {
                    "filename": ticket_path.name,
                    "text": ticket_text,
                }
            )

        pricing_document: dict[str, str] | None = None
        if pricing_path is not None:
            pricing_text, pricing_details = self.pdf_extractor.extract_document(
                pricing_path,
                pricing_path.name,
            )
            pricing_details.key_fields = {
                "document_type": "pricing_breakdown",
                "filename": pricing_path.name,
                "character_count": len(pricing_text),
                "has_text": bool(pricing_text.strip()),
            }
            extraction_details.append(pricing_details)
            pricing_document = {
                "filename": pricing_path.name,
                "text": pricing_text,
            }

        llm_review = self.llm_service.review_invoice_documents(
            invoice_filename=invoice_path.name,
            invoice_text=invoice_text,
            ticket_documents=ticket_documents,
            pricing_document=pricing_document,
            extraction_details=[detail.model_dump() for detail in extraction_details],
        )

        stages = [StageResult(**stage) for stage in llm_review["stages"]]

        return ApprovalResponse(
            overall_status=llm_review["overall_status"],
            overall_summary=llm_review["overall_summary"],
            overall_explanation=llm_review["overall_explanation"],
            invoice_filename=invoice_path.name,
            stages=stages,
            extraction_details=extraction_details,
        )