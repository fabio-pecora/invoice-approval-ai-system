from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

import fitz
import pdfplumber
import pytesseract
from PIL import Image
from pypdf import PdfReader

from app.core.config import get_settings
from app.schemas.approval import ExtractedDocumentData
from app.utils.text_utils import normalize_whitespace

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class ExtractedTextResult:
    text: str
    method: str
    quality_score: float
    preview: str


class PDFExtractionService:
    def __init__(self) -> None:
        if settings.tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd

    def extract_document(self, path: Path, source_name: str) -> tuple[str, ExtractedDocumentData]:
        text_result = self._extract_native_text(path)
        ocr_result = None

        if text_result.quality_score < 0.45:
            ocr_result = self._extract_ocr_text(path)

        if ocr_result and len(ocr_result.text) > len(text_result.text):
            combined = self._merge_texts(text_result.text, ocr_result.text)
            method = "text+ocr" if text_result.text else "ocr"
            quality = max(text_result.quality_score, ocr_result.quality_score)
            preview = normalize_whitespace(combined[:700])
            text = combined
        else:
            text = text_result.text
            method = text_result.method
            quality = text_result.quality_score
            preview = text_result.preview

        if not text.strip() and ocr_result:
            text = ocr_result.text
            method = ocr_result.method
            quality = ocr_result.quality_score
            preview = ocr_result.preview

        details = ExtractedDocumentData(
            source_name=source_name,
            extraction_method=method,
            text_quality_score=round(quality, 2),
            raw_text_preview=preview,
            key_fields={},
        )
        return text, details

    def _extract_native_text(self, path: Path) -> ExtractedTextResult:
        chunks: list[str] = []

        try:
            with pdfplumber.open(path) as pdf:
                for page in pdf.pages:
                    chunks.append(page.extract_text() or "")
        except Exception as exc:
            logger.warning("pdfplumber failed for %s: %s", path.name, exc)

        if not " ".join(chunks).strip():
            try:
                reader = PdfReader(str(path))
                chunks = [(page.extract_text() or "") for page in reader.pages]
            except Exception as exc:
                logger.warning("pypdf failed for %s: %s", path.name, exc)

        text = "\n".join(chunks).strip()
        score = self._estimate_quality(text)
        return ExtractedTextResult(
            text=text,
            method="text",
            quality_score=score,
            preview=normalize_whitespace(text[:700]),
        )

    def _extract_ocr_text(self, path: Path) -> ExtractedTextResult:
        chunks: list[str] = []
        try:
            document = fitz.open(str(path))
            for page_number in range(len(document)):
                page = document.load_page(page_number)
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                image_bytes = pix.tobytes("png")
                image = Image.open(__import__("io").BytesIO(image_bytes))
                text = pytesseract.image_to_string(image)
                chunks.append(text)
        except Exception as exc:
            logger.warning("OCR failed for %s: %s", path.name, exc)

        text = "\n".join(chunks).strip()
        score = self._estimate_quality(text) * 0.85 if text else 0.0
        return ExtractedTextResult(
            text=text,
            method="ocr",
            quality_score=score,
            preview=normalize_whitespace(text[:700]),
        )

    def _estimate_quality(self, text: str) -> float:
        if not text:
            return 0.0
        length_score = min(len(text) / 1600, 1.0)
        word_count = len(text.split())
        word_score = min(word_count / 220, 1.0)
        alnum_ratio = sum(char.isalnum() or char.isspace() for char in text) / max(len(text), 1)
        return round((length_score * 0.35) + (word_score * 0.35) + (alnum_ratio * 0.30), 2)

    def _merge_texts(self, first: str, second: str) -> str:
        if not first:
            return second
        if not second:
            return first
        return first + "\n\n---- OCR FALLBACK ----\n\n" + second
