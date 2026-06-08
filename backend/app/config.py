from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://joblens:joblens@localhost:5432/joblens"
    anthropic_api_key: str = ""
    personal_token: str = ""  # Set this to protect your saved data

    class Config:
        env_file = ".env"


settings = Settings()
