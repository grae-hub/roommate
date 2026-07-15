# Infra

This directory provisions the AWS platform roommate runs on (CloudFormation), and deploys the Kubernetes workloads on top of it (Helm).

## What's deployed

### CloudFormation (`cfn/`)

Four stacks, deployed in order by `deploy-infra-cfn.yaml`.

**`networking.yaml`**
- VPC
- Public + private subnets
- Internet Gateway
- NAT gateway(s)
- Route tables

**`eks.yaml`**
- EksClusterRole: lets the EKS control plane call other AWS APIs on your behalf
- NodeInstanceRole: lets worker nodes register with the cluster, use the VPC CNI, pull images from ECR, and be managed via SSM
- EKS cluster: the AWS managed control plain that runs and coordinates the cluster, targets all subnets in our VPC
- Managed node group: the EC2 nodes that run the pods, placed in the private subnets
- OIDC provider: enables IRSA, so a pod's service account can assume its own specific IAM role instead of inheriting the whole node's shared role
- ACM certificate: requested and DNS-validated upfront so that it's ready for when ingress needs it later on in deployment

**`karpenter.yaml`**
- Karpenter node IAM role
- Karpenter controller IAM policy + role
- SQS interruption queue
- EventBridge rules
- Node security group

**`cognito.yaml`**
- Cognito user pool
- Google identity provider
- User pool domain
- User pool client

### Helm (`helm/`)

- `app/` — frontend, backend, and redis Deployments/Services, plus the frontend Ingress (ALB + Cognito auth)
- `karpenter/` — NodePool/EC2NodeClass config controlling what EC2 instances Karpenter provisions

## Diagrams

### networking

![networking stack](diagrams/networking.png)