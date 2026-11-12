from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('usuarios', '0004_crear_roles_iniciales'),
    ]

    operations = [
        migrations.CreateModel(
            name='CodigoRecuperacionContrasena',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('codigo_hash', models.CharField(max_length=128)),
                ('creado_en', models.DateTimeField(auto_now_add=True)),
                ('expira_en', models.DateTimeField()),
                ('intentos', models.PositiveSmallIntegerField(default=0)),
                ('usado_en', models.DateTimeField(blank=True, null=True)),
                ('usuario', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='codigos_recuperacion',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'codigo_recuperacion_contrasena',
                'ordering': ['-creado_en'],
            },
        ),
    ]
