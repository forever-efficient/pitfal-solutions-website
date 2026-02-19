#!/usr/bin/env bash
# =============================================================================
# Pitfal Solutions - Developer Environment Setup
# =============================================================================
# Run once on a new machine to configure your local dev environment.
#
# Usage:
#   ./scripts/setup-dev.sh
#
# What it does:
#   1. Adds AWS_PROFILE=pitfal to ~/.zshrc (persists across reboots)
#   2. Checks required tools are installed (aws, terraform, pnpm, node)
#   3. Prints next steps
# =============================================================================

set -euo pipefail

SHELL_RC="$HOME/.zshrc"
AWS_PROFILE_LINE='export AWS_PROFILE=pitfal'

echo ""
echo "Pitfal Solutions - Dev Setup"
echo "============================="
echo ""

# --- 1. Required tools -------------------------------------------------------

echo "Checking required tools..."

check_tool() {
  if command -v "$1" >/dev/null 2>&1; then
    echo "  $1: OK ($(command -v "$1"))"
  else
    echo "  $1: MISSING — install with: $2"
    MISSING=1
  fi
}

MISSING=0
check_tool aws       "brew install awscli"
check_tool terraform "brew install terraform"
check_tool pnpm      "npm install -g pnpm"
check_tool node      "brew install node"

if [ "$MISSING" -eq 1 ]; then
  echo ""
  echo "Install missing tools above, then re-run this script."
  exit 1
fi
echo ""

# --- 2. AWS_PROFILE in shell config ------------------------------------------

if grep -q "AWS_PROFILE=pitfal" "$SHELL_RC" 2>/dev/null; then
  echo "AWS_PROFILE: already set in $SHELL_RC — skipping"
else
  echo "" >> "$SHELL_RC"
  echo "# Pitfal Solutions - AWS profile" >> "$SHELL_RC"
  echo "$AWS_PROFILE_LINE" >> "$SHELL_RC"
  echo "AWS_PROFILE: added to $SHELL_RC"
fi
echo ""

# --- 3. AWS profile credentials ----------------------------------------------

echo "Checking AWS profile 'pitfal'..."
if AWS_PROFILE=pitfal aws sts get-caller-identity --output text >/dev/null 2>&1; then
  echo "  AWS profile 'pitfal': OK"
else
  echo "  AWS profile 'pitfal': NOT CONFIGURED"
  echo ""
  echo "  Run this to configure it:"
  echo "    aws configure --profile pitfal"
  echo "  You'll need your Access Key ID and Secret Access Key from AWS IAM."
fi
echo ""

# --- 4. Install dependencies -------------------------------------------------

echo "Installing Node dependencies..."
pnpm install
echo ""

# --- 5. Next steps -----------------------------------------------------------

echo "============================="
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Reload your shell:   source ~/.zshrc"
echo "  2. Configure AWS creds (if needed):  aws configure --profile pitfal"
echo "  3. Init Terraform:      AWS_PROFILE=pitfal terraform -chdir=infrastructure/terraform init"
echo "  4. Start dev server:    pnpm dev"
echo "  5. Deploy:              make deploy"
echo ""
