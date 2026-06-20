import base64
import json

import anthropic
from celery import shared_task
from django.conf import settings

from .models import Book, BookAnalysis
from .constants import ANALYSIS_PROMPT


@shared_task(bind=True, max_retries=2, default_retry_delay=10)
def generate_book_analysis(self, book_id):
    """Run Claude analysis for a book in the background."""
    api_key = getattr(settings, 'ANTHROPIC_API_KEY', '')

    try:
        book = Book.objects.get(pk=book_id)
    except Book.DoesNotExist:
        return

    try:
        content = []

        # First 10 pages of the PDF if available (with prompt caching)
        if book.pdf:
            try:
                import fitz
                pdf_bytes = book.pdf.read()
                doc = fitz.open(stream=pdf_bytes, filetype='pdf')
                small = fitz.open()
                for i in range(min(10, len(doc))):
                    small.insert_pdf(doc, from_page=i, to_page=i)
                small_bytes = small.tobytes()
                small.close()
                doc.close()
                content.append({
                    'type': 'document',
                    'source': {
                        'type': 'base64',
                        'media_type': 'application/pdf',
                        'data': base64.b64encode(small_bytes).decode(),
                    },
                    'cache_control': {'type': 'ephemeral'},
                })
            except Exception:
                pass  # fall back to text-only

        meta = (
            f'Title: {book.title}\n'
            f'Author: {book.author}\n'
            f'Tags: {", ".join(book.tags.values_list("name", flat=True))}\n'
            f'Description: {book.description or "(none provided)"}'
        )
        content.append({'type': 'text', 'text': meta})

        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model='claude-sonnet-4-6',
            max_tokens=2048,
            system=[{
                'type': 'text',
                'text': ANALYSIS_PROMPT,
                'cache_control': {'type': 'ephemeral'},
            }],
            messages=[{'role': 'user', 'content': content}],
            extra_headers={'anthropic-beta': 'prompt-caching-2024-07-31'},
        )

        raw = message.content[0].text.strip()
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'):
                raw = raw[4:]
        data = json.loads(raw.strip())

        BookAnalysis.objects.update_or_create(
            book=book,
            defaults={
                'status': BookAnalysis.STATUS_DONE,
                'data': data,
                'error': '',
            },
        )

    except Exception as exc:
        BookAnalysis.objects.filter(book_id=book_id).update(
            status=BookAnalysis.STATUS_ERROR,
            error=str(exc),
        )
        raise self.retry(exc=exc)
