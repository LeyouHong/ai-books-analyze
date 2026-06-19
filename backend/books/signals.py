from django.db.models.signals import pre_save, post_delete
from django.dispatch import receiver

from .models import Book


def _delete_field_file(field):
    """Delete a FieldFile from storage if it exists."""
    if field and field.name:
        field.delete(save=False)


@receiver(post_delete, sender=Book)
def book_post_delete(sender, instance, **kwargs):
    """Delete cover image and PDF from S3 when a book is deleted."""
    _delete_field_file(instance.image)
    _delete_field_file(instance.pdf)


@receiver(pre_save, sender=Book)
def book_pre_save(sender, instance, **kwargs):
    """Delete old cover image or PDF from S3 when they are replaced."""
    if not instance.pk:
        return  # new book, nothing to clean up
    try:
        old = Book.objects.get(pk=instance.pk)
    except Book.DoesNotExist:
        return

    old_image_name = old.image.name if old.image else None
    new_image_name = instance.image.name if instance.image else None
    if old_image_name and old_image_name != new_image_name:
        _delete_field_file(old.image)

    old_pdf_name = old.pdf.name if old.pdf else None
    new_pdf_name = instance.pdf.name if instance.pdf else None
    if old_pdf_name and old_pdf_name != new_pdf_name:
        _delete_field_file(old.pdf)
