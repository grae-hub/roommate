import json

from django.db import IntegrityError
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from .models import User


def serialize_user(user):
    return {
        'user_email': user.user_email,
        'user_name': user.user_name,
        'houses': list(user.houses.values_list('house_id', flat=True)),
    }


@method_decorator(csrf_exempt, name='dispatch')
class UsersView(View):
    def get(self, request):
        users = User.objects.all()
        return JsonResponse({'users': [serialize_user(user) for user in users]})

    def post(self, request):
        data = json.loads(request.body)
        try:
            user = User.objects.create(user_email=data['user_email'], user_name=data['user_name'])
        except IntegrityError:
            return JsonResponse({'error': 'a user with that email already exists'}, status=409)
        return JsonResponse(serialize_user(user))


@method_decorator(csrf_exempt, name='dispatch')
class UserView(View):
    def get(self, request, user_email):
        user = get_object_or_404(User, user_email=user_email)
        return JsonResponse(serialize_user(user))

    def delete(self, request, user_email):
        user = get_object_or_404(User, user_email=user_email)
        user.delete()
        return JsonResponse({'deleted': user_email})
