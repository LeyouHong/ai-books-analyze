"""
Chat views – AI Chatbot endpoints.

  GET/POST/DELETE  /books/<pk>/chat/    →  BookChatView
  POST             /chat/recommend/     →  RecommendationView
"""

import base64
import json

from django.http import StreamingHttpResponse
from django.conf import settings

from rest_framework import permissions, views, status
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from .models import Book, ChatMessage, Bookshelf, TagFollow, ReadingProgress


# ── helpers ───────────────────────────────────────────────────────────────────

def _sse_response(generator):
    """Wrap a generator in a properly-configured StreamingHttpResponse for SSE."""
    response = StreamingHttpResponse(generator, content_type='text/event-stream; charset=utf-8')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response


def _pdf_first_pages(book, num_pages=5):
    """
    Return a Claude content block (dict) with the first *num_pages* of the
    book's PDF encoded as base64, or None if the book has no PDF / fitz fails.
    The block already contains cache_control so it can be cheaply cached.
    """
    if not book.pdf:
        return None
    try:
        import fitz  # PyMuPDF

        pdf_bytes = book.pdf.read()
        doc = fitz.open(stream=pdf_bytes, filetype='pdf')
        excerpt = fitz.open()
        for i in range(min(num_pages, len(doc))):
            excerpt.insert_pdf(doc, from_page=i, to_page=i)
        excerpt_bytes = excerpt.tobytes()
        excerpt.close()
        doc.close()

        return {
            'type': 'document',
            'source': {
                'type': 'base64',
                'media_type': 'application/pdf',
                'data': base64.b64encode(excerpt_bytes).decode(),
            },
            'cache_control': {'type': 'ephemeral'},
        }
    except Exception:
        return None


def _book_system_prompt(book, user):
    """
    Build the system prompt string for a book chat session.
    Includes book metadata, reading progress, and a short instruction.
    """
    tags = ', '.join(book.tags.values_list('name', flat=True)) or '(none)'

    lines = [
        'You are a knowledgeable reading assistant. '
        'Help the user understand, discuss, and get more out of the book described below.',
        '',
        '## Book Information',
        f'Title:       {book.title}',
        f'Author:      {book.author}',
        f'Tags:        {tags}',
        f'Description: {book.description or "(none provided)"}',
    ]

    # Reading progress
    try:
        progress = ReadingProgress.objects.get(user=user, book=book)
        if progress.total_pages:
            lines += [
                '',
                '## Reading Progress',
                f'The user is on page {progress.page} of {progress.total_pages} '
                f'({int(progress.page / progress.total_pages * 100)}% complete).',
            ]
        else:
            lines += [
                '',
                '## Reading Progress',
                f'The user is on page {progress.page}.',
            ]
    except ReadingProgress.DoesNotExist:
        pass

    lines += [
        '',
        'Answer questions accurately. '
        'If the user asks about specific content, refer to the provided PDF excerpt where possible.',
    ]

    return '\n'.join(lines)


# ── BookChatView ──────────────────────────────────────────────────────────────

class BookChatView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    # ── GET: return chat history ──────────────────────────────────────────────

    def get(self, request, pk):
        book = get_object_or_404(Book, pk=pk)
        messages = ChatMessage.objects.filter(user=request.user, book=book)
        data = [
            {
                'id':         m.id,
                'role':       m.role,
                'content':    m.content,
                'created_at': m.created_at.isoformat(),
            }
            for m in messages
        ]
        return Response(data)

    # ── POST: send a message and stream the reply ─────────────────────────────

    def post(self, request, pk):
        import anthropic

        book = get_object_or_404(Book, pk=pk)
        user_text = (request.data.get('message') or '').strip()
        if not user_text:
            return Response({'detail': 'message is required.'}, status=status.HTTP_400_BAD_REQUEST)

        api_key = getattr(settings, 'ANTHROPIC_API_KEY', '')
        if not api_key:
            return Response({'detail': 'ANTHROPIC_API_KEY is not configured.'}, status=503)

        # Persist the user message now (before streaming starts)
        ChatMessage.objects.create(
            user=request.user,
            book=book,
            role=ChatMessage.ROLE_USER,
            content=user_text,
        )

        # Build conversation history for Claude (all previous turns + this one)
        history = ChatMessage.objects.filter(user=request.user, book=book).order_by('created_at')
        claude_messages = [
            {'role': m.role, 'content': m.content}
            for m in history
        ]

        # System: text block (cached) + optional PDF excerpt in the first user turn
        system_text = _book_system_prompt(book, request.user)
        system = [
            {
                'type': 'text',
                'text': system_text,
                'cache_control': {'type': 'ephemeral'},
            }
        ]

        # If there's a PDF, inject it as a document in the *first* user message
        # by promoting it into the message list (Claude supports document blocks
        # inside user turns).  We only do this when the history has exactly one
        # user turn (the one we just saved) so we don't re-send the PDF every turn.
        user_turns = [m for m in claude_messages if m['role'] == 'user']
        if len(user_turns) == 1:
            pdf_block = _pdf_first_pages(book, num_pages=5)
            if pdf_block:
                # Replace the plain-text first user message with [pdf_block, text_block]
                first_idx = next(
                    i for i, m in enumerate(claude_messages) if m['role'] == 'user'
                )
                claude_messages[first_idx] = {
                    'role': 'user',
                    'content': [
                        pdf_block,
                        {'type': 'text', 'text': claude_messages[first_idx]['content']},
                    ],
                }

        client = anthropic.Anthropic(api_key=api_key)

        def event_stream():
            full_reply = []
            try:
                with client.messages.stream(
                    model='claude-sonnet-4-6',
                    max_tokens=2048,
                    system=system,
                    messages=claude_messages,
                    extra_headers={'anthropic-beta': 'prompt-caching-2024-07-31'},
                ) as stream:
                    for text in stream.text_stream:
                        full_reply.append(text)
                        yield f'data: {json.dumps({"chunk": text})}\n\n'

                # Persist the complete assistant reply
                ChatMessage.objects.create(
                    user=request.user,
                    book=book,
                    role=ChatMessage.ROLE_ASSISTANT,
                    content=''.join(full_reply),
                )
            except Exception as exc:
                yield f'data: {json.dumps({"error": str(exc)})}\n\n'

            yield 'data: [DONE]\n\n'

        return _sse_response(event_stream())

    # ── DELETE: clear chat history ────────────────────────────────────────────

    def delete(self, request, pk):
        book = get_object_or_404(Book, pk=pk)
        deleted_count, _ = ChatMessage.objects.filter(user=request.user, book=book).delete()
        return Response({'deleted': deleted_count}, status=status.HTTP_204_NO_CONTENT)


# ── RecommendationView ────────────────────────────────────────────────────────

class RecommendationView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        import anthropic

        user_message = (request.data.get('message') or 'Recommend books for me').strip()

        api_key = getattr(settings, 'ANTHROPIC_API_KEY', '')
        if not api_key:
            return Response({'detail': 'ANTHROPIC_API_KEY is not configured.'}, status=503)

        user = request.user

        # ── Bookshelf ─────────────────────────────────────────────────────────
        shelf_entries = (
            Bookshelf.objects
            .filter(user=user)
            .select_related('book')
            .prefetch_related('book__tags')
        )
        shelf_book_ids = set()
        shelf_lines = []
        for entry in shelf_entries:
            b = entry.book
            shelf_book_ids.add(b.id)
            tags = ', '.join(b.tags.values_list('name', flat=True)) or '(none)'
            shelf_lines.append(
                f'  - "{b.title}" by {b.author} | tags: {tags} | status: {entry.status}'
            )

        # ── Followed tags ─────────────────────────────────────────────────────
        followed_tags = (
            TagFollow.objects
            .filter(user=user)
            .select_related('tag')
            .values_list('tag__name', flat=True)
        )
        followed_tags_str = ', '.join(followed_tags) or '(none)'

        # ── Other books on the platform (up to 30, excluding shelf) ──────────
        other_books = (
            Book.objects
            .exclude(id__in=shelf_book_ids)
            .prefetch_related('tags')
            [:30]
        )
        other_lines = []
        for b in other_books:
            tags = ', '.join(b.tags.values_list('name', flat=True)) or '(none)'
            other_lines.append(
                f'  - "{b.title}" by {b.author} | tags: {tags}'
            )

        # ── System prompt ─────────────────────────────────────────────────────
        system_parts = [
            'You are a personal book recommendation assistant. '
            'Suggest books from the "Available on platform" list that best match the user\'s '
            'tastes based on their bookshelf and followed tags. '
            'Explain briefly why each recommendation suits them.',
            '',
            '## User\'s Bookshelf',
        ]
        if shelf_lines:
            system_parts += shelf_lines
        else:
            system_parts.append('  (empty – no books on shelf yet)')

        system_parts += [
            '',
            '## Followed Tags',
            f'  {followed_tags_str}',
            '',
            '## Available on Platform',
        ]
        if other_lines:
            system_parts += other_lines
        else:
            system_parts.append('  (no additional books available)')

        system_parts += [
            '',
            'Only recommend books from the "Available on Platform" list. '
            'Do not invent books. Keep your response concise and friendly.',
        ]

        system_prompt = '\n'.join(system_parts)

        client = anthropic.Anthropic(api_key=api_key)

        def event_stream():
            try:
                with client.messages.stream(
                    model='claude-sonnet-4-6',
                    max_tokens=1024,
                    system=system_prompt,
                    messages=[{'role': 'user', 'content': user_message}],
                ) as stream:
                    for text in stream.text_stream:
                        yield f'data: {json.dumps({"chunk": text})}\n\n'
            except Exception as exc:
                yield f'data: {json.dumps({"error": str(exc)})}\n\n'

            yield 'data: [DONE]\n\n'

        return _sse_response(event_stream())
