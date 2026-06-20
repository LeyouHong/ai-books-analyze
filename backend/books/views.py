from django.db.models import Avg, Count, Prefetch
from django.utils import timezone
from django.views import View
from django.http import StreamingHttpResponse, HttpResponse
from datetime import timedelta

from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework import generics, permissions, views, status
from rest_framework.generics import get_object_or_404
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from .models import Book, Tag, Bookshelf, Review, ReadingProgress, TagFollow, Notification, BookAnalysis
from .serializers import BookSerializer, TagSerializer, ReviewSerializer, NotificationSerializer
from .constants import EXTRACT_PROMPT


# ── Redis helpers ──────────────────────────────────────────────────────────────

_redis_pool = None


def _get_redis():
    """Return a sync Redis client backed by a module-level connection pool."""
    global _redis_pool
    import redis as _redis
    from django.conf import settings as _s
    if _redis_pool is None:
        _redis_pool = _redis.ConnectionPool.from_url(
            getattr(_s, 'REDIS_URL', 'redis://localhost:6379/0'),
            max_connections=20,
            decode_responses=False,
        )
    return _redis.Redis(connection_pool=_redis_pool)


def _publish_notification(notif):
    """Publish a Notification instance to its owner's Redis channel."""
    import json as _json
    try:
        data = {
            'id': notif.id,
            'type': notif.type,
            'message': notif.message,
            'book_id': notif.book_id,
            'book_title': notif.book.title if notif.book_id else None,
            'is_read': notif.is_read,
            'created_at': notif.created_at.isoformat(),
        }
        _get_redis().publish(f'notifications:{notif.user_id}', _json.dumps(data))
    except Exception:
        pass  # never let Redis failure break the request


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.created_by == request.user or request.user.is_staff


def _annotated_books(user):
    return Book.objects.annotate(
        avg_rating=Avg('reviews__rating'),
        review_count=Count('reviews', distinct=True),
    ).prefetch_related(
        'tags',
        Prefetch('bookshelf', queryset=Bookshelf.objects.filter(user=user), to_attr='my_shelf'),
        Prefetch('reading_progress', queryset=ReadingProgress.objects.filter(user=user), to_attr='my_progress'),
    )


# ── Books ──────────────────────────────────────────────────────────────────────

class BookListCreateView(generics.ListCreateAPIView):
    serializer_class = BookSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [OrderingFilter, SearchFilter]
    ordering_fields = ['created_at', 'id', 'avg_rating', 'review_count']
    ordering = ['-created_at', '-id']
    search_fields = ['title', 'author', 'description']

    def get_queryset(self):
        qs = _annotated_books(self.request.user)
        tag = self.request.query_params.get('tag')
        if tag:
            qs = qs.filter(tags__name=tag)
        shelf = self.request.query_params.get('shelf')
        if shelf:
            qs = qs.filter(bookshelf__user=self.request.user, bookshelf__status=shelf)
        followed = self.request.query_params.get('followed_tags')
        if followed:
            tag_ids = TagFollow.objects.filter(user=self.request.user).values_list('tag_id', flat=True)
            qs = qs.filter(tags__in=tag_ids).distinct()
        return qs

    @extend_schema(request={'multipart/form-data': BookSerializer})
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)

    def perform_create(self, serializer):
        book = serializer.save(created_by=self.request.user)
        # Notify users who follow any of this book's tags
        if book.tags.exists():
            followers = TagFollow.objects.filter(
                tag__in=book.tags.all()
            ).exclude(user=self.request.user).select_related('user')
            seen = set()
            notifications = []
            for tf in followers:
                if tf.user_id not in seen:
                    seen.add(tf.user_id)
                    notifications.append(Notification(
                        user=tf.user,
                        type=Notification.TYPE_NEW_BOOK,
                        message=f'New book added: "{book.title}" by {book.author}',
                        book=book,
                    ))
            if notifications:
                created = Notification.objects.bulk_create(notifications)
                for notif in created:
                    _publish_notification(notif)


class BookDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BookSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        return _annotated_books(self.request.user)

    @extend_schema(request={'multipart/form-data': BookSerializer})
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @extend_schema(request={'multipart/form-data': BookSerializer})
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


# ── Tags ───────────────────────────────────────────────────────────────────────

class TagListView(generics.ListAPIView):
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Tag.objects.prefetch_related(
            Prefetch('followers', queryset=TagFollow.objects.filter(user=self.request.user), to_attr='my_follows')
        )


class TagFollowView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        tag = get_object_or_404(Tag, pk=pk)
        TagFollow.objects.get_or_create(user=request.user, tag=tag)
        return Response({'followed': True})

    def delete(self, request, pk):
        TagFollow.objects.filter(user=request.user, tag_id=pk).delete()
        return Response({'followed': False})


# ── Bookshelf ──────────────────────────────────────────────────────────────────

class BookshelfView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        book = get_object_or_404(Book, pk=pk)
        status_val = request.data.get('status')
        valid = dict(Bookshelf.STATUS_CHOICES)
        if status_val not in valid:
            return Response({'detail': f'Status must be one of: {", ".join(valid)}'}, status=400)
        entry, _ = Bookshelf.objects.update_or_create(
            user=request.user, book=book, defaults={'status': status_val}
        )
        return Response({'status': entry.status})

    def delete(self, request, pk):
        book = get_object_or_404(Book, pk=pk)
        Bookshelf.objects.filter(user=request.user, book=book).delete()
        return Response(status=204)


# ── Reviews ────────────────────────────────────────────────────────────────────

class ReviewListView(generics.ListAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Review.objects.filter(book_id=self.kwargs['pk']).select_related('user').order_by('-created_at')


class UserReviewView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        review = Review.objects.filter(user=request.user, book_id=pk).first()
        if not review:
            return Response({'rating': None, 'comment': ''})
        return Response(ReviewSerializer(review).data)

    def post(self, request, pk):
        book = get_object_or_404(Book, pk=pk)
        try:
            rating = int(request.data.get('rating', 0))
        except (TypeError, ValueError):
            rating = 0
        if not (1 <= rating <= 5):
            return Response({'detail': 'Rating must be between 1 and 5.'}, status=400)
        comment = request.data.get('comment', '')
        review, created = Review.objects.update_or_create(
            user=request.user, book=book,
            defaults={'rating': rating, 'comment': comment},
        )
        # Notify book owner (not self)
        if created and book.created_by and book.created_by != request.user:
            notif = Notification.objects.create(
                user=book.created_by,
                type=Notification.TYPE_REVIEW,
                message=f'{request.user.username} reviewed your book "{book.title}" ({rating}★)',
                book=book,
            )
            _publish_notification(notif)
        return Response(ReviewSerializer(review).data, status=201 if created else 200)

    def delete(self, request, pk):
        Review.objects.filter(user=request.user, book_id=pk).delete()
        return Response(status=204)


# ── Notifications ──────────────────────────────────────────────────────────────

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).select_related('book')[:30]


class NotificationMarkReadView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ids = request.data.get('ids')
        qs = Notification.objects.filter(user=request.user)
        if ids:
            qs = qs.filter(id__in=ids)
        qs.update(is_read=True)
        return Response({'ok': True})


# ── Reading progress ───────────────────────────────────────────────────────────

class ReadingProgressView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        book = get_object_or_404(Book, pk=pk)
        progress = ReadingProgress.objects.filter(user=request.user, book=book).first()
        return Response({'page': progress.page if progress else 1})

    def put(self, request, pk):
        book = get_object_or_404(Book, pk=pk)
        page = max(1, int(request.data.get('page', 1)))
        defaults = {'page': page}
        raw_total = request.data.get('total_pages')
        if raw_total:
            try:
                defaults['total_pages'] = max(1, int(raw_total))
            except (TypeError, ValueError):
                pass
        progress, _ = ReadingProgress.objects.update_or_create(
            user=request.user, book=book, defaults=defaults,
        )
        return Response({'page': progress.page, 'total_pages': progress.total_pages})


# ── Admin stats ────────────────────────────────────────────────────────────────

class StatsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        today = timezone.now().date()
        days = [today - timedelta(days=i) for i in range(6, -1, -1)]
        books_by_day = {}
        for b in Book.objects.filter(created_at__date__in=days).values_list('created_at__date', flat=True):
            books_by_day[b] = books_by_day.get(b, 0) + 1
        return Response({
            'total_books': Book.objects.count(),
            'total_users': User.objects.count(),
            'active_users': User.objects.filter(is_active=True).count(),
            'upload_trend': [
                {'date': d.strftime('%-m/%-d'), 'books': books_by_day.get(d, 0)}
                for d in days
            ],
        })


class UserStatsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Sum
        from django.db.models.functions import TruncMonth
        user = request.user

        # Shelf counts
        shelf_rows = Bookshelf.objects.filter(user=user).values('status').annotate(n=Count('id'))
        shelf_counts = {r['status']: r['n'] for r in shelf_rows}

        # Monthly books completed (shelf status = 'read'), last 24 months
        monthly_read = list(
            Bookshelf.objects
            .filter(user=user, status='read')
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )

        # Rating distribution
        rating_rows = Review.objects.filter(user=user).values('rating').annotate(count=Count('id')).order_by('rating')
        rating_dist = {r['rating']: r['count'] for r in rating_rows}

        # Total pages across all progress records
        total_pages = ReadingProgress.objects.filter(user=user).aggregate(total=Sum('page'))['total'] or 0

        # Review stats
        review_agg = Review.objects.filter(user=user).aggregate(count=Count('id'), avg=Avg('rating'))

        # Most-used tags on read books
        from .models import Tag
        top_tags = list(
            Tag.objects.filter(books__bookshelf__user=user, books__bookshelf__status='read')
            .annotate(n=Count('books', distinct=True))
            .order_by('-n')[:5]
            .values('name', 'n')
        )

        return Response({
            'shelf_counts': shelf_counts,
            'monthly_read': [
                {'month': r['month'].strftime('%Y-%m'), 'count': r['count']}
                for r in monthly_read
            ],
            'rating_distribution': rating_dist,
            'total_pages_read': total_pages,
            'total_reviews': review_agg['count'] or 0,
            'avg_rating_given': round(float(review_agg['avg']), 2) if review_agg['avg'] else None,
            'top_tags': top_tags,
        })


# ── PDF AI analysis ────────────────────────────────────────────────────────────

class AnalyzePdfView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        import base64
        import json
        import fitz          # PyMuPDF
        import anthropic
        from django.conf import settings as django_settings

        api_key = getattr(django_settings, 'ANTHROPIC_API_KEY', '')
        if not api_key:
            return Response({'detail': 'ANTHROPIC_API_KEY is not configured on the server.'}, status=503)

        pdf_file = request.FILES.get('pdf')
        if not pdf_file:
            return Response({'detail': 'No PDF file provided.'}, status=400)

        # ── File type & size validation ────────────────────────────────────────
        max_size = 50 * 1024 * 1024  # 50 MB
        if pdf_file.size > max_size:
            return Response(
                {'detail': f'PDF must not exceed {max_size // (1024 * 1024)} MB.'},
                status=400,
            )
        content_type = getattr(pdf_file, 'content_type', '')
        if content_type and content_type not in {'application/pdf'}:
            return Response(
                {'detail': f'Only PDF files are accepted (got "{content_type}").'},
                status=400,
            )
        header = pdf_file.read(4)
        pdf_file.seek(0)
        if header != b'%PDF':
            return Response({'detail': 'The uploaded file does not appear to be a valid PDF.'}, status=400)

        try:
            pdf_bytes = pdf_file.read()
            doc = fitz.open(stream=pdf_bytes, filetype='pdf')
        except Exception:
            return Response({'detail': 'Could not open PDF. The file may be corrupted or encrypted.'}, status=400)

        # ── Cover image: render page 1 at 1.5× (≈108 dpi) ─────────────────────
        cover_b64 = None
        try:
            page = doc[0]
            mat  = fitz.Matrix(1.5, 1.5)
            pix  = page.get_pixmap(matrix=mat, alpha=False)
            cover_b64 = 'data:image/png;base64,' + base64.b64encode(pix.tobytes('png')).decode()
        except Exception:
            pass

        # ── Sub-PDF: first 5 pages → base64 for Claude ────────────────────────
        try:
            small = fitz.open()
            for i in range(min(5, len(doc))):
                small.insert_pdf(doc, from_page=i, to_page=i)
            small_bytes = small.tobytes()
            small.close()
            doc.close()
        except Exception as exc:
            doc.close()
            return Response({'detail': f'PDF processing failed: {exc}'}, status=500)

        # ── Claude analysis ────────────────────────────────────────────────────
        try:
            client  = anthropic.Anthropic(api_key=api_key)
            pdf_doc = base64.b64encode(small_bytes).decode()

            message = client.messages.create(
                model='claude-haiku-4-5-20251001',
                max_tokens=1024,
                system=[
                    {
                        'type': 'text',
                        'text': EXTRACT_PROMPT,
                        'cache_control': {'type': 'ephemeral'},
                    }
                ],
                messages=[{
                    'role': 'user',
                    'content': [
                        {
                            'type': 'document',
                            'source': {
                                'type': 'base64',
                                'media_type': 'application/pdf',
                                'data': pdf_doc,
                            },
                            'cache_control': {'type': 'ephemeral'},
                        },
                    ],
                }],
                extra_headers={'anthropic-beta': 'prompt-caching-2024-07-31'},
            )

            raw = message.content[0].text.strip()
            # Strip markdown fences if present
            if raw.startswith('```'):
                raw = raw.split('```')[1]
                if raw.startswith('json'):
                    raw = raw[4:]
            data = json.loads(raw.strip())

        except json.JSONDecodeError:
            data = {'title': '', 'author': '', 'description': '', 'tags': []}
        except anthropic.APIError as exc:
            return Response({'detail': f'AI analysis failed: {exc}'}, status=502)
        except Exception as exc:
            return Response({'detail': f'Unexpected error: {exc}'}, status=500)

        return Response({
            'title':        data.get('title', ''),
            'author':       data.get('author', ''),
            'description':  data.get('description', ''),
            'tags':         data.get('tags', []),
            'cover_image':  cover_b64,
        })


# ── Book AI Analysis ───────────────────────────────────────────────────────────

class BookAnalysisView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        """Return cached analysis if it exists."""
        book = get_object_or_404(Book, pk=pk)
        try:
            a = book.analysis
            return Response({
                'status':     a.status,
                'data':       a.data,
                'error':      a.error,
                'updated_at': a.updated_at,
            })
        except BookAnalysis.DoesNotExist:
            return Response({'status': None, 'data': None})

    def post(self, request, pk):
        """Enqueue AI analysis for a book and return 202 immediately."""
        from django.conf import settings as django_settings
        from .tasks import generate_book_analysis

        if not getattr(django_settings, 'ANTHROPIC_API_KEY', ''):
            return Response({'detail': 'ANTHROPIC_API_KEY is not configured.'}, status=503)

        book = get_object_or_404(Book, pk=pk)

        # Mark as pending (create or reset)
        BookAnalysis.objects.update_or_create(
            book=book,
            defaults={
                'status': BookAnalysis.STATUS_PENDING,
                'data':   None,
                'error':  '',
            },
        )

        generate_book_analysis.delay(book.pk)

        return Response({'status': BookAnalysis.STATUS_PENDING}, status=202)


class NotificationSSEView(View):
    def get(self, request):
        import time
        import json as _json
        import redis as _redis
        from django.conf import settings as _s
        from rest_framework_simplejwt.tokens import AccessToken
        from rest_framework_simplejwt.exceptions import TokenError

        token_str = request.GET.get('token', '')
        try:
            validated = AccessToken(token_str)
            user_id = validated['user_id']
        except (TokenError, Exception):
            return HttpResponse('Unauthorized', status=401, content_type='text/plain')

        redis_url = getattr(_s, 'REDIS_URL', 'redis://localhost:6379/0')

        def stream():
            # ── 1. Send current notification list immediately ──────────────────
            init_list = [
                {
                    'id': n.id,
                    'type': n.type,
                    'message': n.message,
                    'book_id': n.book_id,
                    'book_title': n.book.title if n.book_id else None,
                    'is_read': n.is_read,
                    'created_at': n.created_at.isoformat(),
                }
                for n in (
                    Notification.objects
                    .filter(user_id=user_id)
                    .select_related('book')
                    .order_by('-id')[:30]
                )
            ]
            yield f'event: init\ndata: {_json.dumps(init_list)}\n\n'

            # ── 2. Subscribe to Redis channel, forward messages instantly ──────
            r = _redis.from_url(redis_url, decode_responses=True)
            pubsub = r.pubsub()
            pubsub.subscribe(f'notifications:{user_id}')
            last_heartbeat = time.time()
            try:
                while True:
                    # blocks up to 1 s waiting for a message, then returns None
                    msg = pubsub.get_message(
                        ignore_subscribe_messages=True, timeout=1.0
                    )
                    if msg and msg['type'] == 'message':
                        yield f'event: notification\ndata: {msg["data"]}\n\n'

                    if time.time() - last_heartbeat >= 10:
                        yield ': heartbeat\n\n'
                        last_heartbeat = time.time()
            finally:
                pubsub.unsubscribe(f'notifications:{user_id}')
                r.close()

        response = StreamingHttpResponse(
            streaming_content=stream(),
            content_type='text/event-stream; charset=utf-8',
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response
