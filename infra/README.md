# Infra

This directory provisions the AWS platform roommate runs on (CloudFormation), and deploys the Kubernetes workloads on top of it (Helm).

## What's deployed

**CloudFormation** (`cfn/`) — four stacks, deployed in order by `deploy-infra-cfn.yaml`:

- `networking.yaml` — VPC, public/private subnets, NAT gateway(s), routing
- `eks.yaml` — EKS cluster, managed node group, OIDC provider, ACM certificate
- `karpenter.yaml` — IAM roles/policies, SQS interruption queue, and EventBridge rules supporting Karpenter autoscaling
- `cognito.yaml` — Cognito user pool with Google login, used for ALB authentication

**Helm** (`helm/`) — Kubernetes-side deployment:

- `app/` — frontend, backend, and redis Deployments/Services, plus the frontend Ingress (ALB + Cognito auth)
- `karpenter/` — NodePool/EC2NodeClass config controlling what EC2 instances Karpenter provisions

## Diagrams

### networking

![networking stack](diagrams/networking.png)