from __future__ import annotations

import shutil
import uuid
from pathlib import Path

from fastapi import UploadFile


ALLOWED_EXTENSIONS = {".pdf"}


async def save_upload(upload: UploadFile, target_dir: Path) -> Path:
    suffix = Path(upload.filename or "upload.pdf").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {suffix}")

    safe_name = f"{uuid.uuid4().hex}_{Path(upload.filename or 'file.pdf').name}"
    destination = target_dir / safe_name
    with destination.open("wb") as buffer:
        shutil.copyfileobj(upload.file, buffer)
    await upload.close()
    return destination
