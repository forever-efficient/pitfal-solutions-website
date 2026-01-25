# Pitfal Solutions - SES Email Configuration

# SES Domain Identity
resource "aws_ses_domain_identity" "main" {
  domain = var.domain_name
}

# SES Domain DKIM
resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

# Route53 records for SES verification (if zone provided)
resource "aws_route53_record" "ses_verification" {
  count   = var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = "_amazonses.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.main.verification_token]
}

# Route53 records for DKIM (if zone provided)
resource "aws_route53_record" "ses_dkim" {
  count   = var.route53_zone_id != "" ? 3 : 0
  zone_id = var.route53_zone_id
  name    = "${aws_ses_domain_dkim.main.dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.main.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

# SES Domain Mail From
resource "aws_ses_domain_mail_from" "main" {
  domain           = aws_ses_domain_identity.main.domain
  mail_from_domain = "mail.${var.domain_name}"
}

# Route53 MX record for Mail From (if zone provided)
resource "aws_route53_record" "ses_mail_from_mx" {
  count   = var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = aws_ses_domain_mail_from.main.mail_from_domain
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.${var.aws_region}.amazonses.com"]
}

# Route53 TXT record for SPF (if zone provided)
resource "aws_route53_record" "ses_mail_from_txt" {
  count   = var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = aws_ses_domain_mail_from.main.mail_from_domain
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}

# Output SES configuration for external DNS management
output "ses_dns_records" {
  description = "DNS records required for SES verification (add these if DNS is managed externally)"
  value = var.route53_zone_id == "" ? {
    verification = {
      name  = "_amazonses.${var.domain_name}"
      type  = "TXT"
      value = aws_ses_domain_identity.main.verification_token
    }
    dkim = [for i, token in aws_ses_domain_dkim.main.dkim_tokens : {
      name  = "${token}._domainkey.${var.domain_name}"
      type  = "CNAME"
      value = "${token}.dkim.amazonses.com"
    }]
    mail_from_mx = {
      name  = "mail.${var.domain_name}"
      type  = "MX"
      value = "10 feedback-smtp.${var.aws_region}.amazonses.com"
    }
    mail_from_spf = {
      name  = "mail.${var.domain_name}"
      type  = "TXT"
      value = "v=spf1 include:amazonses.com ~all"
    }
  } : null
}

# Note: SES starts in sandbox mode. To send to unverified recipients,
# you must request production access in the AWS Console:
# https://console.aws.amazon.com/ses/home#/account
