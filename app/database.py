import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import PyMongoError
from .config import settings

logger = logging.getLogger('backend.database')
client: Optional[AsyncIOMotorClient] = None
_db_available = False


class DatabaseUnavailableError(RuntimeError):
    pass


def get_client() -> AsyncIOMotorClient:
    global client
    if client is None:
        client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=2000)
    return client


async def test_connection() -> bool:
    global _db_available
    try:
        client = get_client()
        logger.info('MongoDB ping started database=%s', settings.DATABASE_NAME)
        await client.admin.command('ping')
        _db_available = True
        logger.info('MongoDB ping succeeded database=%s', settings.DATABASE_NAME)
    except PyMongoError as error:
        logger.warning('MongoDB unavailable at %s. Database endpoints may return 503. %s', settings.MONGO_URI, error)
        _db_available = False
    return _db_available


async def ensure_indexes() -> None:
    """Create the collections and constraints used by the session flow."""
    db = get_db()
    logger.info('MongoDB ensuring indexes collection=sessions')
    await db['sessions'].create_index('sessionCode', unique=True, name='session_code_unique')
    await db['sessions'].create_index('expiresAt', expireAfterSeconds=0, name='session_expiry_ttl')
    logger.info('MongoDB ensuring indexes collection=participants')
    await db['participants'].create_index('sessionId', name='participant_session_id')
    await db['participants'].create_index(
        [('sessionId', 1), ('displayName', 1)],
        unique=True,
        name='participant_name_per_session_unique',
    )


def get_db():
    if not _db_available:
        raise DatabaseUnavailableError('MongoDB is unavailable')
    return get_client()[settings.DATABASE_NAME]


def is_db_available() -> bool:
    return _db_available
