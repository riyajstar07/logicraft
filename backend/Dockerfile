FROM python:3.11-slim

WORKDIR /srv
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt
COPY backend /srv/backend
COPY frontend/data/seed.json /srv/frontend/data/seed.json
ENV PYTHONPATH=/srv/backend
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
