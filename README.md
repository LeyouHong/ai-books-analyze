# AI Books Analyze

A full‑stack book‑tracking platform with AI‑powered analysis and chat.

- **Backend:** Django REST Framework, Celery, PostgreSQL, Anthropic Claude
- **Frontend:** React, Vite, React Bootstrap, Recharts
- **Deployment:** Docker, Nginx, GitHub Actions

## Links

- [Author Website](https://leyouhong.xyz/)

## Quick Start

1. Clone the repository:

   ```bash
   git clone https://github.com/LeyouHong/ai-books-analyze.git
   cd ai-books-analyze
   ```

2. Copy the environment file and fill in your secrets:

   ```bash
   cp backend/.env.example backend/.env
   ```

3. Start all services with Docker Compose:

   ```bash
   docker compose up --build
   ```

The app will be available at **http://localhost:80** (frontend) and **http://localhost:8000** (backend API).

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | Django secret key |
| `AWS_ACCESS_KEY_ID` | AWS / S3 access key |
| `AWS_SECRET_ACCESS_KEY` | AWS / S3 secret key |
| `AWS_STORAGE_BUCKET_NAME` | S3 bucket for media files |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key |
| `REDIS_URL` | Redis connection string for Celery |
| `EMAIL_HOST_USER` | SMTP / SES username |
| `EMAIL_HOST_PASSWORD` | SMTP / SES password |

## Features

- 📚 **Book Management** – Add, edit, delete books with cover images and PDF uploads
- 📖 **AI Analysis** – Auto‑generated summaries, themes, and key takeaways via Claude
- 💬 **AI Chat** – Conversational Q&A about each book with context from PDF content
- 🏷️ **Tags & Tag Following** – Categorise books and follow tags for personalised feeds
- 📋 **Bookshelf** – Track reading status (Want to Read / Reading / Read)
- ⭐ **Reviews & Ratings** – Rate and review books with 1–5 stars
- 📈 **Reading Progress** – Track pages read and sync across devices
- 🔔 **Notifications** – Real‑time notifications via Server‑Sent Events
- 📊 **Stats & Analytics** – Personal and admin dashboards with charts
- 👤 **User Management** – Registration, email verification, password reset, profile
- 🛡️ **Admin Panel** – User management, moderation, platform stats
