#!/usr/bin/env bash
#
# Clean up duplicate thumbnails at processed/gallery/ in the media S3 bucket.
#
# The thumbnail-generator Lambda creates thumbnails at:
#   processed/{galleryId}/{filename}/{width}w.webp
#
# An earlier code path incorrectly created duplicates at:
#   processed/gallery/{galleryId}/{filename}/{width}w.webp
#
# This script removes the duplicates under processed/gallery/.
#
# Usage:
#   export MEDIA_BUCKET=$(terraform -chdir=infrastructure/terraform output -raw media_bucket_name)
#   AWS_PROFILE=pitfal ./scripts/cleanup-duplicate-thumbnails.sh
#
# Add --dry-run to preview without deleting:
#   AWS_PROFILE=pitfal ./scripts/cleanup-duplicate-thumbnails.sh --dry-run

set -e

MEDIA_BUCKET="${MEDIA_BUCKET:-}"
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
  esac
done

if [[ -z "$MEDIA_BUCKET" ]]; then
  echo "MEDIA_BUCKET is required. Get it from terraform:"
  echo "  export MEDIA_BUCKET=\$(terraform -chdir=infrastructure/terraform output -raw media_bucket_name)"
  exit 1
fi

echo "Listing objects under processed/gallery/ in s3://${MEDIA_BUCKET}..."
OBJECTS=$(aws s3api list-objects-v2 \
  --bucket "$MEDIA_BUCKET" \
  --prefix "processed/gallery/" \
  --query "Contents[].Key" \
  --output text 2>/dev/null || echo "")

if [[ -z "$OBJECTS" || "$OBJECTS" == "None" ]]; then
  echo "No duplicate objects found under processed/gallery/. Nothing to clean up."
  exit 0
fi

COUNT=$(echo "$OBJECTS" | wc -w | tr -d ' ')
echo "Found $COUNT duplicate objects under processed/gallery/"

if [[ "$DRY_RUN" == "true" ]]; then
  echo ""
  echo "[DRY RUN] Would delete these objects:"
  echo "$OBJECTS" | tr '\t' '\n' | head -20
  [[ "$COUNT" -gt 20 ]] && echo "  ... and $((COUNT - 20)) more"
  echo ""
  echo "Run without --dry-run to delete."
  exit 0
fi

echo "Deleting duplicate objects..."
aws s3 rm "s3://${MEDIA_BUCKET}/processed/gallery/" --recursive

echo ""
echo "Done. Removed $COUNT duplicate objects from processed/gallery/."
