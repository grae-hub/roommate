import os

import boto3
from django.db.backends.postgresql.base import DatabaseWrapper as PostgresDatabaseWrapper


class DatabaseWrapper(PostgresDatabaseWrapper):
    def get_connection_params(self):
        params = super().get_connection_params()
        client = boto3.client('rds', region_name=os.environ.get('AWS_REGION'))
        params['password'] = client.generate_db_auth_token(
            DBHostname=params['host'],
            Port=int(params['port']),
            DBUsername=params['user'],
        )
        params['sslmode'] = 'require'
        return params
