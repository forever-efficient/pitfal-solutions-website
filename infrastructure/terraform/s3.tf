# Pitfal Solutions - S3 Buckets

# Website bucket (static site hosting)
resource "aws_s3_bucket" "website" {
  bucket = "${local.name_prefix}-website"

  tags = {
    Name = "${local.name_prefix}-website"
  }
}

resource "aws_s3_bucket_versioning" "website" {
  bucket = aws_s3_bucket.website.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Website bucket lifecycle - expire old versions
resource "aws_s3_bucket_lifecycle_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# Website bucket policy - allow CloudFront access via OAC
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.website.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.website.arn
          }
        }
      }
    ]
  })
}

# Media bucket (images, videos)
resource "aws_s3_bucket" "media" {
  bucket = "${local.name_prefix}-media"

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name = "${local.name_prefix}-media"
  }
}

resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Media bucket policy - allow CloudFront access via OAC
resource "aws_s3_bucket_policy" "media" {
  bucket = aws_s3_bucket.media.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.media.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.website.arn
          }
        }
      }
    ]
  })
}

# CORS configuration for media bucket
resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    # Dynamic CORS origins based on custom domain usage and environment
    # When using custom domain: specific origins for security
    # When using CloudFront default: allow all cloudfront.net domains (S3 CORS doesn't support circular refs)
    allowed_origins = var.use_custom_domain ? (
      var.environment == "prod" ? [
        "https://${var.domain_name}",
        "https://www.${var.domain_name}"
        ] : [
        "https://${var.domain_name}",
        "https://www.${var.domain_name}",
        "http://localhost:3000"
      ]
      ) : (
      var.environment == "prod" ? [
        "https://${aws_cloudfront_distribution.website.domain_name}"
        ] : [
        "https://${aws_cloudfront_distribution.website.domain_name}",
        "http://localhost:3000"
      ]
    )
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# Lifecycle rules for media bucket
resource "aws_s3_bucket_lifecycle_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    # Exclude staging files from IA transition (they get moved to finished quickly)
    filter {
      prefix = "finished/"
    }

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_expiration {
      noncurrent_days = 365
    }
  }

  # Auto-cleanup staging files that weren't processed (safety net)
  rule {
    id     = "staging-cleanup"
    status = "Enabled"

    filter {
      prefix = "staging/"
    }

    # If a file sits in staging for 7 days without being processed,
    # something went wrong - expire it to prevent orphaned files
    expiration {
      days = 7
    }
  }
}

# Logging bucket (optional)
resource "aws_s3_bucket" "logs" {
  count  = var.enable_cloudfront_logging ? 1 : 0
  bucket = "${local.name_prefix}-logs"

  tags = {
    Name = "${local.name_prefix}-logs"
  }
}

resource "aws_s3_bucket_ownership_controls" "logs" {
  count  = var.enable_cloudfront_logging ? 1 : 0
  bucket = aws_s3_bucket.logs[0].id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "logs" {
  count      = var.enable_cloudfront_logging ? 1 : 0
  depends_on = [aws_s3_bucket_ownership_controls.logs]
  bucket     = aws_s3_bucket.logs[0].id
  acl        = "log-delivery-write"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  count  = var.enable_cloudfront_logging ? 1 : 0
  bucket = aws_s3_bucket.logs[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "logs" {
  count  = var.enable_cloudfront_logging ? 1 : 0
  bucket = aws_s3_bucket.logs[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  count  = var.enable_cloudfront_logging ? 1 : 0
  bucket = aws_s3_bucket.logs[0].id

  rule {
    id     = "expire-old-logs"
    status = "Enabled"

    filter {}

    expiration {
      days = 365
    }
  }
}
