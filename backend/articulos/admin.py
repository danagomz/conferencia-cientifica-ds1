from django.contrib import admin

from .models import EvaluadorLinea


@admin.register(EvaluadorLinea)
class EvaluadorLineaAdmin(admin.ModelAdmin):
    """Permite indicar en qué líneas temáticas tiene experiencia cada miembro del comité."""

    list_display = ('id_usuario', 'id_linea')
    list_filter = ('id_linea__id_conferencia', 'id_linea')
    search_fields = ('id_usuario__email', 'id_usuario__first_name', 'id_usuario__last_name')
    autocomplete_fields = ('id_usuario',)
