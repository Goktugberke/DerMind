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
COPY app.py features.py ./
COPY dermind_knn_product_vectors.csv .
COPY models/ models/

# Build-time guard — eksik artefakt durumunda erken patla, sessizce build alma
RUN test -f dermind_knn_product_vectors.csv || (echo "FATAL: dermind_knn_product_vectors.csv missing — run build_dataset_v2.py first" && exit 1) && \
    test -f models/xgboost_scoring_model.json || (echo "FATAL: xgboost_scoring_model.json missing — run train_models_v2.py first" && exit 1) && \
    test -f models/model_config.json || (echo "FATAL: model_config.json missing" && exit 1) && \
    test -f models/knn_recommender_model.pkl || (echo "FATAL: knn_recommender_model.pkl missing" && exit 1) && \
    test -f models/feature_scaler.pkl || (echo "FATAL: feature_scaler.pkl missing" && exit 1) && \
    test -f models/shap_explainer.pkl || (echo "FATAL: shap_explainer.pkl missing" && exit 1)

EXPOSE 8000

# non-root user for security
RUN useradd -m -u 1000 dermind && chown -R dermind:dermind /app
USER dermind

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
