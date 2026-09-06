from django.urls import path

from . import views

urlpatterns = [
    path('users', views.UsersView.as_view(), name='users'),
    path('users/<str:user_email>', views.UserView.as_view(), name='user'),
    path('houses', views.HousesView.as_view(), name='houses'),
    path('houses/<int:house_id>', views.HouseView.as_view(), name='house'),
    path('houses/<int:house_id>/users', views.HouseUsersView.as_view(), name='house_users'),
    path('houses/<int:house_id>/admins', views.HouseAdminsView.as_view(), name='house_admins'),
]
