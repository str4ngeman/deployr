# Deployr

VPS management interface for browsing and editing files under `/opt`.

## Features (Phase 1)

- Dashboard with tool cards (file editor active, more coming in phase 2)
- File explorer rooted at `/opt`
- Syntax-highlighted text editor with save support
- Configurable port (default: **4199**)

## Quick Start (Development)

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173 (Vite dev server proxies API to port 4199).

For local testing without `/opt`, set `FILE_ROOT` in `.env`:

```bash
FILE_ROOT=/home/frank/projects/deployr
PORT=4199
```

## Production

### Local Docker (with your projects + container logs)

```bash
cp .env.example .env
# set FILE_ROOT=/home/frank/projects and DOCKER_ENABLED=true

npm run docker:local
```

This mounts your `FILE_ROOT` and `/var/run/docker.sock` so you can browse files and view container logs at http://localhost:4199.

### GHCR (VPS)

Push to `main`/`master` publishes `ghcr.io/<owner>/deployr:latest` via GitHub Actions.

On your VPS:

```bash
# one-time: copy .deploy/ to your apps folder, e.g. /opt/apps/deployr
cd /opt/apps/deployr
cp .env.example .env   # set DEPLOYR_IMAGE if needed

# if the package is private
echo $GITHUB_TOKEN | docker login ghcr.io -u <github-username> --password-stdin

docker compose pull
docker compose up -d
```

Access at `http://<vps-ip>:4199`.

### Local Docker build

```bash
docker compose up -d --build
```

### Without Docker

```bash
npm run build
PORT=4199 FILE_ROOT=/opt npm start
```

## Environment Variables

| Variable    | Default | Description                    |
|-------------|---------|--------------------------------|
| `PORT`      | `4199`  | HTTP server port               |
| `FILE_ROOT` | `/opt`  | Root directory for file access |

## API

- `GET /api/health` — server status
- `GET /api/files/list?path=` — list directory
- `GET /api/files/read?path=` — read file (max 5MB)
- `PUT /api/files/write` — save file (`{ path, content }`)

## Security Note

This tool provides direct filesystem access. Run it behind a firewall or VPN, and add authentication before exposing it publicly.
