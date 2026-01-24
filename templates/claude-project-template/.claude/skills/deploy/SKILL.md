---
name: deploy
description: Deploy the application to production. Use when user says deploy, push to production, or update live site.
---

# Deploy

Execute deployment following this sequence:

## Pre-deployment Checks
1. Verify tests pass: `{{TEST_COMMAND}}`
2. Check for uncommitted changes: `git status`

## Build
1. Build the application: `{{BUILD_COMMAND}}`
2. Verify build output exists

## Deploy
1. {{DEPLOY_STEP_1}}
2. {{DEPLOY_STEP_2}}

## Post-deployment
1. Verify site is accessible
2. Run smoke tests if available

## Rollback
If deployment fails:
1. {{ROLLBACK_STEP_1}}
2. {{ROLLBACK_STEP_2}}
