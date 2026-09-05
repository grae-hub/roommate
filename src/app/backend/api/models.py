from django.db import models


class House(models.Model):
    house_id = models.AutoField(primary_key=True)
    address = models.CharField(max_length=255)

    class Meta:
        db_table = 'houses'


class User(models.Model):
    user_email = models.EmailField(unique=True)
    user_name = models.CharField(max_length=255)
    houses = models.ManyToManyField(House, related_name='users')

    class Meta:
        db_table = 'users'
