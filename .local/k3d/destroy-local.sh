#!/bin/bash
set -e

CLUSTER_NAME="roommate-cluster-local"
POSTGRES_CONTAINER="roommate-postgres-local"

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

echo "done"