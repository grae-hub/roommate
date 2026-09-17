to run actions locally:

act -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:full-latest \
  -W .local/deploy-infra.yaml \
  --var-file .local/.env.development \
  --secret-file .local/.secrets.development

or for workflow dispatch:

act workflow_dispatch \
  -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:full-latest \
  -W .local/destroy-infra.yaml \
  --var-file .local/.env.development \
  --secret-file .local/.secrets.development

ensure that aws auth step is changed to this:
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
      aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
      aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      aws-region: ${{ vars.AWS_REGION }}
      role-to-assume: ${{ secrets.AWS_ROLE }}
      role-session-name: local-github-workflow