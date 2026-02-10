#!/usr/bin/env bash
# Pitfal Solutions - Deploy Image Processor Lambda
#
# Builds the Docker image, pushes to ECR, and updates the Lambda function.
#
# Usage:
#   ./scripts/deploy-image-processor.sh [--region us-west-2] [--env prod]
#
# Prerequisites:
#   - Docker Desktop running
#   - AWS CLI configured with appropriate credentials
#   - ECR repository created (via terraform apply)

set -euo pipefail

# Defaults
AWS_REGION="${AWS_REGION:-us-west-2}"
ENVIRONMENT="${ENVIRONMENT:-prod}"
PROJECT_NAME="pitfal"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --region) AWS_REGION="$2"; shift 2 ;;
    --env) ENVIRONMENT="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

NAME_PREFIX="${PROJECT_NAME}-${ENVIRONMENT}"
FUNCTION_NAME="${NAME_PREFIX}-image-processor"
ECR_REPO_NAME="${NAME_PREFIX}-image-processor"

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}"

echo "═══════════════════════════════════════════════"
echo "  Pitfal Solutions - Image Processor Deploy"
echo "═══════════════════════════════════════════════"
echo ""
echo "  Region:    ${AWS_REGION}"
echo "  Env:       ${ENVIRONMENT}"
echo "  Function:  ${FUNCTION_NAME}"
echo "  ECR:       ${ECR_URI}"
echo ""

# Step 1: Compile TypeScript
echo "▸ Compiling TypeScript..."
cd "$(dirname "$0")/../lambda/image-processor"
npm run build

# Step 2: Login to ECR
echo "▸ Logging into ECR..."
aws ecr get-login-password --region "${AWS_REGION}" | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Step 3: Build Docker image
echo "▸ Building Docker image..."
DOCKER_TAG="${ECR_URI}:latest"
DOCKER_TAG_SHA="${ECR_URI}:$(git rev-parse --short HEAD 2>/dev/null || echo 'dev')"

docker build \
  --platform linux/amd64 \
  -t "${DOCKER_TAG}" \
  -t "${DOCKER_TAG_SHA}" \
  .

# Step 4: Push to ECR
echo "▸ Pushing to ECR..."
docker push "${DOCKER_TAG}"
docker push "${DOCKER_TAG_SHA}"

# Step 5: Update Lambda function
echo "▸ Updating Lambda function..."
aws lambda update-function-code \
  --function-name "${FUNCTION_NAME}" \
  --image-uri "${DOCKER_TAG}" \
  --region "${AWS_REGION}" \
  --no-cli-pager

# Step 6: Wait for update to complete
echo "▸ Waiting for function update..."
aws lambda wait function-updated \
  --function-name "${FUNCTION_NAME}" \
  --region "${AWS_REGION}"

echo ""
echo "✓ Image processor deployed successfully!"
echo ""
echo "  Upload RAW files to test:"
echo "  aws s3 cp photo.CR3 s3://${NAME_PREFIX}-media/staging/"
echo ""
echo "  Check results:"
echo "  aws s3 ls s3://${NAME_PREFIX}-media/finished/"
echo ""
