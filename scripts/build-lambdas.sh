#!/usr/bin/env bash
# Build Lambda TypeScript functions for deployment.
# Must be run before `terraform apply` to produce compiled JS artifacts.
#
# Usage:
#   ./scripts/build-lambdas.sh          # build all
#   ./scripts/build-lambdas.sh contact  # build only contact
#   ./scripts/build-lambdas.sh shared   # build only shared layer
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LAMBDA_DIR="$PROJECT_ROOT/lambda"

build_contact() {
  echo "==> Building contact Lambda..."
  cd "$LAMBDA_DIR/contact"
  npm ci --ignore-scripts 2>/dev/null || npm install --ignore-scripts
  npm run build
  echo "    ✓ contact Lambda built → lambda/contact/dist/"
}

build_shared() {
  echo "==> Building shared Lambda layer..."
  cd "$LAMBDA_DIR/shared"
  npm ci --ignore-scripts 2>/dev/null || npm install --ignore-scripts
  npm run build
  echo "    ✓ shared layer built → lambda/shared/dist/"
}

TARGET="${1:-all}"

case "$TARGET" in
  contact) build_contact ;;
  shared)  build_shared ;;
  all)
    build_shared
    build_contact
    ;;
  *)
    echo "Unknown target: $TARGET"
    echo "Usage: $0 [contact|shared|all]"
    exit 1
    ;;
esac

echo ""
echo "Lambda build complete. Run 'terraform apply' to deploy."
