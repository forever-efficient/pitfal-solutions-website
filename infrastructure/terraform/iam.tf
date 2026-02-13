# Pitfal Solutions - IAM Roles and Policies

# ─────────────────────────────────────────────
# Contact Lambda Role (least-privilege)
# ─────────────────────────────────────────────

resource "aws_iam_role" "lambda_execution" {
  name = "${local.name_prefix}-contact-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# CloudWatch Logs policy
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB policy - scoped to inquiries table only (contact form + rate limiting)
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "${local.name_prefix}-contact-dynamodb"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.inquiries.arn,
          "${aws_dynamodb_table.inquiries.arn}/index/*"
        ]
      }
    ]
  })
}

# SES policy - restricted to verified domain and sender address
resource "aws_iam_role_policy" "lambda_ses" {
  name = "${local.name_prefix}-contact-ses"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "arn:aws:ses:${var.aws_region}:*:identity/${var.domain_name}"
        Condition = {
          StringEquals = {
            "ses:FromAddress" = var.from_email
          }
        }
      }
    ]
  })
}

# API Gateway CloudWatch logging role
resource "aws_iam_role" "api_gateway_cloudwatch" {
  name = "${local.name_prefix}-api-gateway-cloudwatch"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch" {
  role       = aws_iam_role.api_gateway_cloudwatch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

# SQS Dead Letter Queue policy for Lambda
resource "aws_iam_role_policy" "lambda_dlq" {
  name = "${local.name_prefix}-lambda-dlq"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = aws_sqs_queue.lambda_dlq.arn
      }
    ]
  })
}

# ─────────────────────────────────────────────
# Client Auth Lambda Role
# ─────────────────────────────────────────────

resource "aws_iam_role" "client_auth_lambda" {
  name = "${local.name_prefix}-client-auth-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "client_auth_logs" {
  role       = aws_iam_role.client_auth_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "client_auth_dynamodb" {
  name = "${local.name_prefix}-client-auth-dynamodb"
  role = aws_iam_role.client_auth_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["dynamodb:GetItem"]
        Resource = [aws_dynamodb_table.galleries.arn]
      },
      {
        Effect = "Allow"
        Action = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
        Resource = [aws_dynamodb_table.admin.arn]
      }
    ]
  })
}

resource "aws_iam_role_policy" "client_auth_dlq" {
  name = "${local.name_prefix}-client-auth-dlq"
  role = aws_iam_role.client_auth_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sqs:SendMessage"]
      Resource = aws_sqs_queue.lambda_dlq.arn
    }]
  })
}

# ─────────────────────────────────────────────
# Client Gallery Lambda Role
# ─────────────────────────────────────────────

resource "aws_iam_role" "client_gallery_lambda" {
  name = "${local.name_prefix}-client-gallery-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "client_gallery_logs" {
  role       = aws_iam_role.client_gallery_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "client_gallery_dynamodb" {
  name = "${local.name_prefix}-client-gallery-dynamodb"
  role = aws_iam_role.client_gallery_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["dynamodb:GetItem"]
        Resource = [aws_dynamodb_table.galleries.arn]
      },
      {
        Effect = "Allow"
        Action = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query"]
        Resource = [aws_dynamodb_table.admin.arn]
      }
    ]
  })
}

resource "aws_iam_role_policy" "client_gallery_s3" {
  name = "${local.name_prefix}-client-gallery-s3"
  role = aws_iam_role.client_gallery_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = "${aws_s3_bucket.media.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.media.arn
      }
    ]
  })
}

resource "aws_iam_role_policy" "client_gallery_dlq" {
  name = "${local.name_prefix}-client-gallery-dlq"
  role = aws_iam_role.client_gallery_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sqs:SendMessage"]
      Resource = aws_sqs_queue.lambda_dlq.arn
    }]
  })
}

# ─────────────────────────────────────────────
# Admin Lambda Role
# ─────────────────────────────────────────────

resource "aws_iam_role" "admin_lambda" {
  name = "${local.name_prefix}-admin-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "admin_logs" {
  role       = aws_iam_role.admin_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "admin_dynamodb" {
  name = "${local.name_prefix}-admin-dynamodb"
  role = aws_iam_role.admin_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.admin.arn,
          "${aws_dynamodb_table.admin.arn}/index/*",
          aws_dynamodb_table.galleries.arn,
          "${aws_dynamodb_table.galleries.arn}/index/*",
          aws_dynamodb_table.inquiries.arn,
          "${aws_dynamodb_table.inquiries.arn}/index/*",
          aws_dynamodb_table.bookings.arn,
          "${aws_dynamodb_table.bookings.arn}/index/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "admin_s3" {
  name = "${local.name_prefix}-admin-s3"
  role = aws_iam_role.admin_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
      Resource = "${aws_s3_bucket.media.arn}/*"
    }]
  })
}

resource "aws_iam_role_policy" "admin_ses" {
  name = "${local.name_prefix}-admin-ses"
  role = aws_iam_role.admin_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ses:SendEmail", "ses:SendRawEmail"]
      Resource = "arn:aws:ses:${var.aws_region}:*:identity/${var.domain_name}"
      Condition = {
        StringEquals = {
          "ses:FromAddress" = var.from_email
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "admin_dlq" {
  name = "${local.name_prefix}-admin-dlq"
  role = aws_iam_role.admin_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sqs:SendMessage"]
      Resource = aws_sqs_queue.lambda_dlq.arn
    }]
  })
}
