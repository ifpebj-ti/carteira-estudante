# ==========================================
# ESTÁGIO 1: Builder
# ==========================================
FROM python:3.11-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

ENV UV_PYTHON_DOWNLOADS=never
ENV UV_LINK_MODE=copy
ENV UV_COMPILE_BYTECODE=1

ENV UV_PROJECT_ENVIRONMENT="/opt/venv"

COPY pyproject.toml uv.lock ./

RUN uv sync --frozen --no-install-project --no-cache

COPY . .

RUN uv sync --frozen --no-cache

# ==========================================
# ESTÁGIO 2: Runtime
# ==========================================
FROM python:3.11-slim

WORKDIR /app

# Permite invalidar apenas a camada de patches do SO em builds com cache (ex.: CI)
ARG CACHE_BUSTER=""

RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf \
       /usr/local/bin/pip* \
       /usr/local/lib/python3.11/ensurepip/_bundled/* \
       /usr/local/lib/python3.11/site-packages/pip* \
       /usr/local/lib/python3.11/site-packages/setuptools* \
       /usr/local/lib/python3.11/site-packages/pkg_resources* \
       /usr/local/lib/python3.11/site-packages/wheel*

COPY --from=builder /opt/venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH"

COPY . .

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
