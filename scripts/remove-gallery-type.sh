#!/bin/bash
# Migration: Remove the deprecated `type` attribute from all gallery records.
#
# Run this BEFORE deploying the Lambda/Terraform changes that deprecate type.
#
# Usage:
#   GALLERIES_TABLE=pitfal-prod-galleries ./scripts/remove-gallery-type.sh
#   AWS_PROFILE=pitfal GALLERIES_TABLE=pitfal-prod-galleries ./scripts/remove-gallery-type.sh

set -e
TABLE="${GALLERIES_TABLE:-pitfal-prod-galleries}"

echo "Scanning $TABLE for gallery IDs..."
ids=()
next=""

while true; do
  if [ -z "$next" ]; then
    result=$(aws dynamodb scan --table-name "$TABLE" --projection-expression "id" --output json)
  else
    result=$(aws dynamodb scan --table-name "$TABLE" --projection-expression "id" --starting-token "$next" --output json)
  fi

  while IFS= read -r id; do
    [ -n "$id" ] && ids+=("$id")
  done < <(echo "$result" | jq -r '.Items[]?.id.S // empty')

  next=$(echo "$result" | jq -r '.NextToken // empty')
  [ -z "$next" ] && break
done

count=${#ids[@]}
echo "Found $count gallery record(s)."

for i in "${!ids[@]}"; do
  id="${ids[$i]}"
  aws dynamodb update-item \
    --table-name "$TABLE" \
    --key "{\"id\":{\"S\":\"$id\"}}" \
    --update-expression "REMOVE #t" \
    --expression-attribute-names '{"#t":"type"}' \
    --no-cli-pager > /dev/null
  echo "  Removed type from $id ($((i+1))/$count)"
done

echo "Done. Removed type attribute from $count record(s)."
