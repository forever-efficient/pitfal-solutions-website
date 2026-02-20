#!/usr/bin/env bash
#
# Backfill thumbnails for existing gallery images.
#
# The thumbnail-generator Lambda only runs when NEW images are uploaded to
# gallery/. Images added before it was deployed never got processed thumbnails.
#
# This script copies each gallery image to itself in S3, which triggers
# the ObjectCreated event and causes the thumbnail generator to run.
#
# Usage:
#   export MEDIA_BUCKET=$(terraform -chdir=infrastructure/terraform output -raw media_bucket_name)
#   export GALLERIES_TABLE=$(terraform -chdir=infrastructure/terraform output -raw dynamodb_galleries_table)
#   AWS_PROFILE=pitfal ./scripts/backfill-thumbnails.sh
#
# Or with explicit values:
#   MEDIA_BUCKET=pitfal-prod-media GALLERIES_TABLE=pitfal-prod-galleries AWS_PROFILE=pitfal ./scripts/backfill-thumbnails.sh

set -e

MEDIA_BUCKET="${MEDIA_BUCKET:-}"
GALLERIES_TABLE="${GALLERIES_TABLE:-pitfal-prod-galleries}"
AWS_REGION="${AWS_REGION:-us-west-2}"

if [[ -z "$MEDIA_BUCKET" ]]; then
  echo "MEDIA_BUCKET is required. Get it from terraform:"
  echo "  export MEDIA_BUCKET=\$(terraform -chdir=infrastructure/terraform output -raw media_bucket_name)"
  exit 1
fi

echo "Fetching gallery image keys from DynamoDB..."
KEYS=$(aws dynamodb scan \
  --table-name "$GALLERIES_TABLE" \
  --projection-expression "images" \
  --output json \
  | jq -r '.Items[]? | select(.images != null) | .images.L[]? | .M.key.S // empty' \
  | grep '^gallery/' \
  | sort -u)

KEY_COUNT=$(echo "$KEYS" | grep -c . || true)
echo "Found $KEY_COUNT gallery image keys"

if [[ "$KEY_COUNT" -eq 0 ]]; then
  echo "No gallery images to process."
  exit 0
fi

PROCESSED=0
FAILED=0

while IFS= read -r key; do
  [[ -z "$key" ]] && continue

  if aws s3api head-object --bucket "$MEDIA_BUCKET" --key "$key" &>/dev/null; then
    if aws s3api copy-object \
      --bucket "$MEDIA_BUCKET" \
      --key "$key" \
      --copy-source "${MEDIA_BUCKET}/${key}" \
      &>/dev/null; then
      echo "  Triggered: $key"
      ((PROCESSED++)) || true
    else
      echo "  Failed: $key"
      ((FAILED++)) || true
    fi
  else
    echo "  Skip (not in S3): $key"
  fi
done <<< "$KEYS"

echo ""
echo "Done. Processed: $PROCESSED, Failed: $FAILED"
echo ""
echo "Thumbnails are generated asynchronously by the Lambda. Allow 1-2 minutes, then invalidate CloudFront:"
echo "  aws cloudfront create-invalidation --distribution-id \$(terraform -chdir=infrastructure/terraform output -raw cloudfront_distribution_id) --paths \"/media/*\""
