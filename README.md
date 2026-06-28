# 📚 AI Books Analyze

An AI-powered book library and analysis platform. Upload a book PDF and let **Claude** automatically extract its metadata, generate an in-depth literary analysis, and let you **chat with the book** in natural language. Track your reading progress, leave reviews, follow topics you love, and get personalized recommendations.

---

## ✨ Features

- **📤 PDF upload & AI metadata extraction** — Upload a book PDF and Claude automatically extracts the title, author, description, and topic tags.
- **🧠 AI book analysis** — Generate a deep, structured analysis (summary, key themes, target audience, difficulty, key takeaways, writing style, and a notable quote) powered by Anthropic Claude. Analysis runs asynchronously in the background via Celery.
- **💬 Chat with your books** — Ask questions about a book and get streaming AI answers grounded in the book's content (the first pages of the PDF are sent to the model with prompt caching).
- **📖 Reading progress tracking** — Read PDFs in the browser and keep track of the page you're on and overall completion percentage.
- **🏷️ Tags & topic following** — Books are organized by tags; follow tags to get notified about new books.
- **⭐ Reviews & ratings** — Rate books from 1–5 stars and leave comments; see average ratings and review counts.
- **📚 Personal bookshelf** — Mark books as *Want to Read*, *Reading*, or *Read*.
- **🔔 Real-time notifications** — Server-Sent Events (SSE) deliver live notifications for new reviews and new books in followed tags.
- **📊 Stats dashboards** — Personal reading stats plus admin-wide statistics.
- **🔐 Authentication** — JWT-based auth with email verification, password reset, and email-change confirmation.
- **🎯 Recommendations** — AI-assisted book recommendations.

---

## 🧱 Tech Stack

### Backend
- **Python 3.13** / **Django 6** / **Django REST Framework**
- **Celery + Redis** for background tasks (AI analysis, notifications)
- **PostgreSQL** (via `psycopg`) — configurable with `DATABASE_URL`
- **Anthropic Claude** (`anthropic`) for extraction, analysis, and chat
- **PyMuPDF (fitz)** for PDF parsing
- **django-storages + boto3** for S3 file storage
- **drf-spectacular** for OpenAPI schema
- **SimpleJWT** for authentication
- **WhiteNoise / Gunicorn / gevent** for serving in production

### Frontend
- **React 19** + **Vite**
- **React Router** for routing
- **TanStack React Query** for data fetching/caching
- **Axios** for API calls
- **React-Bootstrap / Bootstrap 5** for UI
- **react-pdf** for the in-browser PDF reader
- **Recharts** for stats visualizations

---

## 🗂️ Project Structure

```
ai-books-analyze/
├── backend/                 # Django REST API
│   ├── books/               # Books, analysis, chat, reviews, tags, notifications
│   ├── users/               # Auth, profile, email verification
│   ├── config/              # Django settings, Celery, ASGI/WSGI
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/                # React (Vite) single-page app
│   ├── src/
│   │   ├── api/             # API client modules
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # Auth & Theme contexts
│   │   └── pages/           # Route pages
│   └── package.json
├── docker-compose.yml       # Full local stack (backend, frontend, db, redis)
└── README.md
```

---

## 🏛️ Architecture

```
      ┌─────────────┐        REST / SSE        ┌──────────────────┐
      │   React     │ ───────────────────────▶ │  Django + DRF    │
      │  (Vite SPA) │ ◀─────────────────────── │  (API server)    │
      └─────────────┘                          └────────┬─────────┘
                                                         │
                          ┌──────────────┬───────────────┼───────────────┐
                          ▼              ▼               ▼               ▼
                    ┌──────────┐   ┌──────────┐   ┌────────────┐   ┌──────────┐
                    │ Postgres │   │  Redis   │   │  Celery    │   │   S3     │
                    │  (data)  │   │ (broker) │   │  (worker)  │   │ (files)  │
                    └──────────┘   └──────────┘   └─────┬──────┘   └──────────┘
                                                        │
                                                        ▼
                                                ┌────────────────┐
                                                │ Anthropic API  │
                                                │   (Claude)     │
                                                └────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Python **3.13+**
- Node.js **18+** and npm
- PostgreSQL **14+** (or use the Docker Compose stack)
- Redis **5+**
- An **Anthropic API key** (for AI features)
- (Optional) AWS S3 bucket for media storage

### Option A — Run with Docker Compose (recommended)

This spins up the backend, frontend, PostgreSQL, and Redis together.

```bash
git clone https://github.com/LeyouHong/ai-books-analyze.git
cd ai-books-analyze

# Create the backend env file and fill in your secrets
cp backend/.env.example backend/.env

docker compose up --build
```

- Frontend: http://localhost:5173 (or the port mapped in `docker-compose.yml`)
- Backend API: http://localhost:8000

### Option B — Run locally

#### 1. Backend

The backend uses [`uv`](https://github.com/astral-sh/uv) for dependency management.

```bash
cd backend

# Install dependencies
uv sync

# Configure environment variables
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY, DATABASE_URL, etc.

# Apply database migrations
uv run python manage.py migrate

# Create an admin user
uv run python manage.py createsuperuser

# Run the development server
uv run python manage.py runserver
```

In a separate terminal, start the Celery worker so AI analysis tasks can run:

```bash
cd backend
uv run celery -A config worker -l info
```

The API will be available at http://localhost:8000.
The interactive OpenAPI docs are available via `drf-spectacular` (e.g. `/api/schema/swagger-ui/`).

#### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at http://localhost:5173.

To build for production:

```bash
npm run build
npm run preview
```

---

## 🔧 Environment Variables (backend)

Set these in `backend/.env` (see `backend/.env.example`):

| Variable | Description |
|---|---|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | `True` for development, `False` for production |
| `ALLOWED_HOSTS` | Comma-separated list of allowed hosts |
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgres://user:pass@localhost:5432/db`) |
| `REDIS_URL` | Redis URL used as the Celery broker / cache |
| `ANTHROPIC_API_KEY` | **Required** for AI extraction, analysis, and chat |
| `AWS_ACCESS_KEY_ID` | AWS access key (for S3 media storage) |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_STORAGE_BUCKET_NAME` | S3 bucket name for uploaded covers/PDFs |
| `AWS_S3_REGION_NAME` | S3 region |
| `CORS_ALLOWED_ORIGINS` | Comma-separated front-end origins allowed to call the API |
| `EMAIL_*` / `DEFAULT_FROM_EMAIL` | Email settings for verification & password reset (django-ses) |

> ⚠️ Without a valid `ANTHROPIC_API_KEY`, the AI features (metadata extraction, analysis, chat, recommendations) will not work, but the rest of the app remains functional.

---

## 📖 Usage Guide

Once the app is running, here's a typical workflow:

1. **Register & verify your email**
   - Create an account on the Register page. A verification email is sent; confirm it to unlock all features.

2. **Add a book by uploading a PDF**
   - Use the *Add Book* form and upload a PDF.
   - The backend (`POST /api/books/analyze-pdf/`) sends the PDF to Claude to **auto-extract** the title, author, description, and tags — pre-filling the form so you can review and save.

3. **Generate an AI analysis**
   - Open a book's detail page and request its analysis (`/api/books/<id>/analysis/`).
   - A Celery task runs Claude in the background to produce a structured analysis:
     summary, key themes, target audience, difficulty, key takeaways, writing style, and a notable quote.
   - The page shows a *pending* state and updates to *done* when ready.

4. **Chat with the book**
   - Use the chat panel on the book detail page (`/api/books/<id>/chat/`).
   - Ask questions and receive **streaming** answers grounded in the book's content and your reading progress.

5. **Read & track progress**
   - Open the in-browser PDF reader. Your current page and completion percentage are saved (`/api/books/<id>/progress/`).

6. **Organize & engage**
   - Add books to your shelf (*Want to Read / Reading / Read*).
   - Leave a star rating and review (`/api/books/<id>/reviews/`).
   - Follow tags (`/api/tags/<id>/follow/`) to receive notifications about new books.

7. **Discover more**
   - Get AI recommendations (`POST /api/chat/recommend/`).
   - View your personal reading stats, and (as an admin) site-wide statistics.

---

## 🔌 Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/books/analyze-pdf/` | Upload a PDF and extract metadata with AI |
| `GET` / `POST` | `/books/` | List or create books |
| `GET` / `PUT` / `DELETE` | `/books/<id>/` | Retrieve, update, or delete a book |
| `GET` / `POST` | `/books/<id>/analysis/` | Get or trigger the AI analysis |
| `GET` / `POST` / `DELETE` | `/books/<id>/chat/` | Chat history, send a message, or clear chat |
| `PUT` / `DELETE` | `/books/<id>/shelf/` | Set or remove bookshelf status |
| `GET` / `POST` | `/books/<id>/reviews/` | List or add reviews |
| `GET` / `PUT` / `DELETE` | `/books/<id>/my-review/` | Manage your own review |
| `GET` / `PUT` | `/books/<id>/progress/` | Get or update reading progress |
| `GET` | `/tags/` | List tags |
| `POST` / `DELETE` | `/tags/<id>/follow/` | Follow / unfollow a tag |
| `GET` | `/notifications/` | List notifications |
| `GET` | `/notifications/stream/` | Live notifications via SSE |
| `POST` | `/notifications/mark-read/` | Mark notifications as read |
| `GET` | `/admin/stats/` | Admin-wide statistics |
| `GET` | `/stats/me/` | Your personal reading stats |
| `POST` | `/chat/recommend/` | Get AI book recommendations |

> Authentication endpoints (register, login/JWT, email verification, password reset) live under the `users` app.

---

## 🧪 Running Tests

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

- Continuous deployment is configured via **GitHub Actions** (`.github/workflows/deploy.yml`).
- The backend ships with a `Dockerfile`, `Procfile`, and `runtime.txt` for platform deployments (e.g. Heroku-style or container hosts) using **Gunicorn + gevent** and **WhiteNoise** for static files.
- The frontend includes a `Dockerfile` and `nginx.conf` for serving the production build.

---

## 🤝 Contributing

1. Fork the repository and create a feature branch (`feat/your-feature`).
2. Make your changes with clear commits.
3. Open a pull request describing what changed and how to test it.

---

## 📄 License

This project is provided as-is. Add a license file (e.g. MIT) to clarify usage rights.
