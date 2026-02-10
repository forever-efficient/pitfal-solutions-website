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
