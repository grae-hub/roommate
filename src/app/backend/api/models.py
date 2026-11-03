from django.db import models


class User(models.Model):
    user_email = models.EmailField(unique=True)
    user_name = models.CharField(max_length=255, unique=True)

    class Meta:
        db_table = 'users'


class House(models.Model):
    house_name = models.CharField(max_length=255, unique=True)
    house_users = models.ManyToManyField(User, related_name='houses')
    house_admins = models.ManyToManyField(User, related_name='administered_houses')

    class Meta:
        db_table = 'houses'
