#!/bin/bash
# Build sharp Lambda Layer for nodejs22.x (x86_64, Amazon Linux 2023)
#
# Lambda Layers expect Node modules at: nodejs/node_modules/
# This script creates the proper directory structure and installs
# sharp with the correct platform binaries for Lambda.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LAYER_DIR="$SCRIPT_DIR/layer"

echo "🧹 Cleaning previous build..."
rm -rf "$LAYER_DIR"
mkdir -p "$LAYER_DIR/nodejs"

echo "📦 Installing sharp for Lambda (linux-x64)..."
cd "$LAYER_DIR/nodejs"

# Create a minimal package.json
cat > package.json << 'EOF'
{
  "name": "sharp-lambda-layer",
  "version": "1.0.0",
  "dependencies": {
    "sharp": "^0.33.0"
  }
}
EOF

# Install sharp with the correct platform for Lambda
npm install --cpu=x64 --os=linux --libc=glibc

# Remove unnecessary files to keep layer small
rm -f package.json package-lock.json
rm -rf node_modules/sharp/docs
rm -rf node_modules/sharp/src
rm -rf node_modules/sharp/*.md

echo "📐 Layer size: $(du -sh "$LAYER_DIR" | cut -f1)"
echo "✅ Sharp Lambda Layer built at: $LAYER_DIR"
