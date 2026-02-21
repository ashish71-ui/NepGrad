FROM python:3.12-slim

WORKDIR /app

ENV DOCKER_RUNNING=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["gunicorn", "nepgrad.wsgi:application", "--bind", "0.0.0.0:8000"]
