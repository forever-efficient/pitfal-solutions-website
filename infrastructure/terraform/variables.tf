# Pitfal Solutions - Terraform Variables

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "pitfal"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-west-2"
}

variable "domain_name" {
  description = "Primary domain name for the website"
  type        = string
  default     = "pitfal.solutions"
}

variable "subject_alternative_names" {
  description = "Additional domain names for SSL certificate"
  type        = list(string)
  default     = ["www.pitfal.solutions"]
}

# Custom domain configuration
variable "use_custom_domain" {
  description = "Whether to use a custom domain with ACM certificate (false = CloudFront default domain)"
  type        = bool
  default     = false
}

# Route53 - set to empty string if managing DNS externally
variable "route53_zone_id" {
  description = "Route53 hosted zone ID (leave empty if DNS managed externally)"
  type        = string
  default     = ""
}

# Contact form settings
variable "contact_email" {
  description = "Email address for contact form submissions"
  type        = string
  default     = "info@pitfal.solutions"
}

variable "from_email" {
  description = "Email address for sending emails"
  type        = string
  default     = "noreply@pitfal.solutions"
}

# API settings
variable "api_throttle_rate_limit" {
  description = "API Gateway throttling rate limit (requests per second)"
  type        = number
  default     = 100
}

variable "api_throttle_burst_limit" {
  description = "API Gateway throttling burst limit"
  type        = number
  default     = 200
}

# DynamoDB settings
variable "dynamodb_billing_mode" {
  description = "DynamoDB billing mode (PAY_PER_REQUEST or PROVISIONED)"
  type        = string
  default     = "PAY_PER_REQUEST"
}

# Lambda settings
variable "lambda_runtime" {
  description = "Lambda runtime version"
  type        = string
  default     = "nodejs20.x"
}

variable "lambda_memory_size" {
  description = "Default Lambda memory size in MB"
  type        = number
  default     = 256
}

variable "lambda_timeout" {
  description = "Default Lambda timeout in seconds"
  type        = number
  default     = 30
}

variable "lambda_reserved_concurrency" {
  description = "Reserved concurrent executions for Lambda functions (-1 = unreserved, use account pool)"
  type        = number
  default     = -1
}

# CloudFront settings
variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100" # US, Canada, Europe only (cheapest)
}

variable "enable_cloudfront_logging" {
  description = "Enable CloudFront access logging"
  type        = bool
  default     = false
}

# Cost allocation
variable "cost_center" {
  description = "Cost center tag for AWS cost allocation reporting"
  type        = string
  default     = "pitfal-photography"
}

# WAF settings
variable "enable_waf" {
  description = "Enable AWS WAF protection for CloudFront"
  type        = bool
  default     = false
}

variable "waf_rate_limit" {
  description = "WAF rate limit (requests per 5 minutes per IP)"
  type        = number
  default     = 1000
}

# CloudWatch Alarms settings
variable "enable_cloudwatch_alarms" {
  description = "Enable CloudWatch alarms for monitoring"
  type        = bool
  default     = true
}

variable "alarm_email" {
  description = "Email address for alarm notifications (leave empty to skip email subscription)"
  type        = string
  default     = ""
}

# ─────────────────────────────────────────────
# Image Processor settings
# ─────────────────────────────────────────────

variable "enable_image_processor" {
  description = "Enable image processor Lambda. Set to false until Docker image is pushed to ECR."
  type        = bool
  default     = false
}

variable "image_processor_memory_size" {
  description = "Memory size for image processor Lambda (MB). RAW processing needs significant memory."
  type        = number
  default     = 2048
}

variable "image_processor_timeout" {
  description = "Timeout for image processor Lambda (seconds). RAW conversion is CPU-intensive."
  type        = number
  default     = 300 # 5 minutes
}

variable "image_processor_concurrency" {
  description = "Max concurrent image processing executions. Controls costs for large batch uploads."
  type        = number
  default     = 5
}

variable "image_processor_jpeg_quality" {
  description = "JPEG quality for edited images (1-100). 93 balances file size and print quality."
  type        = number
  default     = 93

  validation {
    condition     = var.image_processor_jpeg_quality >= 1 && var.image_processor_jpeg_quality <= 100
    error_message = "JPEG quality must be between 1 and 100."
  }
}
