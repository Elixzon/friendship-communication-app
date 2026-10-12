from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings


BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"


class Settings(BaseSettings):
    MONGO_URI: str = Field(
        default="mongodb://localhost:27017/echodiary",
        validation_alias="MONGO_URI",
    )

    DATABASE_NAME: str = Field(
        default="echodiary",
        validation_alias="DATABASE_NAME",
    )

    HOST: str = Field(
        default="127.0.0.1",
        validation_alias="HOST",
    )

    PORT: int = Field(
        default=8000,
        validation_alias="PORT",
    )

    OPENAI_API_KEY: str = Field(
        default="",
        validation_alias="OPENAI_API_KEY",
    )

    GEMINI_API_KEY: str = Field(
        default="",
        validation_alias="GEMINI_API_KEY",
    )

    ADMIN_ACCESS_TOKEN: str = Field(
        default="",
        validation_alias="ADMIN_ACCESS_TOKEN",
    )

    model_config = {
        "env_file": str(ENV_PATH),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
