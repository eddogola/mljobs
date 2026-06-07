#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ">>> Starting Postgres + Redis..."
docker compose -f "$ROOT/docker-compose.yml" up -d

echo ">>> Waiting for Postgres to be ready..."
until docker exec "$(docker compose -f "$ROOT/docker-compose.yml" ps -q postgres)" pg_isready -U joblens -d joblens -q 2>/dev/null; do
  sleep 1
done

echo ">>> Starting FastAPI backend..."
cd "$ROOT/backend"
.venv/bin/uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

echo ">>> Starting Next.js frontend..."
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "JobLens running:"
echo "  Frontend → http://localhost:3000"
echo "  API      → http://localhost:8000"
echo "  API docs → http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services."

trap "kill $BACKEND_PID $FRONTEND_PID; docker compose -f '$ROOT/docker-compose.yml' stop" INT TERM
wait $BACKEND_PID $FRONTEND_PID
