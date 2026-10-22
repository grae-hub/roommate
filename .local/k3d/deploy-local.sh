#!/bin/bash
set -e

APP_NAME="roommate"
AWS_REGION="ap-southeast-2"
LOCAL_APP_URL="http://localhost:30080"
COGNITO_STACK_NAME="${APP_NAME}-cognito-local"

SECRETS_FILE="$(dirname "$0")/.secrets.local"
if [[ -f "$SECRETS_FILE" ]]; then
    source "$SECRETS_FILE"
fi

if [[ -z "${GOOGLE_CLIENT_ID}" || -z "${GOOGLE_CLIENT_SECRET}" ]]; then
    echo "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env variables required"
    exit 1
fi

# build and push images
docker build -t grae888/roommate-frontend:latest src/app/frontend/.
docker push grae888/roommate-frontend:latest
docker build -t grae888/roommate-backend:latest src/app/backend/.
docker push grae888/roommate-backend:latest

CLUSTER_NAME="roommate-cluster-local"
RELEASE_NAME="app"
CHART_PATH="infra/helm/app"
POSTGRES_CONTAINER="roommate-postgres-local"

# local postgres db - no volume, recreated empty on every run
echo "resetting postgres container '$POSTGRES_CONTAINER'..."
docker rm -f "$POSTGRES_CONTAINER" &>/dev/null || true
docker run -d \
    --name "$POSTGRES_CONTAINER" \
    -e POSTGRES_DB=roommate \
    -e POSTGRES_USER=roommate \
    -e POSTGRES_PASSWORD=roommate \
    -p 5432:5432 \
    postgres:16-alpine

echo "waiting for postgres to be ready..."
until docker exec "$POSTGRES_CONTAINER" pg_isready -U roommate &>/dev/null; do
    sleep 1
done

# db is fresh every run, so migrations must be reapplied every run too
echo "applying database migrations..."
(cd src/app/backend && python manage.py migrate)

# k3d cluster init
if k3d cluster list | grep -q "$CLUSTER_NAME"; then
    echo "cluster '$CLUSTER_NAME' already exists, starting if stopped..."
    k3d cluster start "$CLUSTER_NAME" 2>/dev/null || true
else
    echo "creating cluster '$CLUSTER_NAME'..."
    k3d cluster create "$CLUSTER_NAME" \
        -p "30080:30080@server:0"
fi

kubectl config use-context "k3d-$CLUSTER_NAME"

echo "waiting for cluster..."
kubectl wait --for=condition=Ready nodes --all --timeout=60s

# deploy the app via helm
echo "deploying helm charts..."
helm upgrade --install "$RELEASE_NAME" "$CHART_PATH" -f "$CHART_PATH/values.local.yaml"

# force pods to pick up the freshly pushed image
for deployment in roommate-frontend-deployment roommate-backend-deployment; do
    if kubectl get deployment "$deployment" &>/dev/null; then
        echo "restarting '$deployment' to pick up newly pushed image..."
        kubectl rollout restart deployment "$deployment"
        kubectl rollout status deployment "$deployment" --timeout=60s
    fi
done

# standalone cognito user pool
echo "deploying local cognito user pool..."
aws cloudformation deploy \
    --stack-name "${COGNITO_STACK_NAME}" \
    --template-file infra/cfn/cognito-local.yaml \
    --region "${AWS_REGION}" \
    --no-fail-on-empty-changeset \
    --parameter-overrides \
    App="${APP_NAME}" \
    GoogleClientId="${GOOGLE_CLIENT_ID}" \
    GoogleClientSecret="${GOOGLE_CLIENT_SECRET}" \
    LocalAppUrl="${LOCAL_APP_URL}"

# get cognito details for local js auth

USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name "${COGNITO_STACK_NAME}" \
    --region "${AWS_REGION}" \
    --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
    --output text)

USER_POOL_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name "${COGNITO_STACK_NAME}" \
    --region "${AWS_REGION}" \
    --query "Stacks[0].Outputs[?OutputKey=='UserPoolDomainUrl'].OutputValue" \
    --output text)

CLIENT_ID=$(aws cloudformation describe-stacks \
    --stack-name "${COGNITO_STACK_NAME}" \
    --region "${AWS_REGION}" \
    --query "Stacks[0].Outputs[?OutputKey=='LocalUserPoolClientId'].OutputValue" \
    --output text)

CLIENT_SECRET=$(aws cognito-idp describe-user-pool-client \
    --user-pool-id "${USER_POOL_ID}" \
    --client-id "${CLIENT_ID}" \
    --region "${AWS_REGION}" \
    --query "UserPoolClient.ClientSecret" \
    --output text)

# hand the cognito details to the frontend pods as /local-config.json (read by local-auth.js)
echo "creating frontend local auth config..."
kubectl create configmap roommate-frontend-local-auth \
    --from-literal=local-config.json="{\"domain\":\"${USER_POOL_DOMAIN}\",\"clientId\":\"${CLIENT_ID}\",\"clientSecret\":\"${CLIENT_SECRET}\"}" \
    --dry-run=client -o yaml | kubectl apply -f -
kubectl rollout restart deployment roommate-frontend-deployment
kubectl rollout status deployment roommate-frontend-deployment --timeout=60s

echo ""
echo "available at 'localhost:30080'"
