from django.urls import path

from .views import ConferenciaListCreateView, ConferenciaDetailView

urlpatterns = [
    path(
        'conferencias/',
        ConferenciaListCreateView.as_view(),
        name='conferencia-list-create'
    ),
    path(
        'conferencias/<int:id_conferencia>/',
        ConferenciaDetailView.as_view(),
        name='conferencia-detail'
    ),
]