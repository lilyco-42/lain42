# Lain42

Configuration sharing platform — like Pinterest for dotfiles, ricing configs, and dev environment setups.

## Tech Stack

- **Backend**: FastAPI + gRPC + PostgreSQL
- **Frontend**: Vite + React + shadcn/ui (Tailwind CSS)
- **Client**: Rust TUI (ratatui + tonic gRPC)
- **Deploy**: Docker Compose (Nginx + FastAPI + PostgreSQL)

## Quick Start

### Development

```bash
# Backend
cd backend && uv sync && uv run fastapi dev app/main.py

# Frontend
cd frontend && npm install && npm run dev

# Rust client
cd client && cargo run
```

### Production

```bash
cp .env.example .env
# Edit .env with your OAuth credentials
docker compose up -d --build
```

## Project Structure

```
lain42/
├── backend/          # FastAPI + gRPC backend
│   └── app/
│       ├── api/      # REST API routes
│       ├── grpc/     # gRPC service
│       ├── models/   # SQLAlchemy models
│       ├── schemas/  # Pydantic schemas
│       └── services/ # Business logic
├── frontend/         # React SPA
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── stores/
│       └── types/
├── client/           # Rust TUI client
│   └── src/
│       ├── grpc.rs
│       ├── state.rs
│       └── ui/
├── proto/            # Shared protobuf definitions
└── docs/             # Design & planning docs
```

## License

MIT
