# Roommate App

## /infra

Our application runs on a Kubernetes cluster with Karpenter handling autoscaling. This directory provisions the AWS platform it runs using CloudFormation, and deploys the Kubernetes workloads on top of it using Helm.

Note that this is more infrastructure than an app this size actually needs, it could run with a more lightweight setup. The setup exists mainly as a technical showcase of EKS, Karpenter, and the surrounding AWS ecosystem.

---

### CloudFormation (`cfn/`)

Four stacks, deployed in order by `deploy-infra-cfn.yaml`.

#### `networking.yaml`

- VPC
- Public + private subnets
- Internet Gateway
- NAT gateway(s)
- Route tables

<details>
<summary>Diagram</summary>

<img src="diagrams/networking.png" width="700" alt="networking stack">

</details>

<br>

#### `eks.yaml`

- EksClusterRole: lets the EKS control plane call other AWS APIs on your behalf
- NodeInstanceRole: lets worker nodes register with the cluster, use the VPC CNI, pull images from ECR, and be managed via SSM
- EKS cluster: the AWS managed control plain that runs and coordinates the cluster, targets all subnets in our VPC
- Managed node group: ASG of EC2 nodes that run the pods, placed in the private subnets
- OIDC provider: enables IRSA, so a pod's service account can assume its own specific IAM role instead of inheriting the whole node's shared role
- ACM certificate: requested and DNS-validated upfront so that it's ready for when ingress needs it later on in deployment

*note that our node group has a 'DesiredSize' of 1, so only 1 node is actually deployed in this ASG*

<details>
<summary>Diagram</summary>

<img src="diagrams/eks.png" width="700" alt="eks stack">

</details>

<br>

#### `karpenter.yaml`

- Karpenter node IAM role: role given to ec2 nodes karpenter launches so they can join the cluster
- Karpenter controller IAM policy + role: role given to karpenter controller pods such that they can create and destroy ec2 nodes, can only be assumed via IRSA by pods with karpenter service account
- SQS interruption queue: receives spot interruption, instance health, and rebalance events so Karpenter can react before a node disappears
- EventBridge rules: forwards AWS events into the interruption queue
- Node security group: controls what traffic is allowed to/from Karpenter provisioned nodes and the control plane

<br>

#### `cognito.yaml`

- Cognito user pool: directory of users including accounts, passwords, verified emails, federated identities
- Google identity provider: lets users log in with an existing Google account instead of creating a new password. This is associated with our user pool
- User pool domain: hosted UI for login
- User pool client: config that strings together our domain, user pool, and identity providers. Will be used by our alb

---

### Helm (`helm/`)

#### `karpenter controller`

This chart is not defined by us, instead sourced from a public aws chart.

Deploys the karpenter autoscaling software onto our eks cluster.

<details>
<summary>Diagram</summary>

<img src="diagrams/karpenter-controller.png" width="700" alt="karpenter controller helm">

</details>

<br>

#### `karpenter/`

Config that tells our karpenter controller what it is allowed to launch.

- ec2nodeclass: environment karpenter nodes are built into. Identity, network placement, and the base image
- nodepool: instance specs for karpenter nodes. Shape of instance (arch, pricing model, size category) and how much of it the pool is allowed to produce

*provides the instructions/config that enable karpenter worker nodes to be created*

<details>
<summary>Diagram</summary>

<img src="diagrams/karpenter.png" width="700" alt="karpenter helm">

</details>

<br>

#### `app/`

Deploys the actual application onto the infra (with the exception of the ingress which itself deploys new infra).

- Backend/Redis: replica pods (2 by default) running a container image, load-balanced internally via a ClusterIP Service
- Frontend: the same pattern (replica pods + ClusterIP Service), plus an Ingress in front of it. provisions an ALB, attaches TLS + Cognito auth, and makes our cluster reachable from the internet

*app pods will trigger karpenter to create worker nodes where there are not sufficient resources for pending pods*

<details>
<summary>Diagram</summary>

<img src="diagrams/app.png" width="700" alt="app helm">

</details>
