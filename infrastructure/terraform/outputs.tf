# Pitfal Solutions - Terraform Outputs

# S3 Buckets
output "website_bucket_name" {
  description = "Name of the S3 bucket hosting the static website"
  value       = aws_s3_bucket.website.id
}

output "website_bucket_arn" {
  description = "ARN of the website S3 bucket"
  value       = aws_s3_bucket.website.arn
}

output "media_bucket_name" {
  description = "Name of the S3 bucket for media storage"
  value       = aws_s3_bucket.media.id
}

output "media_bucket_arn" {
  description = "ARN of the media S3 bucket"
  value       = aws_s3_bucket.media.arn
}

# CloudFront
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.website.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.website.domain_name
}

output "website_url" {
  description = "Primary website URL"
  value       = "https://${var.domain_name}"
}

# API Gateway
output "api_gateway_url" {
  description = "API Gateway base URL"
  value       = aws_api_gateway_stage.main.invoke_url
}

output "api_gateway_id" {
  description = "API Gateway REST API ID"
  value       = aws_api_gateway_rest_api.main.id
}

# DynamoDB Tables
output "dynamodb_inquiries_table" {
  description = "DynamoDB inquiries table name"
  value       = aws_dynamodb_table.inquiries.name
}

output "dynamodb_galleries_table" {
  description = "DynamoDB galleries table name"
  value       = aws_dynamodb_table.galleries.name
}

output "dynamodb_admin_table" {
  description = "DynamoDB admin table name"
  value       = aws_dynamodb_table.admin.name
}

# Lambda Functions
output "lambda_contact_arn" {
  description = "ARN of the contact Lambda function"
  value       = aws_lambda_function.contact.arn
}

# SSL Certificate
output "acm_certificate_arn" {
  description = "ARN of the ACM SSL certificate"
  value       = aws_acm_certificate.main.arn
}

# Deployment Commands
output "deployment_commands" {
  description = "Commands for deploying the website"
  value       = <<-EOT
    # Build the Next.js static site
    pnpm build

    # Sync to S3
    aws s3 sync out/ s3://${aws_s3_bucket.website.id} --delete

    # Invalidate CloudFront cache
    aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.website.id} --paths "/*"
  EOT
}
