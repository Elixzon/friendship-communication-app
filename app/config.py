from pathlib import Path

from pydantic_settings import BaseSettings
from pydantic import Field


BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"


DEFAULT_ENV = {
    "MONGO_URI": "mongodb://localhost:27017/echodiary",
    "DATABASE_NAME": "echodiary",
    "HOST": "127.0.0.1",
    "PORT": "8000",
}


if not ENV_PATH.exists():
    ENV_PATH.write_text(
        "\n".join(
            f"{key}={value}"
            for key, value in DEFAULT_ENV.items()
        )
        + "\n"
    )


class Settings(BaseSettings):
    MONGO_URI: str = Field(
        "mongodb://localhost:27017/echodiary",
        env="MONGO_URI",
    )

    DATABASE_NAME: str = Field(
        "echodiary",
        env="DATABASE_NAME",
    )

    HOST: str = Field(
        "127.0.0.1",
        env="HOST",
    )

    PORT: int = Field(
        8000,
        env="PORT",
    )

    OPENAI_API_KEY: str = Field(
        "",
        env="OPENAI_API_KEY",
    )

    GEMINI_API_KEY: str = Field(
        "",
        env="GEMINI_API_KEY",
    )

    model_config = {
        "env_file": str(ENV_PATH),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()