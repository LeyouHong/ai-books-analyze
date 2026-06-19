FROM python:3.13-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml .
RUN uv pip install --system --no-cache-dir .

COPY . .

# collectstatic needs dummy env vars at build time
RUN SECRET_KEY=dummy DATABASE_URL=sqlite:////tmp/dummy.db \
    python manage.py collectstatic --noinput

EXPOSE 8000
CMD ["gunicorn", "config.wsgi", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "60", "--log-file", "-"]
