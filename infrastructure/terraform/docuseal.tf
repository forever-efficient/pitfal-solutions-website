# Pitfal Solutions - DocuSeal Document Signing Infrastructure
# Self-hosted DocuSeal on Lightsail with CloudFront + S3 document storage

# =============================================================================
# ALWAYS-ON RESOURCES (no count condition)
# =============================================================================

# -----------------------------------------------------------------------------
# S3 Bucket for document storage
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "documents" {
  bucket = "${local.name_prefix}-documents"
  tags   = { Name = "${local.name_prefix}-documents" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket                  = aws_s3_bucket.documents.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# -----------------------------------------------------------------------------
# IAM user for DocuSeal S3 access
# -----------------------------------------------------------------------------

resource "aws_iam_user" "docuseal_s3" {
  name = "${local.name_prefix}-docuseal-s3"
  tags = { Name = "${local.name_prefix}-docuseal-s3" }
}

resource "aws_iam_user_policy" "docuseal_s3" {
  name = "${local.name_prefix}-docuseal-s3"
  user = aws_iam_user.docuseal_s3.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
      Resource = [
        aws_s3_bucket.documents.arn,
        "${aws_s3_bucket.documents.arn}/*"
      ]
    }]
  })
}

resource "aws_iam_access_key" "docuseal_s3" {
  user = aws_iam_user.docuseal_s3.name
}

# -----------------------------------------------------------------------------
# SES SMTP IAM user
# -----------------------------------------------------------------------------

resource "aws_iam_user" "docuseal_ses" {
  name = "${local.name_prefix}-docuseal-ses-smtp"
  tags = { Name = "${local.name_prefix}-docuseal-ses-smtp" }
}

resource "aws_iam_user_policy" "docuseal_ses" {
  name = "${local.name_prefix}-docuseal-ses"
  user = aws_iam_user.docuseal_ses.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ses:SendEmail", "ses:SendRawEmail"]
      Resource = [
        "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:identity/${var.domain_name}",
        "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:identity/*@${var.domain_name}"
      ]
    }]
  })
}

resource "aws_iam_access_key" "docuseal_ses" {
  user = aws_iam_user.docuseal_ses.name
}

# -----------------------------------------------------------------------------
# Secret key for DocuSeal
# -----------------------------------------------------------------------------

resource "random_password" "docuseal_secret" {
  length  = 64
  special = false
}

# -----------------------------------------------------------------------------
# SSM Parameters for DocuSeal operation state
# -----------------------------------------------------------------------------

resource "aws_ssm_parameter" "docuseal_operation" {
  name  = "/pitfal/docuseal-operation"
  type  = "String"
  value = jsonencode({ state = "off", operationId = "", timestamp = "" })

  lifecycle {
    ignore_changes = [value] # Lambda manages this at runtime
  }

  tags = { Name = "${local.name_prefix}-docuseal-operation" }
}

# -----------------------------------------------------------------------------
# CloudFront Function: X-Forwarded headers for DocuSeal
# -----------------------------------------------------------------------------

resource "aws_cloudfront_function" "docuseal_headers" {
  name    = "${local.name_prefix}-docuseal-headers"
  runtime = "cloudfront-js-2.0"
  comment = "Set CloudFront-Forwarded-Proto header so Rails knows request is HTTPS"
  publish = true
  code = <<-EOF
function handler(event) {
  var request = event.request;
  request.headers['cloudfront-forwarded-proto'] = { value: 'https' };
  return request;
}
EOF
}

# -----------------------------------------------------------------------------
# CloudFront Function: Offline page (synthetic response)
# -----------------------------------------------------------------------------

resource "aws_cloudfront_function" "docuseal_offline" {
  name    = "${local.name_prefix}-docuseal-offline"
  runtime = "cloudfront-js-2.0"
  comment = "Return offline page when DocuSeal is unavailable"
  publish = true
  code = <<-EOF
function handler(event) {
  return {
    statusCode: 200,
    statusDescription: 'OK',
    headers: {
      'content-type': { value: 'text/html; charset=UTF-8' },
      'cache-control': { value: 'no-cache' }
    },
    body: {
      encoding: 'text',
      data: '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Document Signing - Pitfal Solutions</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f5f4;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#1c1917}.card{background:white;border-radius:12px;padding:48px;max-width:480px;width:90%;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.1)}.icon{width:48px;height:48px;margin:0 auto 24px;color:#a8a29e}h1{font-size:24px;font-weight:700;margin-bottom:12px}p{color:#78716c;line-height:1.6;margin-bottom:24px}a{color:#1c1917;text-decoration:none;font-weight:500;border-bottom:1px solid #d6d3d1}a:hover{border-color:#1c1917}</style></head><body><div class="card"><svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg><h1>Signing Unavailable</h1><p>The document signing portal is currently offline. If you have a document to sign, please contact me and I will enable access for you.</p><a href="https://www.pitfal.solutions/contact">Contact Pitfal Solutions</a></div></body></html>'
    }
  };
}
EOF
}

# -----------------------------------------------------------------------------
# CloudFront Origin Request Policy for DocuSeal
# -----------------------------------------------------------------------------

resource "aws_cloudfront_origin_request_policy" "docuseal" {
  name = "${local.name_prefix}-docuseal-origin-request"

  cookies_config {
    cookie_behavior = "all"
  }
  headers_config {
    header_behavior = "whitelist"
    headers {
      items = [
        "Accept",
        "Accept-Language",
        "Content-Type",
        "Host",
        "Origin",
        "Referer",
        "Turbo-Frame",
        "X-CSRF-Token",
        "X-Requested-With",
      ]
    }
  }
  query_strings_config {
    query_string_behavior = "all"
  }
}

# -----------------------------------------------------------------------------
# CloudFront Distribution for sign.pitfal.solutions
# -----------------------------------------------------------------------------

resource "aws_cloudfront_distribution" "docuseal" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Pitfal Solutions DocuSeal Signing Portal"
  price_class         = var.cloudfront_price_class
  aliases             = var.use_custom_domain ? ["sign.${var.domain_name}"] : []
  wait_for_deployment = false

  # DocuSeal origin (Lightsail via DNS)
  origin {
    domain_name = "docuseal-origin.${var.domain_name}"
    origin_id   = "DocuSeal"

    custom_origin_config {
      http_port              = 3000
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    custom_header {
      name  = "X-Forwarded-Proto"
      value = "https"
    }

    custom_header {
      name  = "X-Forwarded-Port"
      value = "443"
    }
  }

  # Default behavior → DocuSeal
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "DocuSeal"

    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    origin_request_policy_id = aws_cloudfront_origin_request_policy.docuseal.id

    viewer_protocol_policy = "redirect-to-https"
  }

  # Offline page behavior → synthetic response via CloudFront Function
  ordered_cache_behavior {
    path_pattern     = "/docuseal-offline.html"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "DocuSeal"

    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized

    viewer_protocol_policy = "redirect-to-https"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.docuseal_offline.arn
    }
  }

  # Custom error responses for when DocuSeal is down
  custom_error_response {
    error_code            = 502
    response_code         = 200
    response_page_path    = "/docuseal-offline.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 503
    response_code         = 200
    response_page_path    = "/docuseal-offline.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  dynamic "viewer_certificate" {
    for_each = var.use_custom_domain ? [1] : []
    content {
      acm_certificate_arn      = aws_acm_certificate_validation.main[0].certificate_arn
      ssl_support_method       = "sni-only"
      minimum_protocol_version = "TLSv1.2_2021"
    }
  }

  dynamic "viewer_certificate" {
    for_each = var.use_custom_domain ? [] : [1]
    content {
      cloudfront_default_certificate = true
    }
  }

  tags = {
    Name = "${local.name_prefix}-docuseal-distribution"
  }
}

# -----------------------------------------------------------------------------
# Route 53: sign.pitfal.solutions → CloudFront (always-on)
# -----------------------------------------------------------------------------

resource "aws_route53_record" "docuseal_sign" {
  count   = var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = "sign.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.docuseal.domain_name
    zone_id                = aws_cloudfront_distribution.docuseal.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "docuseal_sign_ipv6" {
  count   = var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = "sign.${var.domain_name}"
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.docuseal.domain_name
    zone_id                = aws_cloudfront_distribution.docuseal.hosted_zone_id
    evaluate_target_health = false
  }
}

# =============================================================================
# CONDITIONAL RESOURCES (only when enable_docuseal = true)
# =============================================================================

# -----------------------------------------------------------------------------
# Lightsail instance running DocuSeal
# -----------------------------------------------------------------------------

resource "aws_lightsail_instance" "docuseal" {
  count             = var.enable_docuseal ? 1 : 0
  name              = "${local.name_prefix}-docuseal"
  availability_zone = "${var.aws_region}a"
  blueprint_id      = "ubuntu_22_04"
  bundle_id         = "nano_3_0"

  user_data = <<-USERDATA
#!/bin/bash
set -e

# Create 1GB swap (Nano has only 512MB RAM)
fallocate -l 1G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Create docker-compose.yml
mkdir -p /opt/docuseal
cat > /opt/docuseal/docker-compose.yml <<'COMPOSE'
services:
  docuseal:
    image: docuseal/docuseal:${var.docuseal_version}
    ports:
      - "3000:3000"
    volumes:
      - /data:/data
      - /opt/docuseal/assume_ssl.rb:/app/config/initializers/assume_ssl.rb
    environment:
      - HOST=sign.${var.domain_name}
      - FORCE_SSL=false
      - SECRET_KEY_BASE=${random_password.docuseal_secret.result}
      - SMTP_ADDRESS=email-smtp.${var.aws_region}.amazonaws.com
      - SMTP_PORT=587
      - SMTP_USERNAME=${aws_iam_access_key.docuseal_ses.id}
      - SMTP_PASSWORD=${aws_iam_access_key.docuseal_ses.ses_smtp_password_v4}
      - SMTP_FROM=info@${var.domain_name}
      - SMTP_DOMAIN=${var.domain_name}
      - SMTP_AUTHENTICATION=login
      - AWS_ACCESS_KEY_ID=${aws_iam_access_key.docuseal_s3.id}
      - AWS_SECRET_ACCESS_KEY=${aws_iam_access_key.docuseal_s3.secret}
      - AWS_REGION=${var.aws_region}
      - S3_ATTACHMENTS_BUCKET=${aws_s3_bucket.documents.id}
    restart: always
COMPOSE

# Rails initializer: trust CloudFront proxy so X-Forwarded-Proto is respected
# Without this, Rails sees HTTP (CloudFront→origin) but browser sends Origin: https://
# causing ActionController::InvalidAuthenticityToken on POST requests
cat > /opt/docuseal/assume_ssl.rb <<'SSLFIX'
Rails.application.config.assume_ssl = true
Rails.application.config.action_dispatch.trusted_proxies = [IPAddr.new("0.0.0.0/0"), IPAddr.new("::/0")]
SSLFIX

# Start DocuSeal
cd /opt/docuseal
docker compose up -d
  USERDATA

  tags = {
    Name = "${local.name_prefix}-docuseal"
  }
}

# -----------------------------------------------------------------------------
# Lightsail firewall ports
# -----------------------------------------------------------------------------

resource "aws_lightsail_instance_public_ports" "docuseal" {
  count         = var.enable_docuseal ? 1 : 0
  instance_name = aws_lightsail_instance.docuseal[0].name

  port_info {
    protocol  = "tcp"
    from_port = 3000
    to_port   = 3000
  }

  port_info {
    protocol  = "tcp"
    from_port = 22
    to_port   = 22
  }
}

# -----------------------------------------------------------------------------
# Route 53: docuseal-origin.pitfal.solutions → Lightsail IP (conditional)
# -----------------------------------------------------------------------------

resource "aws_route53_record" "docuseal_origin" {
  count   = var.enable_docuseal && var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = "docuseal-origin.${var.domain_name}"
  type    = "A"
  ttl     = 60
  records = [aws_lightsail_instance.docuseal[0].public_ip_address]
}
