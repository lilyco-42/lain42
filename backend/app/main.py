import asyncio
import grpc
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import init_db

settings = get_settings()


async def serve_grpc():
    from app.grpc.generated import config_sync_pb2, config_sync_pb2_grpc
    from app.grpc.config_sync import ConfigSyncServicer

    server = grpc.aio.server()
    config_sync_pb2_grpc.add_ConfigSyncServicer_to_server(ConfigSyncServicer(), server)
    server.add_insecure_port("[::]:50051")
    await server.start()
    print("gRPC server started on :50051")
    await server.wait_for_termination()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    grpc_task = asyncio.create_task(serve_grpc())
    yield
    grpc_task.cancel()
    try:
        await grpc_task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="Lain42", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
from app.api.auth import router as auth_router
from app.api.posts import router as posts_router
from app.api.upload import router as upload_router
from app.api.likes import router as likes_router
from app.api.collections import router as collections_router
from app.api.search import router as search_router
from app.api.users import router as users_router

app.include_router(auth_router, prefix="/api")
app.include_router(posts_router, prefix="/api")
app.include_router(upload_router, prefix="/api")
app.include_router(likes_router, prefix="/api")
app.include_router(collections_router, prefix="/api")
app.include_router(search_router, prefix="/api")
app.include_router(users_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
