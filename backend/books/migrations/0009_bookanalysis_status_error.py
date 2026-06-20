from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("books", "0008_bookanalysis"),
    ]

    operations = [
        migrations.AddField(
            model_name="bookanalysis",
            name="status",
            field=models.CharField(default="done", max_length=10),
        ),
        migrations.AddField(
            model_name="bookanalysis",
            name="error",
            field=models.TextField(blank=True, default=""),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name="bookanalysis",
            name="data",
            field=models.JSONField(blank=True, null=True),
        ),
    ]
