FROM python:3.11-slim

WORKDIR /app

# Copy dependency files first for caching
COPY ./ml-service/requirements.txt /app/requirements.txt

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
 && rm -rf /var/lib/apt/lists/*

RUN python -m pip install --upgrade pip
RUN if [ -f /app/requirements.txt ]; then pip install -r /app/requirements.txt; fi

# Copy service code
COPY ./ml-service /app

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "$PORT"]
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies needed by LightGBM / scikit-learn
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the full ml-service directory
COPY . .

# Expose port
EXPOSE 8000

# Start the FastAPI app
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
