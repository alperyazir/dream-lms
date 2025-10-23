# Dream LMS Backend Dockerfile
# Multi-stage build for Python FastAPI application

FROM python:3.11 as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY pyproject.toml ./

# Copy application code
COPY . .

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install -e ".[dev]"

# Expose port
EXPOSE 8000

# Run uvicorn server with hot reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
