from django.urls import path

from . import views

urlpatterns = [
    path('users', views.UsersView.as_view(), name='users'),
    path('users/<str:user_email>', views.UserView.as_view(), name='user'),
]
