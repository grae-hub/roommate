from django.db import migrations, models


def name_existing_houses(apps, schema_editor):
    House = apps.get_model('api', 'House')
    for house in House.objects.all():
        house.house_name = f'House {house.pk}'
        house.save(update_fields=['house_name'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_remove_user_first_last'),
    ]

    operations = [
        migrations.RemoveField(model_name='house', name='house_street_address'),
        migrations.RemoveField(model_name='house', name='house_suburb'),
        migrations.RemoveField(model_name='house', name='house_postcode'),
        migrations.RemoveField(model_name='house', name='house_state'),
        migrations.RemoveField(model_name='house', name='house_country'),
        migrations.RenameField(model_name='house', old_name='house_id', new_name='id'),
        migrations.AlterField(
            model_name='house',
            name='id',
            field=models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
        ),
        # existing houses get a placeholder name so the unique constraint can be added
        migrations.AddField(
            model_name='house',
            name='house_name',
            field=models.CharField(max_length=255, null=True),
        ),
        migrations.RunPython(name_existing_houses, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='house',
            name='house_name',
            field=models.CharField(max_length=255, unique=True),
        ),
    ]
