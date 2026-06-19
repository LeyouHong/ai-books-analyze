from django.db.models.signals import pre_save, post_delete
from django.dispatch import receiver

from .models import User


def _delete_field_file(field):
    if field and field.name:
        field.delete(save=False)


@receiver(pre_save, sender=User)
def user_pre_save(sender, instance, **kwargs):
    """Delete old avatar from S3 when it is replaced."""
    if not instance.pk:
        return
    try:
        old = User.objects.get(pk=instance.pk)
    except User.DoesNotExist:
        return

    old_name = old.avatar.name if old.avatar else None
    new_name = instance.avatar.name if instance.avatar else None
    if old_name and old_name != new_name:
        _delete_field_file(old.avatar)


@receiver(post_delete, sender=User)
def user_post_delete(sender, instance, **kwargs):
    """Delete avatar from S3 when a user is deleted."""
    _delete_field_file(instance.avatar)
