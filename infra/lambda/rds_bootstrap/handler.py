import json
import re
import urllib.request

import boto3
import pg8000.native

IAM_USERNAME_PATTERN = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_]*$')


def send_response(event, context, status, reason=None, data=None):
    body = json.dumps({
        'Status': status,
        'Reason': reason or f'see cloudwatch logs: {context.log_stream_name}',
        'PhysicalResourceId': event.get('PhysicalResourceId', context.log_stream_name),
        'StackId': event['StackId'],
        'RequestId': event['RequestId'],
        'LogicalResourceId': event['LogicalResourceId'],
        'Data': data or {},
    }).encode('utf-8')

    request = urllib.request.Request(
        event['ResponseURL'],
        data=body,
        method='PUT',
        headers={'Content-Type': '', 'Content-Length': str(len(body))},
    )
    urllib.request.urlopen(request)


def create_iam_user(props):
    iam_username = props['IamUsername']
    if not IAM_USERNAME_PATTERN.match(iam_username):
        raise ValueError(f'invalid iam username: {iam_username}')

    secret = boto3.client('secretsmanager').get_secret_value(SecretId=props['SecretArn'])
    credentials = json.loads(secret['SecretString'])

    connection = pg8000.native.Connection(
        user=credentials['username'],
        password=credentials['password'],
        host=props['DbHost'],
        port=int(props['DbPort']),
        database=props['DbName'],
        ssl_context=True,
    )
    try:
        exists = connection.run(
            "SELECT 1 FROM pg_roles WHERE rolname = :username",
            username=iam_username,
        )
        if not exists:
            connection.run(f'CREATE USER "{iam_username}"')
        connection.run(f'GRANT rds_iam TO "{iam_username}"')
        connection.run(f'GRANT USAGE, CREATE ON SCHEMA public TO "{iam_username}"')
    finally:
        connection.close()


def handler(event, context):
    try:
        if event['RequestType'] != 'Delete':
            create_iam_user(event['ResourceProperties'])
        send_response(event, context, 'SUCCESS')
    except Exception as e:
        send_response(event, context, 'FAILED', reason=str(e))
