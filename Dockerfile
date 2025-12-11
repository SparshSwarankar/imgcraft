# Use Python 3.12 (more stable than 3.13 for rembg)
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies for OpenCV and image processing
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port (Render will use $PORT env variable, typically 10000)
EXPOSE $PORT

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run gunicorn - Optimized for 512MB RAM
# - Only 1 worker to prevent OOM (Free tier has limited RAM)
# - Increased timeout for model loading
# - Preload disabled to prevent startup OOM
CMD gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 2 --timeout 300 --max-requests 100 --max-requests-jitter 10 app:app
