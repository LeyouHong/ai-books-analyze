# 📚 AI Books Analyze

AI Books Analyze is a full-stack web application for managing a personal/shared book
library supercharged with AI. Upload a book's PDF and let **Anthropic Claude**
automatically extract its metadata, generate a deep literary analysis, and power an
interactive chatbot that can answer questions about the book — all while tracking your
reading progress, reviews, bookshelves, and more.

---

## ✨ Features

- **📖 Book library** — Create, browse, search, and filter books by tags.
- **🤖 AI metadata extraction** — Upload a PDF and Claude extracts the title, author,
  description, and suggested tags automatically.
- **🧠 AI book analysis** — Generate an in-depth analysis (summary, key themes, target
  audience, difficulty, key takeaways, writing style, notable quote) asynchronously via
  Celery.
- **💬 AI chatbot** — Chat with an AI reading assistant about any book; responses are
  streamed in real time (Server-Sent Events) and grounded in the book's PDF content and
  your reading progress.
- **🎯 AI recommendations** — Get personalized book recommendations based on your shelves
  and followed tags.
- **⭐ Reviews & ratings** — Rate books (1–5★) and leave comments; see average ratings and
  review counts.
- **🗂️ Bookshelves** — Organize books into *Want to Read*, *Reading*, and *Read* shelves.
- **📊 Reading progress** — Track the page you're on, view percentage complete, and read
  PDFs directly in the browser.
- **🔖 Tag following & notifications** — Follow tags and get notified (including via live
  SSE) about new books and reviews.
- **👤 Authentication** — JWT-based auth with email verification, password reset, and email
  change confirmation.
- **🛠️ Admin dashboard** — User management and platform-wide statistics.

---

## 🧱 Tech Stack

### Backend

| Area | Technology |
| --- | --- |
| Language | Python 3.13 |
| Framework | Django 6 + Django REST Framework |
| Auth | `djangorestframework-simplejwt` (JWT) |
| Async tasks | Celery + Redis |
| Database | PostgreSQL (via `psycopg` / `dj-database-url`) |
| Storage | Amazon S3 (`django-storages` + `boto3`) |
| Email | Amazon SES (`django-ses`) |
| AI | Anthropic Claude (`anthropic`) |
| PDF processing | PyMuPDF (`pymupdf`) |
| API docs | `drf-spectacular` (OpenAPI) |
| Server | Gunicorn + gevent, WhiteNoise for static files |
| Package manager | [`uv`](https://github.com/astral-sh/uv) |

### Frontend

| Area | Technology |
| --- | --- |
| Language | JavaScript (JSX) |
| Framework | React 19 |
| Build tool | Vite |
| UI | React Bootstrap + Bootstrap 5 |
| Data fetching | TanStack React Query + Axios |
| Routing | React Router DOM 7 |
| Charts | Recharts |
| PDF viewing | `react-pdf` |

### Infrastructure

- **Docker** & **Docker Compose** for local orchestration
- **Nginx** as a reverse proxy / static server
- **GitHub Actions** for CI/CD (`.github/workflows/deploy.yml`)

---

## 🏗️ Architecture

```
                         ┌─────────────────────────┐
                         │      React Frontend      │
                         │   (Vite + Bootstrap)     │
                         └────────────┬────────────┘
                                      │ REST / SSE (JSON)
                                      ▼
                         ┌─────────────────────────┐
                         │        Nginx Proxy       │
                         └────────────┬────────────┘
                                      ▼
             ┌──────────────────────────────────────────────┐
             │            Django REST API (Gunicorn)          │
             │   books app  ·  users app  ·  config (DRF)     │
             └───────┬───────────────┬───────────────┬────────┘
                     │               │               │
             ┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼───────┐
             │  PostgreSQL  │ │    Redis    │ │  Amazon S3   │
             │  (data)      │ │ (broker/    │ │ (covers,     │
             │              │ │  cache)     │ │  PDFs)       │
             └──────────────┘ └──────┬──────┘ └──────────────┘
                                     │
                              ┌──────▼───────┐      ┌──────────────────┐
                              │ Celery Worker│─────▶│  Anthropic Claude │
                              │ (analysis)   │      │      (AI API)     │
                              └──────────────┘      └──────────────────┘
```

- The **frontend** talks to the Django API over REST, and subscribes to **Server-Sent
  Events** for real-time chat streaming and notifications.
- Long-running **AI analysis** jobs are dispatched to a **Celery worker** backed by
  **Redis**, keeping the request/response cycle fast.
- Book **covers and PDFs** are stored on **Amazon S3**; transactional email is sent via
  **Amazon SES**.

---

## 📂 Project Structure

```
ai-books-analyze/
├── .github/workflows/deploy.yml   # CI/CD pipeline
├── docker-compose.yml             # Local multi-service orchestration
├── nginx.conf                     # Reverse proxy config
├── backend/                       # Django REST API
│   ├── config/                    # Project settings, URLs, ASGI/WSGI, Celery
│   ├── books/                     # Books, tags, shelves, reviews, AI, chat
│   │   ├── models.py              #   Book, Tag, Bookshelf, Review, ...
│   │   ├── views.py               #   REST endpoints
│   │   ├── chat_views.py          #   AI chatbot & recommendation (SSE)
│   │   ├── tasks.py               #   Celery AI analysis task
│   │   ├── constants.py           #   Claude prompts
│   │   └── migrations/
│   ├── users/                     # Custom user, auth, email verification
│   ├── pyproject.toml             # Python dependencies (uv)
│   └── manage.py
└── frontend/                      # React single-page app
    ├── src/
    │   ├── api/                   # Axios API clients
    │   ├── components/            # Reusable UI components
    │   ├── contexts/              # Auth & theme contexts
    │   ├── pages/                 # Route-level pages
    │   └── main.jsx
    ├── package.json
    └── vite.config.js
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.13+** and [`uv`](https://github.com/astral-sh/uv)
- **Node.js 18+** and npm
- **PostgreSQL** and **Redis** (or use Docker Compose)
- An **Anthropic API key** for AI features
- *(Optional)* AWS credentials for S3 storage and SES email

### 1. Clone the repository

```bash
git clone https://github.com/LeyouHong/ai-books-analyze.git
cd ai-books-analyze
```

### 2. Backend setup

```bash
cd backend

# Copy and fill in environment variables
cp .env.example .env

# Install dependencies with uv
uv sync

# Apply database migrations
uv run python manage.py migrate

# Create an admin user
uv run python manage.py createsuperuser

# Run the development server
uv run python manage.py runserver
```

In a separate terminal, start the Celery worker (required for AI analysis):

```bash
cd backend
uv run celery -A config worker -l info
```

The API will be available at `http://localhost:8000/`.

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173/`.

### 4. Run with Docker Compose (alternative)

The entire stack (backend, frontend, PostgreSQL, Redis, Celery, Nginx) can be brought up
with a single command:

```bash
docker compose up --build
```

---

## 🔐 Environment Variables

Configure these in `backend/.env` (see `backend/.env.example`):

| Variable | Description |
| --- | --- |
| `SECRET_KEY` | Django secret key |
| `DEBUG` | `True` / `False` |
| `ALLOWED_HOSTS` | Comma-separated list of allowed hosts |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string (Celery broker & cache) |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key |
| `AWS_ACCESS_KEY_ID` | AWS access key (S3 / SES) |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_STORAGE_BUCKET_NAME` | S3 bucket for covers and PDFs |
| `AWS_S3_REGION_NAME` | AWS region |
| `DEFAULT_FROM_EMAIL` | Sender address for transactional email |
| `FRONTEND_URL` | Base URL of the frontend (for email links) |
| `CORS_ALLOWED_ORIGINS` | Allowed origins for CORS |

---

## 🔌 API Overview

The REST API is served under the project root. Interactive OpenAPI documentation is
generated by `drf-spectacular`.

### Books & content

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET`/`POST` | `/books/` | List or create books |
| `GET`/`PUT`/`DELETE` | `/books/<id>/` | Retrieve, update, or delete a book |
| `POST` | `/books/analyze-pdf/` | Extract metadata from an uploaded PDF (AI) |
| `GET` | `/books/<id>/analysis/` | Get the AI-generated book analysis |
| `GET`/`POST`/`DELETE` | `/books/<id>/chat/` | AI chatbot for a book (SSE streaming) |
| `POST` | `/chat/recommend/` | Personalized AI recommendations |
| `GET`/`POST`/`DELETE` | `/books/<id>/shelf/` | Manage bookshelf status |
| `GET`/`POST` | `/books/<id>/reviews/` | List or add reviews |
| `GET`/`PUT`/`DELETE` | `/books/<id>/my-review/` | Manage your own review |
| `GET`/`PUT` | `/books/<id>/progress/` | Reading progress |
| `GET` | `/tags/` | List tags |
| `POST`/`DELETE` | `/tags/<id>/follow/` | Follow / unfollow a tag |

### Notifications & stats

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/notifications/` | List notifications |
| `GET` | `/notifications/stream/` | Live notifications (SSE) |
| `POST` | `/notifications/mark-read/` | Mark notifications as read |
| `GET` | `/stats/me/` | Personal reading statistics |
| `GET` | `/admin/stats/` | Platform-wide statistics (admin) |

### Users & auth

The `users` app provides JWT authentication, registration with email verification,
password reset, profile management, and email-change confirmation under the `users/`
namespace.

---

## 🧪 Testing

```bash
cd backend
uv run python manage.py test
```

```bash
cd frontend
npm run lint
```

---

## 🚢 Deployment

Deployment is automated via **GitHub Actions** (`.github/workflows/deploy.yml`). The
backend ships as a Gunicorn (gevent) service with WhiteNoise for static files and a
`Procfile` for process management, while the frontend is built with Vite and served behind
Nginx.

---

## 🤝 Contributing

Contributions are welcome! Please open an issue to discuss significant changes before
submitting a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit your changes
4. Push the branch and open a pull request

---

## 📄 License

This project is provided as-is. Add a license file to clarify usage terms.
