from django.db import models


class User(models.Model):
    user_email = models.EmailField(unique=True)
    user_name = models.CharField(max_length=255)
    user_first_name = models.CharField(max_length=255)
    user_last_name = models.CharField(max_length=255)

    class Meta:
        db_table = 'users'


class House(models.Model):
    house_id = models.AutoField(primary_key=True)
    house_street_address = models.CharField(max_length=255)
    house_suburb = models.CharField(max_length=255)
    house_postcode = models.CharField(max_length=20)
    house_state = models.CharField(max_length=255)
    house_country = models.CharField(max_length=255)
    house_users = models.ManyToManyField(User, related_name='houses')
    house_admins = models.ManyToManyField(User, related_name='administered_houses')

    class Meta:
        db_table = 'houses'
