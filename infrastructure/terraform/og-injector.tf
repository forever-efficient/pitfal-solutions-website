# ─────────────────────────────────────────────
# OG Injector Lambda@Edge
# ─────────────────────────────────────────────
# Intercepts gallery page requests from social media crawlers (iMessage, Facebook, etc.)
# and returns a minimal HTML page with Open Graph meta tags for rich link previews.
# Deployed in us-east-1 (CloudFront requirement), queries DynamoDB in us-west-2.

# ─────────────────────────────────────────────
# Build + Package
# ─────────────────────────────────────────────

resource "null_resource" "og_injector_build" {
  triggers = {
    source_hash  = filesha256("${path.module}/../../lambda/og-injector/index.ts")
    package_hash = filesha256("${path.module}/../../lambda/og-injector/package.json")
  }

  provisioner "local-exec" {
    command     = "cd ${path.module}/../../lambda/og-injector && npm ci --ignore-scripts && npm run build"
    interpreter = ["bash", "-c"]
  }
}

data "archive_file" "og_injector" {
  type        = "zip"
  source_dir  = "${path.module}/../../lambda/og-injector/dist"
  output_path = "${path.module}/builds/og-injector.zip"
  depends_on  = [null_resource.og_injector_build]
}

# ─────────────────────────────────────────────
# IAM Role
# ─────────────────────────────────────────────

resource "aws_iam_role" "og_injector" {
  name = "${local.name_prefix}-og-injector"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = ["lambda.amazonaws.com", "edgelambda.amazonaws.com"]
      }
    }]
  })

  tags = local.common_tags
}

# CloudWatch Logs — Lambda@Edge creates log groups in every edge region
resource "aws_iam_role_policy" "og_injector_logs" {
  name = "cloudwatch-logs"
  role = aws_iam_role.og_injector.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "arn:aws:logs:*:*:*"
    }]
  })
}

# DynamoDB read access to galleries table + slug-index GSI
resource "aws_iam_role_policy" "og_injector_dynamodb" {
  name = "dynamodb-read"
  role = aws_iam_role.og_injector.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["dynamodb:GetItem", "dynamodb:Query"]
      Resource = [
        aws_dynamodb_table.galleries.arn,
        "${aws_dynamodb_table.galleries.arn}/index/slug-index"
      ]
    }]
  })
}

# ─────────────────────────────────────────────
# Lambda Function (us-east-1 for CloudFront)
# ─────────────────────────────────────────────

resource "aws_lambda_function" "og_injector" {
  provider = aws.us_east_1

  function_name    = "${local.name_prefix}-og-injector"
  filename         = data.archive_file.og_injector.output_path
  source_code_hash = data.archive_file.og_injector.output_base64sha256
  handler          = "index.handler"
  runtime          = var.lambda_runtime
  role             = aws_iam_role.og_injector.arn
  memory_size      = 128
  timeout          = 5
  publish          = true # Lambda@Edge requires published versions

  tags = local.common_tags
}
