import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError
from .routes import session_routes
from .websocket import routes as ws_routes
from .database import ensure_indexes, get_client, test_connection, DatabaseUnavailableError
from .config import settings

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s %(message)s')
logger = logging.getLogger('backend.app')

app = FastAPI()


@app.exception_handler(DatabaseUnavailableError)
async def database_unavailable_exception_handler(_, exc: DatabaseUnavailableError):
    return JSONResponse(status_code=503, content={'detail': str(exc)})


@app.exception_handler(PyMongoError)
async def mongo_exception_handler(_, exc: PyMongoError):
    logger.exception('MongoDB operation failed')
    return JSONResponse(status_code=503, content={'detail': 'MongoDB is unavailable'})

# allow CORS for frontend during development; adjust in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://127.0.0.1:3000', 'http://localhost:3000'],
    allow_credentials=False,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.middleware('http')
async def log_requests(request: Request, call_next):
    started = time.perf_counter()
    logger.info('Request received method=%s path=%s', request.method, request.url.path)
    try:
        response = await call_next(request)
    except Exception:
        logger.exception('Request failed method=%s path=%s', request.method, request.url.path)
        raise
    logger.info(
        'Request completed method=%s path=%s status=%s duration_ms=%.1f',
        request.method, request.url.path, response.status_code, (time.perf_counter() - started) * 1000,
    )
    return response

app.include_router(session_routes.router)
app.include_router(ws_routes.router)


@app.on_event('startup')
async def startup_event():
    # initialize DB client and test connection, but keep app running when DB is down
    get_client()
    if await test_connection():
        await ensure_indexes()
        logger.info('MongoDB collections and indexes are ready')


@app.on_event('shutdown')
async def shutdown_event():
    try:
        client = get_client()
        client.close()
    except Exception:
        pass


def create_app():
    return app


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('backend.app.main:app', host=settings.HOST, port=settings.PORT, reload=True)
