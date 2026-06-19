FROM ghcr.io/tectonic-typesetting/tectonic:latest AS tectonic
FROM python:3.11-slim

# Copy tectonic binary
COPY --from=tectonic /usr/local/bin/tectonic /usr/local/bin/tectonic

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
