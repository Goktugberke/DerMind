# syntax=docker/dockerfile:1

FROM python:3.11-slim

WORKDIR /app

# system deps (numpy/scipy need them)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ && \
    rm -rf /var/lib/apt/lists/*

# install Python deps first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy source + model artifacts
COPY app.py .
COPY dermind_knn_product_vectors.csv .
COPY models/ models/

EXPOSE 8000

# non-root user for security
RUN useradd -m -u 1000 dermind && chown -R dermind:dermind /app
USER dermind

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
