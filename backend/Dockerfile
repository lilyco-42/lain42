FROM python:3.14-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --no-cache-dir fastapi[standard] sqlalchemy[asyncio] asyncpg alembic \
    pydantic pydantic-settings "python-jose[cryptography]" passlib[bcrypt] \
    httpx grpcio grpcio-tools protobuf Pillow python-multipart aiofiles

COPY . .

EXPOSE 8000 50051
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
