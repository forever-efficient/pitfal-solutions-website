# Pitfal Solutions - Terraform Infrastructure

AWS serverless infrastructure for the Pitfal Solutions photography website.

## Architecture

- **S3**: Static website hosting and media storage
- **CloudFront**: CDN with SSL/TLS termination
- **Lambda**: Serverless backend functions
- **API Gateway**: REST API for Lambda functions
- **DynamoDB**: NoSQL database for inquiries, galleries, admin data
- **SES**: Transactional email service
- **WAF**: Web Application Firewall protection
- **CloudWatch**: Monitoring, logging, and alarms

## Environment Management

This infrastructure supports multiple environments via the `environment` variable:

| Environment | Use Case | Domain |
|-------------|----------|--------|
| `dev` | Development and testing | dev.pitfal.solutions |
| `staging` | Pre-production testing | staging.pitfal.solutions |
| `prod` | Production | www.pitfal.solutions |

### Using Terraform Workspaces (Optional)

For environment isolation, you can use Terraform workspaces:

```bash
# Create workspaces
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

# Switch workspace
terraform workspace select dev

# Apply with workspace-specific tfvars
terraform apply -var-file="environments/${terraform.workspace}.tfvars"
```

Alternatively, use separate state files per environment with different backend configurations.

## Cost Optimization

This infrastructure is designed for cost efficiency (< $20/month target):

- **S3**: Pay-per-use storage with lifecycle rules
- **CloudFront**: PriceClass_100 (US, Canada, Europe only)
- **Lambda**: Pay-per-invocation with reserved concurrency limits
- **DynamoDB**: On-demand billing mode
- **SES**: Free tier covers most usage (62K emails/month)
