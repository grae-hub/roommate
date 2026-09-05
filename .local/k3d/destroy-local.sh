#!/bin/bash
set -e

CLUSTER_NAME="roommate-cluster-local"

if ! k3d cluster list | grep -q "$CLUSTER_NAME"; then
    echo "cluster '$CLUSTER_NAME' doesn't exist, nothing to do"
    exit 0
fi

echo "deleting cluster..."
k3d cluster delete "$CLUSTER_NAME"

echo "done"