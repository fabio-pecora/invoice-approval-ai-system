from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Invoice Approval System"
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    frontend_url: str = "http://localhost:3000"

    max_upload_mb: int = 25
    upload_dir: str = "app/storage/uploads"
    extracted_dir: str = "app/storage/extracted"
    results_dir: str = "app/storage/results"
    tesseract_cmd: str = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @property
    def upload_path(self) -> Path:
        return Path(self.upload_dir)

    @property
    def extracted_path(self) -> Path:
        return Path(self.extracted_dir)

    @property
    def results_path(self) -> Path:
        return Path(self.results_dir)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    settings.extracted_path.mkdir(parents=True, exist_ok=True)
    settings.results_path.mkdir(parents=True, exist_ok=True)
    return settings
