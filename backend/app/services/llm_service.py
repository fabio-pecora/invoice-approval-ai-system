from __future__ import annotations

import json
import logging
from typing import Any

from openai import OpenAI

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class LLMService:
    def __init__(self) -> None:
        self.enabled = bool(settings.openai_api_key)
        self.client = OpenAI(api_key=settings.openai_api_key) if self.enabled else None

    def explain_ambiguity(self, task: str, context: dict[str, Any]) -> tuple[bool, dict[str, Any] | None]:
        if not self.enabled or self.client is None:
            return False, None

        prompt = {
            "task": task,
            "context": context,
            "rules": [
                "Never override deterministic failures.",
                "Return conservative interpretations only.",
                "If uncertain, say uncertain.",
            ],
            "output_format": {
                "interpretation": "string",
                "uncertain": "boolean",
                "notes": ["string"],
            },
        }

        try:
            response = self.client.responses.create(
                model=settings.openai_model,
                input=[
                    {
                        "role": "system",
                        "content": "You are a cautious AP/AR assistant. Be conservative and concise.",
                    },
                    {"role": "user", "content": json.dumps(prompt)},
                ],
                temperature=0.1,
            )
            text = response.output_text.strip()
            return True, json.loads(text)
        except Exception as exc:
            logger.warning("LLM fallback failed: %s", exc)
            return False, None
