from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Book(models.Model):
    title       = models.CharField(max_length=200)
    author      = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    image       = models.ImageField(upload_to='books/covers/', blank=True, null=True)
    pdf         = models.FileField(upload_to='books/pdfs/', blank=True, null=True)
    tags        = models.ManyToManyField(Tag, blank=True, related_name='books')
    created_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='books')
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} — {self.author}"


class Bookshelf(models.Model):
    STATUS_CHOICES = [
        ('want', 'Want to Read'),
        ('reading', 'Reading'),
        ('read', 'Read'),
    ]
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookshelf')
    book       = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='bookshelf')
    status     = models.CharField(max_length=10, choices=STATUS_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'book')

    def __str__(self):
        return f"{self.user} — {self.book} — {self.status}"


class Review(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    book       = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='reviews')
    rating     = models.PositiveSmallIntegerField()  # 1–5
    comment    = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'book')

    def __str__(self):
        return f"{self.user} → {self.book} ({self.rating}★)"


class TagFollow(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tag_follows')
    tag        = models.ForeignKey(Tag,  on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'tag')

    def __str__(self):
        return f"{self.user} follows #{self.tag.name}"


class Notification(models.Model):
    TYPE_REVIEW   = 'review'
    TYPE_NEW_BOOK = 'new_book'
    TYPE_CHOICES  = [(TYPE_REVIEW, 'New Review'), (TYPE_NEW_BOOK, 'New Book')]

    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type       = models.CharField(max_length=20, choices=TYPE_CHOICES)
    message    = models.CharField(max_length=255)
    book       = models.ForeignKey(Book, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"→{self.user}: {self.message[:60]}"


class BookAnalysis(models.Model):
    book       = models.OneToOneField(Book, on_delete=models.CASCADE, related_name='analysis')
    data       = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Analysis of {self.book}"


class ReadingProgress(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reading_progress')
    book       = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='reading_progress')
    page        = models.PositiveIntegerField(default=1)
    total_pages = models.PositiveIntegerField(null=True, blank=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'book')

    def __str__(self):
        return f"{self.user} — {self.book} — p.{self.page}"
