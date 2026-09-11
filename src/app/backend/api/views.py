import json

from django.db import IntegrityError
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from .models import House, User

USER_REQUIRED_FIELDS = [
    'user_email',
    'user_name',
    'user_first_name',
    'user_last_name'
]
HOUSE_REQUIRED_FIELDS = [
    'house_street_address',
    'house_suburb',
    'house_postcode',
    'house_state',
    'house_country',
    'user_email'
]


def missing_fields(data, required):
    return [field for field in required if not data.get(field)]


def serialize_user(user):
    return {
        'user_email': user.user_email,
        'user_name': user.user_name,
        'user_first_name': user.user_first_name,
        'user_last_name': user.user_last_name,
        'houses': list(user.houses.values_list('house_id', flat=True)),
        'administered_houses': list(user.administered_houses.values_list('house_id', flat=True)),
    }


def serialize_house(house):
    return {
        'house_id': house.house_id,
        'house_street_address': house.house_street_address,
        'house_suburb': house.house_suburb,
        'house_postcode': house.house_postcode,
        'house_state': house.house_state,
        'house_country': house.house_country,
        'house_users': list(house.house_users.values_list('user_email', flat=True)),
        'house_admins': list(house.house_admins.values_list('user_email', flat=True)),
    }
@method_decorator(csrf_exempt, name='dispatch')
class UsersView(View):
    # list every user
    def get(self, request):
        users = User.objects.all()
        return JsonResponse({'users': [serialize_user(user) for user in users]})

    # create a user with no houses
    def post(self, request):
        data = json.loads(request.body)
        missing = missing_fields(data, USER_REQUIRED_FIELDS)
        if missing:
            return JsonResponse({'error': f'missing required fields: {", ".join(missing)}'}, status=400)
        try:
            user = User.objects.create(
                user_email=data['user_email'],
                user_name=data['user_name'],
                user_first_name=data['user_first_name'],
                user_last_name=data['user_last_name'],
            )
        except IntegrityError:
            return JsonResponse({'error': 'a user with that email already exists'}, status=409)
        return JsonResponse(serialize_user(user))
@method_decorator(csrf_exempt, name='dispatch')
class UserView(View):
    # look up a user by email
    def get(self, request, user_email):
        user = get_object_or_404(User, user_email=user_email)
        return JsonResponse(serialize_user(user))

    # delete a user by email
    def delete(self, request, user_email):
        user = get_object_or_404(User, user_email=user_email)
        user.delete()
        return JsonResponse({'deleted': user_email})
@method_decorator(csrf_exempt, name='dispatch')
class UserHousesView(View):
    # list the houses a user is a regular user of
    def get(self, request, user_email):
        user = get_object_or_404(User, user_email=user_email)
        return JsonResponse({'houses': [serialize_house(house) for house in user.houses.all()]})
@method_decorator(csrf_exempt, name='dispatch')
class UserAdministeredHousesView(View):
    # list the houses a user is an admin of
    def get(self, request, user_email):
        user = get_object_or_404(User, user_email=user_email)
        return JsonResponse({'houses': [serialize_house(house) for house in user.administered_houses.all()]})
@method_decorator(csrf_exempt, name='dispatch')
class HousesView(View):
    # list every house
    def get(self, request):
        houses = House.objects.all()
        return JsonResponse({'houses': [serialize_house(house) for house in houses]})

    # create a house, adding the given user as its first user and admin
    def post(self, request):
        data = json.loads(request.body)
        missing = missing_fields(data, HOUSE_REQUIRED_FIELDS)
        if missing:
            return JsonResponse({'error': f'missing required fields: {", ".join(missing)}'}, status=400)
        try:
            user = User.objects.get(user_email=data['user_email'])
        except User.DoesNotExist:
            return JsonResponse({'error': 'no user with that email exists'}, status=400)

        house = House.objects.create(
            house_street_address=data['house_street_address'],
            house_suburb=data['house_suburb'],
            house_postcode=data['house_postcode'],
            house_state=data['house_state'],
            house_country=data['house_country'],
        )
        house.house_users.add(user)
        house.house_admins.add(user)
        return JsonResponse(serialize_house(house))
@method_decorator(csrf_exempt, name='dispatch')
class HouseUsersView(View):
    # list the regular users of a house
    def get(self, request, house_id):
        house = get_object_or_404(House, house_id=house_id)
        return JsonResponse({'users': [serialize_user(user) for user in house.house_users.all()]})

    # add a user to a house
    def post(self, request, house_id):
        house = get_object_or_404(House, house_id=house_id)
        data = json.loads(request.body)
        missing = missing_fields(data, ['user_email'])
        if missing:
            return JsonResponse({'error': f'missing required fields: {", ".join(missing)}'}, status=400)
        try:
            user = User.objects.get(user_email=data['user_email'])
        except User.DoesNotExist:
            return JsonResponse({'error': 'no user with that email exists'}, status=400)
        house.house_users.add(user)
        return JsonResponse(serialize_house(house))
@method_decorator(csrf_exempt, name='dispatch')
class HouseAdminsView(View):
    # list the admins of a house
    def get(self, request, house_id):
        house = get_object_or_404(House, house_id=house_id)
        return JsonResponse({'users': [serialize_user(user) for user in house.house_admins.all()]})

    # add a user to a house as an admin (and as a user, if not one already)
    def post(self, request, house_id):
        house = get_object_or_404(House, house_id=house_id)
        data = json.loads(request.body)
        missing = missing_fields(data, ['user_email'])
        if missing:
            return JsonResponse({'error': f'missing required fields: {", ".join(missing)}'}, status=400)
        try:
            user = User.objects.get(user_email=data['user_email'])
        except User.DoesNotExist:
            return JsonResponse({'error': 'no user with that email exists'}, status=400)
        house.house_users.add(user)
        house.house_admins.add(user)
        return JsonResponse(serialize_house(house))
@method_decorator(csrf_exempt, name='dispatch')
class HouseView(View):
    # look up a house by id
    def get(self, request, house_id):
        house = get_object_or_404(House, house_id=house_id)
        return JsonResponse(serialize_house(house))

    # delete a house by id
    def delete(self, request, house_id):
        house = get_object_or_404(House, house_id=house_id)
        house.delete()
        return JsonResponse({'deleted': house_id})
