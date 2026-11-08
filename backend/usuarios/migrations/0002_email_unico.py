from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(
            # Evita correos duplicados, sin distinguir mayúsculas y minúsculas.
            # Los correos vacíos no se tienen en cuenta.
            sql="""
                CREATE UNIQUE INDEX auth_user_email_lower_unique_idx
                ON auth_user (LOWER(email))
                WHERE email <> '';
            """,

            # Elimina el índice si se revierte esta migración.
            reverse_sql="""
                DROP INDEX IF EXISTS auth_user_email_lower_unique_idx;
            """
        ),
    ]