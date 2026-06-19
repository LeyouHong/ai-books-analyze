FROM python:3.13-slim

WORKDIR /app

# Prefer IPv4 over IPv6 (VPS may lack IPv6 connectivity)
RUN echo "precedence ::ffff:0:0/96 100" >> /etc/gai.conf

RUN pip install --no-cache-dir uv

COPY pyproject.toml .
RUN uv pip install --system --no-cache-dir .

COPY . .

# collectstatic needs dummy env vars at build time
RUN SECRET_KEY=dummy DATABASE_URL=sqlite:////tmp/dummy.db \
    python manage.py collectstatic --noinput

EXPOSE 8000
CMD ["gunicorn", "config.wsgi", "--bind", "0.0.0.0:8000", "--worker-class", "gevent", "--workers", "2", "--worker-connections", "100", "--timeout", "3600", "--log-file", "-"]
