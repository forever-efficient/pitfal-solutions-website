# Pitfal Solutions - Lambda Functions

# Archive for Lambda deployment packages
data "archive_file" "contact" {
  type        = "zip"
  source_dir  = "${path.module}/../../lambda/contact"
  output_path = "${path.module}/builds/contact.zip"
}

data "archive_file" "shared" {
  type        = "zip"
  source_dir  = "${path.module}/../../lambda/shared"
  output_path = "${path.module}/builds/shared.zip"
}

# Dead Letter Queue for failed Lambda invocations
resource "aws_sqs_queue" "lambda_dlq" {
  name                       = "${local.name_prefix}-lambda-dlq"
  message_retention_seconds  = 1209600 # 14 days
  visibility_timeout_seconds = 300

  tags = {
    Name = "${local.name_prefix}-lambda-dlq"
  }
}

# DLQ policy to allow Lambda to send messages
resource "aws_sqs_queue_policy" "lambda_dlq" {
  queue_url = aws_sqs_queue.lambda_dlq.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowLambdaDLQ"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.lambda_dlq.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${local.name_prefix}-*"
          }
        }
      }
    ]
  })
}

# Contact Lambda function
resource "aws_lambda_function" "contact" {
  function_name    = "${local.name_prefix}-contact"
  filename         = data.archive_file.contact.output_path
  source_code_hash = data.archive_file.contact.output_base64sha256
  handler          = "index.handler"
  runtime          = var.lambda_runtime
  role             = aws_iam_role.lambda_execution.arn
  memory_size      = var.lambda_memory_size
  timeout          = var.lambda_timeout

  # Limit concurrent executions to control costs and protect downstream services
  reserved_concurrent_executions = var.lambda_reserved_concurrency

  # Dead letter queue for failed invocations
  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }

  environment {
    variables = {
      INQUIRIES_TABLE = aws_dynamodb_table.inquiries.name
      FROM_EMAIL      = var.from_email
      CONTACT_EMAIL   = var.contact_email
      ENVIRONMENT     = var.environment
    }
  }

  layers = [aws_lambda_layer_version.shared.arn]

  tags = {
    Name = "${local.name_prefix}-contact"
  }
}

# CloudWatch Log Group for Contact Lambda
resource "aws_cloudwatch_log_group" "contact" {
  name              = "/aws/lambda/${aws_lambda_function.contact.function_name}"
  retention_in_days = 14
}

# Shared Lambda Layer
resource "aws_lambda_layer_version" "shared" {
  layer_name          = "${local.name_prefix}-shared"
  filename            = data.archive_file.shared.output_path
  source_code_hash    = data.archive_file.shared.output_base64sha256
  compatible_runtimes = [var.lambda_runtime]

  description = "Shared utilities for Pitfal Solutions Lambda functions"
}

# Lambda permission for API Gateway - restricted to contact endpoint
resource "aws_lambda_permission" "contact_api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.contact.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/${aws_api_gateway_method.contact_post.http_method}${aws_api_gateway_resource.contact.path}"
}
