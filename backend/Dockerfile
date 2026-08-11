FROM python:3.11-slim

# Install system dependencies (aria2 for downloads, ffmpeg for video format merging)
RUN apt-get update && apt-get install -y --no-install-recommends \
    aria2 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code and config files
COPY . .

# Expose the API port
EXPOSE 8000

ENV PYTHONUNBUFFERED=1

CMD ["python", "src/api_server.py"]
