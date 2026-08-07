from typing import Dict, List
from fastapi import WebSocket
import asyncio
import logging


logger = logging.getLogger('backend.websocket')


class ConnectionManager:
    def __init__(self):
        # mapping sessionCode -> list of websockets
        self.active: Dict[str, List[WebSocket]] = {}
        self.lock = asyncio.Lock()

    async def connect(self, code: str, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            self.active.setdefault(code, []).append(websocket)
            logger.info('WebSocket connected session=%s connections=%s', code, len(self.active[code]))

    async def disconnect(self, code: str, websocket: WebSocket):
        async with self.lock:
            lst = self.active.get(code, [])
            if websocket in lst:
                lst.remove(websocket)
            if not lst:
                self.active.pop(code, None)
            logger.info('WebSocket disconnected session=%s connections=%s', code, len(lst))

    async def broadcast(self, code: str, message: dict):
        # send concurrently
        conns = list(self.active.get(code, []))
        logger.info('WebSocket broadcast session=%s event=%s connections=%s', code, message.get('type'), len(conns))
        for ws in conns:
            try:
                await ws.send_json(message)
            except Exception:
                logger.warning('WebSocket send failed session=%s event=%s', code, message.get('type'), exc_info=True)


manager = ConnectionManager()
