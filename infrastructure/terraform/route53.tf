# Pitfal Solutions - Route53 DNS Configuration
# Only created if route53_zone_id is provided

# A record for root domain
resource "aws_route53_record" "root" {
  count   = var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}

# AAAA record for root domain (IPv6)
resource "aws_route53_record" "root_ipv6" {
  count   = var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}

# A record for www subdomain
resource "aws_route53_record" "www" {
  count   = var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}

# AAAA record for www subdomain (IPv6)
resource "aws_route53_record" "www_ipv6" {
  count   = var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = "www.${var.domain_name}"
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}

# Output DNS configuration for external DNS management
output "dns_configuration" {
  description = "DNS records to configure (if managing DNS externally)"
  value = var.route53_zone_id == "" ? {
    root_domain = {
      name  = var.domain_name
      type  = "CNAME"
      value = aws_cloudfront_distribution.website.domain_name
    }
    www_subdomain = {
      name  = "www.${var.domain_name}"
      type  = "CNAME"
      value = aws_cloudfront_distribution.website.domain_name
    }
  } : null
}
