from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from .manager import manager
import logging

router = APIRouter()
logger = logging.getLogger('backend.websocket')


@router.websocket('/ws/session/{code}')
async def session_ws(websocket: WebSocket, code: str):
    # allow optional participantId via query
    participant_id = websocket.query_params.get('participantId')
    logger.info('WebSocket connection requested session=%s participant_id_present=%s', code.upper(), bool(participant_id))
    await manager.connect(code.upper(), websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # echo or ignore - for now we don't process client messages
            logger.info('WebSocket message received session=%s bytes=%s', code.upper(), len(data))
            await websocket.send_text('ok')
    except WebSocketDisconnect:
        logger.info('WebSocket client disconnected session=%s', code.upper())
    finally:
        await manager.disconnect(code.upper(), websocket)
