# Docker Deployment Guide

## Quick Start (Server)

1. **Create `.env` file** on your server:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
AI_INTEGRATIONS_OPENAI_API_KEY=your_openai_api_key
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
```

2. **Run with Docker Compose**:

```bash
docker compose up -d
```

3. **Apply database schema** (first time only):

```bash
docker compose run --rm app npx drizzle-kit push
```

Or if using external PostgreSQL, set `DATABASE_URL` in `.env` and run the same command.

---

## Manual Steps You Must Do

### 1. Environment Variables

Create a `.env` file (or set in your deployment platform) with:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string. Example: `postgresql://user:pass@host:5432/dbname` |
| `TELEGRAM_BOT_TOKEN` | **Yes** | Bot token from [@BotFather](https://t.me/BotFather) |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | **Yes** | OpenAI API key for AI diagnostics |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | No | Default: `https://api.openai.com/v1` |
| `PORT` | No | Default: `5000` |

### 2. Database Setup

**Option A – Use docker-compose PostgreSQL** (default):

- No extra setup. `docker-compose.yml` creates a Postgres container.
- Default: `postgresql://postgres:postgres@db:5432/telegram_bot`

**Option B – External PostgreSQL**:

- Create a database.
- Set `DATABASE_URL` in `.env`.
- Run schema push once:
  ```bash
  docker compose run --rm -e DATABASE_URL="your_url" app npx drizzle-kit push
  ```

### 3. GitHub Actions (CI/CD)

- Workflow: `.github/workflows/docker.yml`
- On push to `main`, the image is built and pushed to GitHub Container Registry.
- Image: `ghcr.io/isoqovjorabek2/telegram-helper-bot:latest`

**To pull on your server**:

```bash
# Login (one-time, use a Personal Access Token with read:packages)
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull and run
docker pull ghcr.io/isoqovjorabek2/telegram-helper-bot:latest
```

### 4. Psychologist Images

The bot sends images from `client/public/images/`. Ensure these files exist in the repo:

- `zamira.jpg`, `zilola.jpg`, `sitora.jpg`, `muhayyo.jpg`, `sevara.jpg`, `muxlisa.jpg`, `laylo.jpg`, `fotima.jpg`, `umida.jpg`, `dilraboxon.jpg`, `yoga_instructor.png`

If any are missing, add them to `client/public/images/` and rebuild.
