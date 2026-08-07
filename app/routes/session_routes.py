import logging

from fastapi import APIRouter, HTTPException, status
from ..schemas.session import CreateSessionReq, JoinSessionReq, ConsentReq
from ..services import session_service
from pymongo.errors import DuplicateKeyError
from ..database import DatabaseUnavailableError
from pymongo.errors import PyMongoError
from ..websocket.manager import manager as ws_manager
from datetime import datetime


def _serialize_session(s: dict) -> dict:
    out = dict(s)
    # Motor documents contain BSON ObjectIds, which FastAPI cannot serialize.
    # The public API exposes the string `id` field instead.
    out.pop('_id', None)
    if isinstance(out.get('createdAt'), datetime):
        out['createdAt'] = out['createdAt'].isoformat()
    if isinstance(out.get('expiresAt'), datetime):
        out['expiresAt'] = out['expiresAt'].isoformat()
    if 'participants' in out:
        pts = []
        for p in out['participants']:
            p2 = dict(p)
            if isinstance(p2.get('joinedAt'), datetime):
                p2['joinedAt'] = p2['joinedAt'].isoformat()
            pts.append(p2)
        out['participants'] = pts
    return out

router = APIRouter(prefix='/api/session')
logger = logging.getLogger('backend.session_routes')


@router.post('/create', status_code=status.HTTP_201_CREATED)
async def create_session(req: CreateSessionReq):
    try:
        session = await session_service.create_session(req.displayName)
    except DatabaseUnavailableError:
        raise
    except PyMongoError:
        raise
    except Exception as e:
        logger.exception('Create session failed')
        raise HTTPException(status_code=500, detail=str(e))
    return _serialize_session(session)


@router.post('/join')
async def join(req: JoinSessionReq):
    try:
        participant = await session_service.join_session(req.code.upper(), req.displayName)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail='Duplicate name')
    except ValueError:
        raise HTTPException(status_code=404, detail='Session not found or expired')
    except Exception:
        logger.exception('Join session failed')
        raise
    # broadcast participant joined (serialize joinedAt)
    p = dict(participant)
    if isinstance(p.get('joinedAt'), datetime):
        p['joinedAt'] = p['joinedAt'].isoformat()
    await ws_manager.broadcast(req.code.upper(), {'type': 'participant.joined', 'participant': p})
    return participant


@router.get('/{code}')
async def get_session(code: str):
    s = await session_service.get_session_by_code(code.upper())
    if not s:
        raise HTTPException(status_code=404, detail='Session not found')
    return _serialize_session(s)


@router.post('/{code}/consent')
async def consent(code: str, body: ConsentReq):
    try:
        await session_service.set_consent(code.upper(), body.participantId, body.consent)
        # broadcast consent update
        await ws_manager.broadcast(code.upper(), {'type': 'consent.updated', 'participantId': body.participantId, 'consent': body.consent})
    except ValueError:
        raise HTTPException(status_code=404, detail='Session not found')
    except Exception:
        logger.exception('Set consent failed')
        raise
    return {'status': 'ok'}


@router.post('/{code}/start')
async def start(code: str):
    try:
        await session_service.start_session(code.upper())
        await ws_manager.broadcast(code.upper(), {'type': 'host.started'})
    except ValueError:
        raise HTTPException(status_code=404, detail='Session not found')
    except Exception:
        logger.exception('Start session failed')
        raise
    return {'status': 'started'}


@router.get('/{code}/participants')
async def participants(code: str):
    try:
        parts = await session_service.list_participants(code.upper())
    except ValueError:
        raise HTTPException(status_code=404, detail='Session not found')
    except Exception:
        logger.exception('List participants failed')
        raise
    return parts


@router.delete('/{code}')
async def delete(code: str):
    try:
        await ws_manager.broadcast(code.upper(), {'type': 'session.closed'})
        await session_service.delete_session(code.upper())
    except ValueError:
        raise HTTPException(status_code=404, detail='Session not found')
    except Exception:
        logger.exception('Delete session failed')
        raise
    return {'status': 'deleted'}
