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
  value       = var.use_custom_domain ? "https://www.${var.domain_name}" : "https://${aws_cloudfront_distribution.website.domain_name}"
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

output "dynamodb_bookings_table" {
  description = "DynamoDB bookings table name"
  value       = aws_dynamodb_table.bookings.name
}

# Lambda Functions
output "lambda_contact_arn" {
  description = "ARN of the contact Lambda function"
  value       = aws_lambda_function.contact.arn
}

output "lambda_client_auth_arn" {
  description = "ARN of the client auth Lambda function"
  value       = aws_lambda_function.client_auth.arn
}

output "lambda_client_gallery_arn" {
  description = "ARN of the client gallery Lambda function"
  value       = aws_lambda_function.client_gallery.arn
}

output "lambda_admin_arn" {
  description = "ARN of the admin Lambda function"
  value       = aws_lambda_function.admin.arn
}

# SSL Certificate (only when using custom domain)
output "acm_certificate_arn" {
  description = "ARN of the ACM SSL certificate (only set when use_custom_domain = true)"
  value       = var.use_custom_domain ? aws_acm_certificate.main[0].arn : null
}

# Deployment Commands
output "deployment_commands" {
  description = "Commands for deploying the website"
  value       = <<-EOT
    # Build the Next.js static site
    # Set environment variables for the correct URLs:
    ${var.use_custom_domain ? "" : "# NEXT_PUBLIC_SITE_URL=https://${aws_cloudfront_distribution.website.domain_name}"}
    ${var.use_custom_domain ? "" : "# NEXT_PUBLIC_API_URL=https://${aws_cloudfront_distribution.website.domain_name}/api"}
    pnpm build

    # Sync to S3
    aws s3 sync out/ s3://${aws_s3_bucket.website.id} --delete

    # Invalidate CloudFront cache
    aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.website.id} --paths "/*"
  EOT
}

# Image Processor
output "image_processor_ecr_repository" {
  description = "ECR repository URL for the image processor Lambda"
  value       = aws_ecr_repository.image_processor.repository_url
}

output "image_processor_lambda_arn" {
  description = "ARN of the image processor Lambda function"
  value       = var.enable_image_processor ? aws_lambda_function.image_processor[0].arn : ""
}

output "image_staging_path" {
  description = "S3 path for uploading RAW images for auto-editing"
  value       = "s3://${aws_s3_bucket.media.id}/staging/"
}

output "image_finished_path" {
  description = "S3 path where edited images are delivered"
  value       = "s3://${aws_s3_bucket.media.id}/finished/"
}

# Domain configuration info
output "domain_configuration" {
  description = "Current domain configuration"
  value = {
    use_custom_domain = var.use_custom_domain
    website_url       = var.use_custom_domain ? "https://www.${var.domain_name}" : "https://${aws_cloudfront_distribution.website.domain_name}"
    cloudfront_domain = aws_cloudfront_distribution.website.domain_name
    custom_domain     = var.use_custom_domain ? var.domain_name : null
  }
}
