#!/bin/bash
set -e

CLUSTER_NAME="roommate-cluster-local"
POSTGRES_CONTAINER="roommate-postgres-local"
COGNITO_STACK_NAME="roommate-cognito-local"
AWS_REGION="ap-southeast-2"

if k3d cluster list | grep -q "$CLUSTER_NAME"; then
    echo "deleting cluster..."
    k3d cluster delete "$CLUSTER_NAME"
else
    echo "cluster '$CLUSTER_NAME' doesn't exist, nothing to do"
fi

if docker ps -a --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
    echo "removing postgres container '$POSTGRES_CONTAINER'..."
    docker rm -f "$POSTGRES_CONTAINER"
else
    echo "postgres container '$POSTGRES_CONTAINER' doesn't exist, nothing to do"
fi

if aws cloudformation describe-stacks --stack-name "${COGNITO_STACK_NAME}" --region "${AWS_REGION}" &>/dev/null; then
    echo "deleting stack '${COGNITO_STACK_NAME}' (this removes the local user pool and any users in it)..."
    aws cloudformation delete-stack --stack-name "${COGNITO_STACK_NAME}" --region "${AWS_REGION}"
    aws cloudformation wait stack-delete-complete --stack-name "${COGNITO_STACK_NAME}" --region "${AWS_REGION}"
else
    echo "stack '${COGNITO_STACK_NAME}' doesn't exist, nothing to do"
fi

echo "done"
