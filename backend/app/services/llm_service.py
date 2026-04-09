from __future__ import annotations

import json
import logging
from typing import Any

from openai import OpenAI

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

ALLOWED_STATUSES = {
    "Approved",
    "Partially Approved",
    "Requires Human Review",
    "Not Approved",
}


class LLMService:
    def __init__(self) -> None:
        self.enabled = bool(settings.openai_api_key)
        self.client = OpenAI(api_key=settings.openai_api_key) if self.enabled else None

    def review_invoice_documents(
        self,
        *,
        invoice_filename: str,
        invoice_text: str,
        ticket_documents: list[dict[str, Any]],
        pricing_document: dict[str, Any] | None,
        extraction_details: list[dict[str, Any]],
    ) -> dict[str, Any]:
        if not self.enabled or self.client is None:
            raise ValueError(
                "OPENAI_API_KEY is missing. This review flow requires the LLM to evaluate the invoice."
            )

        payload = {
            "invoice_filename": invoice_filename,
            "invoice_text": invoice_text,
            "ticket_documents": ticket_documents,
            "pricing_document": pricing_document,
            "extraction_details": extraction_details,
            "required_stage_names": [
                "Calculation Check",
                "Ticket Match Check",
                "Pricing Breakdown Check",
            ],
            "allowed_statuses": [
                "Approved",
                "Partially Approved",
                "Requires Human Review",
                "Not Approved",
            ],
        }

        system_prompt = """
You are a careful AP/AR invoice review assistant.

You review extracted text from:
1. one invoice
2. zero or more supporting ticket documents
3. zero or one pricing breakdown document

You must evaluate:
- Calculation Check
- Ticket Match Check
- Pricing Breakdown Check

Important rules:
- Be practical, conservative, and useful to a real AP/AR reviewer.
- Work only from the provided extracted text.
- Do not invent missing values or unsupported evidence.
- If supporting documents are missing, do not fail automatically. Evaluate only what can actually be confirmed.
- Minor rounding differences are acceptable. If a line total or grand total differs only because of normal decimal rounding, cents rounding, or very small formatting noise, do NOT treat that as a real issue.
- If the only problem is small decimal rounding and the rest of the invoice is consistent, Calculation Check should still be "Approved".
- Use "Requires Human Review" when text quality is poor, units are unclear, or evidence is too incomplete to be confident.
- Use "Not Approved" only for meaningful problems such as clear math errors, unsupported billed items, obvious price mismatches, or materially inconsistent totals.
- Keep summaries short and explanations readable for business users.
- Return valid JSON only. No markdown. No code fences.

Use this rounding guidance:
- Ignore very small differences that are clearly caused by rounding to cents.
- If the difference is trivial and does not change the practical correctness of the invoice, approve it.
- Do not mention harmless rounding as a blocking issue.
- Only flag rounding if it suggests a real math inconsistency or materially changes the amount.

Return exactly this JSON shape:
{
  "overall_status": "Approved | Partially Approved | Requires Human Review | Not Approved",
  "overall_summary": "short summary",
  "overall_explanation": "clear explanation",
  "stages": [
    {
      "name": "Calculation Check",
      "status": "Approved | Partially Approved | Requires Human Review | Not Approved",
      "confidence": 0.0,
      "summary": "short summary",
      "explanation": "detailed explanation",
      "issues_found": ["..."],
      "warnings": ["..."],
      "extracted_data": {
        "review_basis": ["..."],
        "matched_examples": ["..."],
        "unmatched_examples": ["..."],
        "possible_totals": ["..."],
        "notes": ["..."]
      },
      "llm_used": true
    },
    {
      "name": "Ticket Match Check",
      "status": "Approved | Partially Approved | Requires Human Review | Not Approved",
      "confidence": 0.0,
      "summary": "short summary",
      "explanation": "detailed explanation",
      "issues_found": ["..."],
      "warnings": ["..."],
      "extracted_data": {
        "review_basis": ["..."],
        "matched_examples": ["..."],
        "unmatched_examples": ["..."],
        "possible_totals": ["..."],
        "notes": ["..."]
      },
      "llm_used": true
    },
    {
      "name": "Pricing Breakdown Check",
      "status": "Approved | Partially Approved | Requires Human Review | Not Approved",
      "confidence": 0.0,
      "summary": "short summary",
      "explanation": "detailed explanation",
      "issues_found": ["..."],
      "warnings": ["..."],
      "extracted_data": {
        "review_basis": ["..."],
        "matched_examples": ["..."],
        "unmatched_examples": ["..."],
        "possible_totals": ["..."],
        "notes": ["..."]
      },
      "llm_used": true
    }
  ]
}
""".strip()

        user_prompt = json.dumps(payload, ensure_ascii=False)

        try:
            response = self.client.chat.completions.create(
                model=settings.openai_model,
                temperature=0.1,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )

            content = response.choices[0].message.content or "{}"
            parsed = self._safe_load_json(content)
            return self._normalize_review_response(parsed)
        except Exception as exc:
            logger.exception("LLM invoice review failed: %s", exc)
            raise ValueError(f"LLM invoice review failed: {exc}") from exc

    def _safe_load_json(self, content: str) -> dict[str, Any]:
        text = content.strip()

        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"):
                text = text[4:].strip()

        parsed = json.loads(text)
        if not isinstance(parsed, dict):
            raise ValueError("LLM returned a non-object JSON response.")
        return parsed

    def _normalize_status(self, value: Any) -> str:
        if isinstance(value, str) and value in ALLOWED_STATUSES:
            return value
        return "Requires Human Review"

    def _normalize_confidence(self, value: Any) -> float:
        try:
            confidence = float(value)
        except (TypeError, ValueError):
            return 0.5
        return max(0.0, min(1.0, confidence))

    def _normalize_string_list(self, value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        return [str(item).strip() for item in value if str(item).strip()]

    def _normalize_extracted_data(self, value: Any) -> dict[str, Any]:
        if isinstance(value, dict):
            return value
        return {}

    def _default_stage(self, name: str) -> dict[str, Any]:
        return {
            "name": name,
            "status": "Requires Human Review",
            "confidence": 0.5,
            "summary": f"{name} could not be fully evaluated.",
            "explanation": "The model did not return a complete result for this stage.",
            "issues_found": [],
            "warnings": ["Stage result was auto-filled because the LLM response was incomplete."],
            "extracted_data": {
                "review_basis": [],
                "matched_examples": [],
                "unmatched_examples": [],
                "possible_totals": [],
                "notes": [],
            },
            "llm_used": True,
        }

    def _normalize_review_response(self, data: dict[str, Any]) -> dict[str, Any]:
        required_stage_names = [
            "Calculation Check",
            "Ticket Match Check",
            "Pricing Breakdown Check",
        ]

        stages_by_name: dict[str, dict[str, Any]] = {}
        raw_stages = data.get("stages", [])

        if isinstance(raw_stages, list):
            for raw_stage in raw_stages:
                if not isinstance(raw_stage, dict):
                    continue

                name = str(raw_stage.get("name", "")).strip()
                if name not in required_stage_names:
                    continue

                stages_by_name[name] = {
                    "name": name,
                    "status": self._normalize_status(raw_stage.get("status")),
                    "confidence": self._normalize_confidence(raw_stage.get("confidence")),
                    "summary": str(raw_stage.get("summary", "")).strip() or f"{name} completed.",
                    "explanation": str(raw_stage.get("explanation", "")).strip()
                    or "No detailed explanation was returned.",
                    "issues_found": self._normalize_string_list(raw_stage.get("issues_found")),
                    "warnings": self._normalize_string_list(raw_stage.get("warnings")),
                    "extracted_data": self._normalize_extracted_data(raw_stage.get("extracted_data")),
                    "llm_used": True,
                }

        normalized_stages = [
            stages_by_name.get(stage_name, self._default_stage(stage_name))
            for stage_name in required_stage_names
        ]

        return {
            "overall_status": self._normalize_status(data.get("overall_status")),
            "overall_summary": str(data.get("overall_summary", "")).strip()
            or "Invoice review completed.",
            "overall_explanation": str(data.get("overall_explanation", "")).strip()
            or "The invoice was reviewed from extracted document text.",
            "stages": normalized_stages,
        }