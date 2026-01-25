# Pitfal Solutions - ACM SSL Certificate
# Certificate must be in us-east-1 for CloudFront

resource "aws_acm_certificate" "main" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = var.subject_alternative_names

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${local.name_prefix}-certificate"
  }
}

# DNS validation records (only if Route53 zone is provided)
resource "aws_route53_record" "cert_validation" {
  for_each = var.route53_zone_id != "" ? {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.route53_zone_id
}

# Certificate validation
resource "aws_acm_certificate_validation" "main" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = var.route53_zone_id != "" ? [for record in aws_route53_record.cert_validation : record.fqdn] : []

  # If DNS is managed externally, you'll need to add records manually
  # before this validation can complete
  lifecycle {
    create_before_destroy = true
  }
}

# Output validation records for manual DNS setup
output "certificate_validation_records" {
  description = "DNS records required for certificate validation (add these if DNS is managed externally)"
  value = var.route53_zone_id == "" ? {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  } : {}
}
