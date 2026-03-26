# Pitfal Solutions - CloudFront Distribution

# Origin Access Control for S3
resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "${local.name_prefix}-website-oac"
  description                       = "OAC for website S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_origin_access_control" "media" {
  name                              = "${local.name_prefix}-media-oac"
  description                       = "OAC for media S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Response headers policy for security
resource "aws_cloudfront_response_headers_policy" "security" {
  name = "${local.name_prefix}-security-headers"

  security_headers_config {
    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }
  }

  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = "camera=(), microphone=(), geolocation=()"
      override = true
    }
  }
}

# Cache policy for static assets
resource "aws_cloudfront_cache_policy" "static_assets" {
  name        = "${local.name_prefix}-static-assets"
  min_ttl     = 86400    # 1 day
  default_ttl = 604800   # 7 days
  max_ttl     = 31536000 # 1 year

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# /portfolio/viewer redirects depend on query string — include all query params in cache key
resource "aws_cloudfront_cache_policy" "viewer_querystring" {
  name        = "${local.name_prefix}-viewer-querystring"
  min_ttl     = 0
  default_ttl = 86400
  max_ttl     = 604800

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "all"
    }
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# Cache policy for media (longer cache)
resource "aws_cloudfront_cache_policy" "media" {
  name        = "${local.name_prefix}-media"
  min_ttl     = 604800   # 7 days
  default_ttl = 2592000  # 30 days
  max_ttl     = 31536000 # 1 year

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "whitelist"
      query_strings {
        items = ["v"] # Version parameter for cache busting
      }
    }
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# Use AWS managed CachingDisabled policy for API
# Managed policy ID: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad
# Custom cache policies with TTL=0 cannot whitelist headers

# Origin request policy for API (forward Content-Type)
resource "aws_cloudfront_origin_request_policy" "api" {
  name = "${local.name_prefix}-api-origin-request"

  cookies_config {
    cookie_behavior = "all"
  }
  headers_config {
    header_behavior = "whitelist"
    headers {
      items = ["Content-Type", "Origin", "Accept", "X-Requested-With"]
    }
  }
  query_strings_config {
    query_string_behavior = "all"
  }
}

# CloudFront Function to rewrite URLs for static site routing
# e.g., /admin → /admin/index.html
resource "aws_cloudfront_function" "url_rewrite" {
  name    = "${local.name_prefix}-url-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Rewrite URLs to append /index.html for directory paths"
  publish = true
  code    = <<-EOF
    function handler(event) {
      var request = event.request;
      var host = request.headers.host.value;

      // Redirect non-www to www (301 permanent)
      if (host === 'pitfal.solutions') {
        return {
          statusCode: 301,
          statusDescription: 'Moved Permanently',
          headers: {
            location: { value: 'https://www.pitfal.solutions' + request.uri }
          }
        };
      }

      var uri = request.uri;

      // Consolidate /portfolio/viewer?category=&slug= onto canonical /portfolio/{cat}/{slug}/
      // Bare /portfolio/viewer/ → /portfolio/ (avoids soft-404 thin HTML for crawlers)
      if (uri === '/portfolio/viewer' || uri === '/portfolio/viewer/') {
        var q = request.querystring || {};
        var cat = (q.category && q.category.value) ? q.category.value : '';
        var slug = (q.slug && q.slug.value) ? q.slug.value : '';
        var allowedCat = { brands: 1, portraits: 1, events: 1, videography: 1, drone: 1, ai: 1 };
        if (cat && slug && allowedCat[cat]) {
          return {
            statusCode: 301,
            statusDescription: 'Moved Permanently',
            headers: {
              location: {
                value: 'https://' + host + '/portfolio/' + encodeURIComponent(cat) + '/' + encodeURIComponent(slug) + '/'
              }
            }
          };
        }
        return {
          statusCode: 301,
          statusDescription: 'Moved Permanently',
          headers: {
            location: { value: 'https://' + host + '/portfolio/' }
          }
        };
      }

      // If URI has a file extension, serve static assets as-is
      // but block non-static extensions (e.g. .php, .asp, .env) that are bot probes
      if (uri.includes('.')) {
        var allowed = /\.(html|css|js|json|xml|txt|ico|svg|png|jpg|jpeg|gif|webp|avif|woff2?|ttf|eot|map|webmanifest)$/i;
        if (!allowed.test(uri)) {
          return {
            statusCode: 404,
            statusDescription: 'Not Found',
            headers: { 'content-type': { value: 'text/plain' } },
            body: { encoding: 'text', data: 'Not Found' }
          };
        }
        return request;
      }

      // Legacy Squarespace / old site URLs → 301 to current equivalents (Search Console consolidation)
      var lookupUri = uri.endsWith('/') && uri.length > 1 ? uri.slice(0, -1) : uri;

      if (lookupUri.indexOf('/weddings/') === 0 || lookupUri === '/weddings') {
        return {
          statusCode: 301,
          statusDescription: 'Moved Permanently',
          headers: {
            location: { value: 'https://' + host + '/portfolio/events/' }
          }
        };
      }

      var legacy301 = {
        '/cart': '/contact/',
        '/pricing': '/services/',
        '/advertising': '/services/photography/',
        '/events': '/portfolio/events/',
        '/brands/restaurants': '/portfolio/brands/',
        '/photography-videography': '/services/',
        '/portraits/candid-photos': '/portfolio/portraits/',
        '/portraits/family-photos': '/portfolio/portraits/',
        '/portraits/group-photos': '/portfolio/portraits/',
        '/portraits/couples-photos': '/portfolio/portraits/',
        '/portraits/individual-photos': '/portfolio/portraits/'
      };
      if (legacy301[lookupUri]) {
        return {
          statusCode: 301,
          statusDescription: 'Moved Permanently',
          headers: {
            location: { value: 'https://' + host + legacy301[lookupUri] }
          }
        };
      }

      // Block bogus clean URLs by validating the first path segment
      // Only known routes pass through; random bot paths get a real 404
      var validPaths = /^\/(about|admin|blog|client|contact|faq|portfolio|privacy|services|terms|_next|favicon|404)?(\/|$)/;
      if (!validPaths.test(uri)) {
        return {
          statusCode: 404,
          statusDescription: 'Not Found',
          headers: { 'content-type': { value: 'text/plain' } },
          body: { encoding: 'text', data: 'Not Found' }
        };
      }

      // If URI ends with /, append index.html
      if (uri.endsWith('/')) {
        request.uri = uri + 'index.html';
      } else {
        // Append /index.html for clean URLs
        request.uri = uri + '/index.html';
      }

      return request;
    }
  EOF
}

# CloudFront Function to strip /media prefix for S3 media origin
# Requests come in as /media/finished/gallery/image.jpg
# S3 keys are finished/gallery/image.jpg (no /media prefix)
resource "aws_cloudfront_function" "media_path_rewrite" {
  name    = "${local.name_prefix}-media-path-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Strip /media prefix so S3 keys match"
  publish = true
  code    = <<-EOF
    function handler(event) {
      var request = event.request;
      request.uri = request.uri.replace(/^\/media/, '');
      return request;
    }
  EOF
}

# Main CloudFront distribution
resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Pitfal Solutions Website"
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class
  aliases             = var.use_custom_domain ? [var.domain_name, "www.${var.domain_name}"] : []
  web_acl_id          = var.enable_waf ? aws_wafv2_web_acl.cloudfront[0].arn : null
  wait_for_deployment = false

  # Website S3 origin
  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "S3-Website"
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
  }

  # Media S3 origin
  origin {
    domain_name              = aws_s3_bucket.media.bucket_regional_domain_name
    origin_id                = "S3-Media"
    origin_access_control_id = aws_cloudfront_origin_access_control.media.id
  }

  # API Gateway origin
  origin {
    domain_name = replace(aws_api_gateway_stage.main.invoke_url, "/^https?:\\/\\/([^\\/]+).*$/", "$1")
    origin_id   = "API-Gateway"
    origin_path = "/${var.environment}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default behavior (website)
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-Website"

    cache_policy_id            = aws_cloudfront_cache_policy.static_assets.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.url_rewrite.arn
    }
  }

  # Client gallery pages — Lambda@Edge injects OG meta tags for link previews
  # URL pattern: /client/?id={galleryId}
  ordered_cache_behavior {
    path_pattern     = "/client*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-Website"

    cache_policy_id            = aws_cloudfront_cache_policy.static_assets.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    lambda_function_association {
      event_type   = "viewer-request"
      lambda_arn   = aws_lambda_function.og_injector.qualified_arn
      include_body = false
    }
  }

  # Portfolio gallery detail pages — Lambda@Edge injects OG meta tags for link previews
  # Matches /portfolio/{category}/{slug} but NOT /portfolio/{category} (single segment)
  ordered_cache_behavior {
    path_pattern     = "/portfolio/*/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-Website"

    cache_policy_id            = aws_cloudfront_cache_policy.static_assets.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    lambda_function_association {
      event_type   = "viewer-request"
      lambda_arn   = aws_lambda_function.og_injector.qualified_arn
      include_body = false
    }
  }

  # Query-param redirects for /portfolio/viewer — cache key must include query string
  ordered_cache_behavior {
    path_pattern     = "/portfolio/viewer*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-Website"

    cache_policy_id            = aws_cloudfront_cache_policy.viewer_querystring.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.url_rewrite.arn
    }
  }

  # Media files behavior
  ordered_cache_behavior {
    path_pattern     = "/media/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-Media"

    cache_policy_id            = aws_cloudfront_cache_policy.media.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.media_path_rewrite.arn
    }
  }

  # API behavior
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "API-Gateway"

    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # AWS Managed CachingDisabled
    origin_request_policy_id = aws_cloudfront_origin_request_policy.api.id

    viewer_protocol_policy = "https-only"
  }

  # Custom error responses - SPA fallback so client-side routes work on direct URL access
  # Next.js client router handles the route once index.html loads
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Use ACM certificate when custom domain is enabled, otherwise use CloudFront default certificate
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

  # Optional logging
  dynamic "logging_config" {
    for_each = var.enable_cloudfront_logging ? [1] : []
    content {
      include_cookies = false
      bucket          = aws_s3_bucket.logs[0].bucket_domain_name
      prefix          = "cloudfront/"
    }
  }

  tags = {
    Name = "${local.name_prefix}-distribution"
  }
}
