# Build SPA so deployed dashboard and API are served on the same origin.
FROM node:22-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ .
RUN npm run build

FROM python:3.12-slim
LABEL org.opencontainers.image.source="https://github.com/A101shah/CI-CD_Pipeline_IMAP" \
      org.opencontainers.image.title="FraudGate 2.0" \
      org.opencontainers.image.description="Educational FinTech fraud risk analytics with Dog API and automated CI/CD"
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /code
RUN useradd --uid 10001 --create-home appuser
COPY requirements.txt .
RUN python -m pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
COPY --from=frontend-builder /frontend/dist/ ./app/static/
USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
