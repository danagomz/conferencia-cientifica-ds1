from django.shortcuts import render

# Create your views here.
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import EsAutor
from .serializers import ArticuloCrearSerializer


class ArticuloCrearView(APIView):
    """POST /api/articulos/ — registra un artículo (SDGC-122)."""

    permission_classes = [EsAutor]

    def post(self, request):
        serializer = ArticuloCrearSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        articulo = serializer.save()
        return Response(ArticuloCrearSerializer(articulo).data, status=status.HTTP_201_CREATED)
