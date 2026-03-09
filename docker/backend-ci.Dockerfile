FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt /tmp/requirements.txt
COPY backend/requirements-dev.txt /tmp/requirements-dev.txt
RUN pip install --no-cache-dir -r /tmp/requirements-dev.txt

COPY backend /app/backend
COPY pyproject.toml /app/pyproject.toml
COPY scripts/checks/backend.sh /app/scripts/checks/backend.sh

RUN chmod +x /app/scripts/checks/backend.sh

CMD ["/app/scripts/checks/backend.sh"]
