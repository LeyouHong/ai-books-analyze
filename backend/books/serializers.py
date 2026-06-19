from django.db.models import Avg, Count
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from drf_spectacular.openapi import OpenApiTypes
from users.serializers import UploadImageField

from .models import Book, Tag, Bookshelf, Review, TagFollow, Notification


MAX_PDF_SIZE = 50 * 1024 * 1024   # 50 MB
ALLOWED_PDF_CONTENT_TYPES = {'application/pdf'}


@extend_schema_field(OpenApiTypes.BINARY)
class UploadFileField(serializers.FileField):
    pass


def validate_pdf_file(f):
    """Raise ValidationError if *f* is not a valid PDF under the size limit."""
    if f.size > MAX_PDF_SIZE:
        raise serializers.ValidationError(
            f'PDF file size must not exceed {MAX_PDF_SIZE // (1024 * 1024)} MB '
            f'(uploaded {f.size // (1024 * 1024)} MB).'
        )
    content_type = getattr(f, 'content_type', '')
    if content_type and content_type not in ALLOWED_PDF_CONTENT_TYPES:
        raise serializers.ValidationError(
            f'Only PDF files are accepted (got "{content_type}").'
        )
    # Verify PDF magic bytes regardless of the declared content type
    header = f.read(4)
    f.seek(0)
    if header != b'%PDF':
        raise serializers.ValidationError('The uploaded file does not appear to be a valid PDF.')


class TagSerializer(serializers.ModelSerializer):
    is_followed = serializers.SerializerMethodField()

    class Meta:
        model = Tag
        fields = ['id', 'name', 'is_followed']

    def get_is_followed(self, obj):
        if hasattr(obj, 'my_follows'):
            return bool(obj.my_follows)
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return TagFollow.objects.filter(user=request.user, tag=obj).exists()


class NotificationSerializer(serializers.ModelSerializer):
    book_id    = serializers.IntegerField(source='book.id',    read_only=True, default=None)
    book_title = serializers.CharField(source='book.title', read_only=True, default=None)

    class Meta:
        model = Notification
        fields = ['id', 'type', 'message', 'book_id', 'book_title', 'is_read', 'created_at']


class TagListField(serializers.ListField):
    """Accepts a list of tag name strings; get-or-creates Tag objects."""
    child = serializers.CharField()

    def to_representation(self, data):
        return list(data.values_list('name', flat=True))

    def to_internal_value(self, data):
        names = super().to_internal_value(data)
        tags = []
        for name in names:
            if name.strip():
                tag, _ = Tag.objects.get_or_create(name=name.strip())
                tags.append(tag)
        return tags


class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'username', 'rating', 'comment', 'created_at', 'updated_at']
        read_only_fields = ['id', 'username', 'created_at', 'updated_at']


class BookSerializer(serializers.ModelSerializer):
    created_by     = serializers.StringRelatedField(read_only=True)
    image          = UploadImageField(required=False, allow_null=True)
    pdf            = UploadFileField(required=False, allow_null=True)
    tags           = TagListField(required=False)
    avg_rating       = serializers.SerializerMethodField()
    review_count     = serializers.SerializerMethodField()
    my_shelf_status  = serializers.SerializerMethodField()
    my_progress_page        = serializers.SerializerMethodField()
    my_progress_total_pages = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = [
            'id', 'title', 'author', 'description', 'image', 'pdf',
            'tags', 'avg_rating', 'review_count',
            'my_shelf_status', 'my_progress_page', 'my_progress_total_pages',
            'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_avg_rating(self, obj):
        r = getattr(obj, 'avg_rating', None)
        if r is None:
            r = obj.reviews.aggregate(avg=Avg('rating'))['avg']
        return round(float(r), 1) if r is not None else None

    def get_review_count(self, obj):
        rc = getattr(obj, 'review_count', None)
        if rc is None:
            rc = obj.reviews.count()
        return rc

    def get_my_shelf_status(self, obj):
        if hasattr(obj, 'my_shelf'):
            return obj.my_shelf[0].status if obj.my_shelf else None
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        entry = Bookshelf.objects.filter(user=request.user, book=obj).first()
        return entry.status if entry else None

    def get_my_progress_page(self, obj):
        if hasattr(obj, 'my_progress'):
            return obj.my_progress[0].page if obj.my_progress else None
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        from .models import ReadingProgress
        p = ReadingProgress.objects.filter(user=request.user, book=obj).first()
        return p.page if p else None

    def get_my_progress_total_pages(self, obj):
        if hasattr(obj, 'my_progress'):
            return obj.my_progress[0].total_pages if obj.my_progress else None
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        from .models import ReadingProgress
        p = ReadingProgress.objects.filter(user=request.user, book=obj).first()
        return p.total_pages if p else None

    def validate_pdf(self, value):
        if value:
            validate_pdf_file(value)
        return value

    def create(self, validated_data):
        tags = validated_data.pop('tags', [])
        book = super().create(validated_data)
        book.tags.set(tags)
        return book

    def update(self, instance, validated_data):
        tags = validated_data.pop('tags', None)
        book = super().update(instance, validated_data)
        if tags is not None:
            book.tags.set(tags)
        return book
