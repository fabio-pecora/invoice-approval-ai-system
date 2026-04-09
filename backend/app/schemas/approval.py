from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

ApprovalStatus = Literal[
    "Approved",
    "Partially Approved",
    "Requires Human Review",
    "Not Approved",
]


class ExtractedDocumentData(BaseModel):
    source_name: str
    extraction_method: Literal["text", "ocr", "text+ocr"]
    text_quality_score: float = Field(ge=0, le=1)
    key_fields: dict[str, Any] = Field(default_factory=dict)
    raw_text_preview: str = ""


class StageResult(BaseModel):
    name: Literal[
        "Calculation Check",
        "Ticket Match Check",
        "Pricing Breakdown Check",
    ]
    status: ApprovalStatus
    confidence: float = Field(ge=0, le=1)
    summary: str
    explanation: str
    issues_found: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    extracted_data: dict[str, Any] = Field(default_factory=dict)
    llm_used: bool = True


class ApprovalResponse(BaseModel):
    overall_status: ApprovalStatus
    overall_summary: str
    overall_explanation: str
    invoice_filename: str
    stages: list[StageResult]
    extraction_details: list[ExtractedDocumentData]