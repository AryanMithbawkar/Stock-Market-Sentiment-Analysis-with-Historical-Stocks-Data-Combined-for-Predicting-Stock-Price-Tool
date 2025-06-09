# Use official Python image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Expose port (Flask default is 5000)
EXPOSE 7860

# Set environment variable for Flask
ENV FLASK_APP=app.py
ENV OMP_NUM_THREADS=1
ENV TF_NUM_INTRAOP_THREADS=1
ENV TF_NUM_INTEROP_THREADS=1
ENV TF_ENABLE_ONEDNN_OPTS=0
ENV GUNICORN_CMD_ARGS="--timeout 6000"
# Run the app with Gunicorn for production
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:7860", "app:app"]