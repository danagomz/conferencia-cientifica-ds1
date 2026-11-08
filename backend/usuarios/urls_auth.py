from django.urls import path

from .autenticacion import LoginView

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='login'),
]
