from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

# Cloud Postgres (Railway, Render, Supabase, Neon) requires SSL.
# Append ?sslmode=require if not already present and not local.
_url = settings.database_url
_connect_args = {}
if "localhost" not in _url and "127.0.0.1" not in _url and "sslmode" not in _url:
    _connect_args = {"sslmode": "require"}

engine = create_engine(
    _url,
    connect_args=_connect_args,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,   # drops stale connections before use
    pool_recycle=300,     # recycle connections every 5 min
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
