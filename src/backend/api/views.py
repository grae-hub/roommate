from django.shortcuts import render
import redis
from django.http import JsonResponse

# Create your views here.
r = redis.Redis(host='roommate-redis-service', port=6379)

def get_name(request):
    name = r.get('name')
    return JsonResponse({'name': name.decode() if name else None})