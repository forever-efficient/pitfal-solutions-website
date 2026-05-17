#!/bin/bash
# Migration: Convert the single `category` field on every gallery record into
# a `categories: string[]` array. Galleries with category == 'videography' are
# rewritten to ['event-videography'] (the new split). All others become a
# one-element array preserving their original slug.
#
# This script is idempotent: records that already have `categories` set and
# no `category` attribute are skipped.
#
# `featuredIn` is intentionally LEFT UNTOUCHED — entries like
# `featuredIn: ['videography']` continue to power the homepage featured strip.
#
# Dry-run is the default. Pass CONFIRM=yes to actually write updates.
#
# Usage:
#   GALLERIES_TABLE=pitfal-prod-galleries ./scripts/migrate-categories.sh
#   CONFIRM=yes AWS_PROFILE=pitfal GALLERIES_TABLE=pitfal-prod-galleries ./scripts/migrate-categories.sh

set -e
TABLE="${GALLERIES_TABLE:-pitfal-prod-galleries}"
CONFIRM="${CONFIRM:-no}"

if [ "$CONFIRM" != "yes" ]; then
  echo "DRY RUN — no writes will be made. Set CONFIRM=yes to apply."
fi

echo "Scanning $TABLE for gallery records..."

records="[]"
next=""

while true; do
  if [ -z "$next" ]; then
    result=$(aws dynamodb scan --table-name "$TABLE" \
      --projection-expression "id, category, categories" \
      --output json)
  else
    result=$(aws dynamodb scan --table-name "$TABLE" \
      --projection-expression "id, category, categories" \
      --starting-token "$next" \
      --output json)
  fi

  page_records=$(echo "$result" | jq '.Items')
  records=$(jq -s 'add' <(echo "$records") <(echo "$page_records"))

  next=$(echo "$result" | jq -r '.NextToken // empty')
  [ -z "$next" ] && break
done

total=$(echo "$records" | jq 'length')
echo "Found $total gallery record(s)."

skipped=0
updated=0

for row in $(echo "$records" | jq -r '.[] | @base64'); do
  decoded=$(echo "$row" | base64 -d)
  id=$(echo "$decoded" | jq -r '.id.S // empty')
  old_category=$(echo "$decoded" | jq -r '.category.S // empty')
  has_categories=$(echo "$decoded" | jq -r '.categories | if . then "yes" else "no" end')

  if [ -z "$id" ]; then
    continue
  fi

  # Skip records that are already migrated (no old `category`, has `categories`).
  if [ -z "$old_category" ] && [ "$has_categories" = "yes" ]; then
    skipped=$((skipped + 1))
    continue
  fi

  # Map the old single category to the new array.
  if [ "$old_category" = "videography" ]; then
    new_categories='["event-videography"]'
  elif [ -n "$old_category" ]; then
    new_categories=$(jq -n --arg c "$old_category" '[$c]')
  else
    # No old category and no new categories — leave it alone, will be unreachable
    # via category URLs until admin assigns one.
    new_categories='[]'
  fi

  echo "  $id: '$old_category' -> $new_categories"

  if [ "$CONFIRM" = "yes" ]; then
    # Build the L (list) attribute value.
    categories_av=$(echo "$new_categories" | jq '{L: [.[] | {S: .}]}')

    aws dynamodb update-item \
      --table-name "$TABLE" \
      --key "{\"id\":{\"S\":\"$id\"}}" \
      --update-expression "SET categories = :c REMOVE #cat" \
      --expression-attribute-names '{"#cat":"category"}' \
      --expression-attribute-values "{\":c\":$categories_av}" \
      --no-cli-pager > /dev/null

    updated=$((updated + 1))
  fi
done

if [ "$CONFIRM" = "yes" ]; then
  echo ""
  echo "Migration complete: updated $updated, skipped $skipped (already migrated), total $total."
else
  echo ""
  echo "DRY RUN summary: would update $((total - skipped)), would skip $skipped (already migrated)."
  echo "Re-run with CONFIRM=yes to apply."
fi
