from datetime import datetime, timedelta
from typing import Optional
from ..database import get_db
from pymongo.errors import DuplicateKeyError
from bson import ObjectId
from bson.errors import InvalidId
import asyncio
import logging
import random
import string


COL_SESSIONS = 'sessions'
COL_PARTICIPANTS = 'participants'
logger = logging.getLogger('backend.session_service')


def _gen_code() -> str:
    chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    return ''.join(random.choice(chars) for _ in range(6))


async def _unique_code(db) -> str:
    # retry until unique
    for _ in range(10):
        code = _gen_code()
        logger.info('MongoDB find_one collection=%s filter=sessionCode', COL_SESSIONS)
        exists = await db[COL_SESSIONS].find_one({'sessionCode': code})
        if not exists:
            return code
        await asyncio.sleep(0)
    raise RuntimeError('Failed generating unique code')


async def create_session(display_name: str) -> dict:
    db = get_db()
    now = datetime.utcnow()
    expires = now + timedelta(hours=24)
    # The unique index remains the source of truth if two requests generate the
    # same code between the availability check and insert.
    for _ in range(10):
        code = await _unique_code(db)
        session = {
            'sessionCode': code,
            'createdAt': now,
            'expiresAt': expires,
            'status': 'open',
            'ownerId': 'host',
            'reflectionPrompt': None,
        }
        try:
            logger.info('MongoDB insert_one collection=%s', COL_SESSIONS)
            res = await db[COL_SESSIONS].insert_one(session)
            break
        except DuplicateKeyError:
            logger.warning('MongoDB duplicate session code generated; retrying')
    else:
        raise RuntimeError('Failed generating unique code')
    # create host participant
    participant = {
        'sessionId': res.inserted_id,
        'displayName': display_name,
        'joinedAt': now,
        'consent': False,
        'status': 'host',
    }
    logger.info('MongoDB insert_one collection=%s role=host', COL_PARTICIPANTS)
    p_res = await db[COL_PARTICIPANTS].insert_one(participant)
    # return session info
    session['id'] = str(res.inserted_id)
    session['participants'] = [{
        'id': str(p_res.inserted_id),
        'displayName': display_name,
        'joinedAt': now,
        'consent': False
    }]
    return session


async def get_session_by_code(code: str) -> Optional[dict]:
    db = get_db()
    logger.info('MongoDB find_one collection=%s filter=sessionCode', COL_SESSIONS)
    s = await db[COL_SESSIONS].find_one({'sessionCode': code})
    if not s:
        return None
    # check expiration
    if s.get('expiresAt') and s['expiresAt'] < datetime.utcnow():
        logger.info('MongoDB update_one collection=%s field=status', COL_SESSIONS)
        await db[COL_SESSIONS].update_one({'_id': s['_id']}, {'$set': {'status': 'expired'}})
        s['status'] = 'expired'
    # load participants
    parts = []
    logger.info('MongoDB find collection=%s filter=sessionId', COL_PARTICIPANTS)
    async for p in db[COL_PARTICIPANTS].find({'sessionId': s['_id']}):
        parts.append({
            'id': str(p['_id']),
            'displayName': p['displayName'],
            'joinedAt': p['joinedAt'],
            'consent': p.get('consent', False)
        })
    s['participants'] = parts
    s['id'] = str(s['_id'])
    return s


async def join_session(code: str, display_name: str) -> dict:
    db = get_db()
    logger.info('MongoDB find_one collection=%s filter=sessionCode', COL_SESSIONS)
    s = await db[COL_SESSIONS].find_one({'sessionCode': code})
    if not s:
        raise ValueError('Session not found')
    if s.get('expiresAt') and s['expiresAt'] < datetime.utcnow():
        raise ValueError('Session expired')
    # duplicate name check
    logger.info('MongoDB find_one collection=%s filter=sessionId+displayName', COL_PARTICIPANTS)
    existing = await db[COL_PARTICIPANTS].find_one({'sessionId': s['_id'], 'displayName': display_name})
    if existing:
        raise DuplicateKeyError('Duplicate name')
    now = datetime.utcnow()
    participant = {
        'sessionId': s['_id'],
        'displayName': display_name,
        'joinedAt': now,
        'consent': False,
        'status': 'guest',
    }
    logger.info('MongoDB insert_one collection=%s role=guest', COL_PARTICIPANTS)
    p_res = await db[COL_PARTICIPANTS].insert_one(participant)
    return {
        'id': str(p_res.inserted_id),
        'displayName': display_name,
        'joinedAt': now,
        'consent': False,
    }


async def set_consent(code: str, participant_id: str, consent: bool) -> None:
    db = get_db()
    logger.info('MongoDB find_one collection=%s filter=sessionCode', COL_SESSIONS)
    s = await db[COL_SESSIONS].find_one({'sessionCode': code})
    if not s:
        raise ValueError('Session not found')
    try:
        object_id = ObjectId(participant_id)
    except (InvalidId, TypeError) as error:
        raise ValueError('Invalid participant id') from error
    logger.info('MongoDB update_one collection=%s filter=_id+sessionId field=consent', COL_PARTICIPANTS)
    result = await db[COL_PARTICIPANTS].update_one(
        {'_id': object_id, 'sessionId': s['_id']}, {'$set': {'consent': consent}}
    )
    if result.matched_count == 0:
        raise ValueError('Participant not found')


async def list_participants(code: str) -> list:
    db = get_db()
    logger.info('MongoDB find_one collection=%s filter=sessionCode', COL_SESSIONS)
    s = await db[COL_SESSIONS].find_one({'sessionCode': code})
    if not s:
        raise ValueError('Session not found')
    parts = []
    logger.info('MongoDB find collection=%s filter=sessionId', COL_PARTICIPANTS)
    async for p in db[COL_PARTICIPANTS].find({'sessionId': s['_id']}):
        parts.append({
            'id': str(p['_id']),
            'displayName': p['displayName'],
            'joinedAt': p['joinedAt'],
            'consent': p.get('consent', False)
        })
    return parts


async def start_session(code: str) -> None:
    db = get_db()
    logger.info('MongoDB update_one collection=%s filter=sessionCode field=status', COL_SESSIONS)
    res = await db[COL_SESSIONS].update_one({'sessionCode': code}, {'$set': {'status': 'started'}})
    if res.matched_count == 0:
        raise ValueError('Session not found')


async def delete_session(code: str) -> None:
    db = get_db()
    logger.info('MongoDB find_one collection=%s filter=sessionCode', COL_SESSIONS)
    s = await db[COL_SESSIONS].find_one({'sessionCode': code})
    if not s:
        raise ValueError('Session not found')
    logger.info('MongoDB delete_many collection=%s filter=sessionId', COL_PARTICIPANTS)
    await db[COL_PARTICIPANTS].delete_many({'sessionId': s['_id']})
    logger.info('MongoDB delete_one collection=%s filter=_id', COL_SESSIONS)
    await db[COL_SESSIONS].delete_one({'_id': s['_id']})
