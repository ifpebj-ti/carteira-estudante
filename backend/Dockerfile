FROM python:3.11-slim

# Copy the official uv executable
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy pyproject.toml and uv.lock to install dependencies
COPY pyproject.toml uv.lock ./

# Sincroniza as dependências usando uv (cria o venv automaticamente)
# Utiliza --frozen para garantir que o que está no uv.lock seja estritamente respeitado
RUN uv sync --frozen --no-cache

# Copy the rest of the application
COPY . .

EXPOSE 8000

# Executa o servidor através do uv run (que utiliza o venv criado pelo uv sync)
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]