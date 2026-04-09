from __future__ import annotations

from app.schemas.approval import ApprovalStatus, StageResult


class ConfidenceService:
    def overall(self, stages: list[StageResult]) -> tuple[ApprovalStatus, str, str]:
        statuses = [stage.status for stage in stages]

        if any(status == "Not Approved" for status in statuses):
            return (
                "Not Approved",
                "At least one approval stage failed deterministically.",
                "The invoice should not be approved because one or more core checks found concrete problems.",
            )

        if all(status == "Approved" for status in statuses):
            return (
                "Approved",
                "All approval stages passed with acceptable confidence.",
                "Calculation, ticket support, and pricing checks all passed without unresolved warnings.",
            )

        if any(status == "Requires Human Review" for status in statuses):
            return (
                "Requires Human Review",
                "The system found uncertainty that needs manual confirmation.",
                "At least one stage could not be safely approved, so a person should review the invoice before any decision is made.",
            )

        return (
            "Partially Approved",
            "Some approval checks passed, but the invoice is not fully clean.",
            "The invoice has meaningful support in some stages, but not enough for a full automatic approval decision.",
        )
