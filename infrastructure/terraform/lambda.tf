# Pitfal Solutions - Lambda Functions

# ─────────────────────────────────────────────
# Secrets
# ─────────────────────────────────────────────

resource "random_password" "gallery_token_secret" {
  length  = 64
  special = false
}

# ─────────────────────────────────────────────
# Lambda TypeScript Build Steps
# ─────────────────────────────────────────────
# Lambda functions are written in TypeScript and must be compiled before deployment.
# Triggers rebuild when source files change.

resource "null_resource" "shared_build" {
  triggers = {
    db_hash       = filesha256("${path.module}/../../lambda/shared/db.ts")
    email_hash    = filesha256("${path.module}/../../lambda/shared/email.ts")
    response_hash = filesha256("${path.module}/../../lambda/shared/response.ts")
    package_hash  = filesha256("${path.module}/../../lambda/shared/package.json")
  }

  provisioner "local-exec" {
    command     = "cd ${path.module}/../../lambda/shared && npm ci --ignore-scripts && npm run build"
    interpreter = ["bash", "-c"]
  }
}

resource "null_resource" "contact_build" {
  triggers = {
    source_hash  = filesha256("${path.module}/../../lambda/contact/index.ts")
    package_hash = filesha256("${path.module}/../../lambda/contact/package.json")
    # Rebuild contact when shared code changes (esbuild bundles shared imports)
    shared_hash  = null_resource.shared_build.id
  }

  provisioner "local-exec" {
    command     = "cd ${path.module}/../../lambda/contact && npm ci --ignore-scripts && npm run build"
    interpreter = ["bash", "-c"]
  }
}

# Archive compiled Lambda deployment packages
data "archive_file" "contact" {
  type        = "zip"
  source_dir  = "${path.module}/../../lambda/contact/dist"
  output_path = "${path.module}/builds/contact.zip"
  depends_on  = [null_resource.contact_build]
}

data "archive_file" "shared" {
  type        = "zip"
  source_dir  = "${path.module}/../../lambda/shared/dist"
  output_path = "${path.module}/builds/shared.zip"
  depends_on  = [null_resource.shared_build]
}

# Dead Letter Queue for failed Lambda invocations
resource "aws_sqs_queue" "lambda_dlq" {
  name                       = "${local.name_prefix}-lambda-dlq"
  message_retention_seconds  = 1209600 # 14 days
  visibility_timeout_seconds = 300
  sqs_managed_sse_enabled    = true

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
      INQUIRIES_TABLE      = aws_dynamodb_table.inquiries.name
      FROM_EMAIL           = var.from_email
      CONTACT_EMAIL        = var.contact_email
      ENVIRONMENT          = var.environment
      USE_CUSTOM_DOMAIN    = tostring(var.use_custom_domain)
      CUSTOM_DOMAIN        = var.domain_name
      CORS_ALLOWED_ORIGINS = var.use_custom_domain ? "https://${var.domain_name},https://www.${var.domain_name}" : "*"
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

# ─────────────────────────────────────────────
# Client Auth Lambda
# ─────────────────────────────────────────────

resource "null_resource" "client_auth_build" {
  triggers = {
    source_hash  = filesha256("${path.module}/../../lambda/client-auth/index.ts")
    package_hash = filesha256("${path.module}/../../lambda/client-auth/package.json")
    shared_hash  = null_resource.shared_build.id
  }

  provisioner "local-exec" {
    command     = "cd ${path.module}/../../lambda/client-auth && npm ci --ignore-scripts && npm run build"
    interpreter = ["bash", "-c"]
  }
}

data "archive_file" "client_auth" {
  type        = "zip"
  source_dir  = "${path.module}/../../lambda/client-auth/dist"
  output_path = "${path.module}/builds/client-auth.zip"
  depends_on  = [null_resource.client_auth_build]
}

resource "aws_lambda_function" "client_auth" {
  function_name    = "${local.name_prefix}-client-auth"
  filename         = data.archive_file.client_auth.output_path
  source_code_hash = data.archive_file.client_auth.output_base64sha256
  handler          = "index.handler"
  runtime          = var.lambda_runtime
  role             = aws_iam_role.client_auth_lambda.arn
  memory_size      = var.lambda_memory_size
  timeout          = var.lambda_timeout

  reserved_concurrent_executions = var.lambda_reserved_concurrency

  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }

  environment {
    variables = {
      GALLERIES_TABLE      = aws_dynamodb_table.galleries.name
      ADMIN_TABLE          = aws_dynamodb_table.admin.name
      GALLERY_TOKEN_SECRET = random_password.gallery_token_secret.result
      ENVIRONMENT          = var.environment
      CORS_ALLOWED_ORIGINS = var.use_custom_domain ? "https://${var.domain_name},https://www.${var.domain_name}" : "*"
    }
  }

  layers = [aws_lambda_layer_version.shared.arn]

  tags = {
    Name = "${local.name_prefix}-client-auth"
  }
}

resource "aws_cloudwatch_log_group" "client_auth" {
  name              = "/aws/lambda/${aws_lambda_function.client_auth.function_name}"
  retention_in_days = 14
}

resource "aws_lambda_permission" "client_auth_api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.client_auth.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# ─────────────────────────────────────────────
# Client Gallery Lambda
# ─────────────────────────────────────────────

# Sharp image processing Lambda Layer
resource "null_resource" "sharp_layer_build" {
  triggers = {
    build_script_hash = filesha256("${path.module}/../../lambda/layers/sharp/build.sh")
  }

  provisioner "local-exec" {
    command     = "cd ${path.module}/../../lambda/layers/sharp && bash build.sh"
    interpreter = ["bash", "-c"]
  }
}

data "archive_file" "sharp_layer" {
  type        = "zip"
  source_dir  = "${path.module}/../../lambda/layers/sharp/layer"
  output_path = "${path.module}/builds/sharp-layer.zip"
  depends_on  = [null_resource.sharp_layer_build]
}

resource "aws_lambda_layer_version" "sharp" {
  filename            = data.archive_file.sharp_layer.output_path
  source_code_hash    = data.archive_file.sharp_layer.output_base64sha256
  layer_name          = "${local.name_prefix}-sharp"
  compatible_runtimes = [var.lambda_runtime]
  description         = "Sharp image processing library for on-demand image resizing"
}

resource "null_resource" "client_gallery_build" {
  triggers = {
    source_hash  = filesha256("${path.module}/../../lambda/client-gallery/index.ts")
    package_hash = filesha256("${path.module}/../../lambda/client-gallery/package.json")
    shared_hash  = null_resource.shared_build.id
  }

  provisioner "local-exec" {
    command     = "cd ${path.module}/../../lambda/client-gallery && npm ci --ignore-scripts && npm run build"
    interpreter = ["bash", "-c"]
  }
}

data "archive_file" "client_gallery" {
  type        = "zip"
  source_dir  = "${path.module}/../../lambda/client-gallery/dist"
  output_path = "${path.module}/builds/client-gallery.zip"
  depends_on  = [null_resource.client_gallery_build]
}

resource "aws_lambda_function" "client_gallery" {
  function_name    = "${local.name_prefix}-client-gallery"
  filename         = data.archive_file.client_gallery.output_path
  source_code_hash = data.archive_file.client_gallery.output_base64sha256
  handler          = "index.handler"
  runtime          = var.lambda_runtime
  role             = aws_iam_role.client_gallery_lambda.arn
  memory_size      = 512  # Increased for sharp image processing
  timeout          = 60   # Increased for on-demand image resizing

  reserved_concurrent_executions = var.lambda_reserved_concurrency

  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }

  environment {
    variables = {
      GALLERIES_TABLE      = aws_dynamodb_table.galleries.name
      ADMIN_TABLE          = aws_dynamodb_table.admin.name
      MEDIA_BUCKET         = aws_s3_bucket.media.id
      GALLERY_TOKEN_SECRET = random_password.gallery_token_secret.result
      ENVIRONMENT          = var.environment
      CORS_ALLOWED_ORIGINS = var.use_custom_domain ? "https://${var.domain_name},https://www.${var.domain_name}" : "*"
    }
  }

  layers = [
    aws_lambda_layer_version.shared.arn,
    aws_lambda_layer_version.sharp.arn,
  ]

  tags = {
    Name = "${local.name_prefix}-client-gallery"
  }
}

resource "aws_cloudwatch_log_group" "client_gallery" {
  name              = "/aws/lambda/${aws_lambda_function.client_gallery.function_name}"
  retention_in_days = 14
}

resource "aws_lambda_permission" "client_gallery_api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.client_gallery.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# ─────────────────────────────────────────────
# Admin Lambda
# ─────────────────────────────────────────────

resource "null_resource" "admin_build" {
  triggers = {
    source_hash  = filesha256("${path.module}/../../lambda/admin/index.ts")
    package_hash = filesha256("${path.module}/../../lambda/admin/package.json")
    shared_hash  = null_resource.shared_build.id
  }

  provisioner "local-exec" {
    command     = "cd ${path.module}/../../lambda/admin && npm ci --ignore-scripts && npm run build"
    interpreter = ["bash", "-c"]
  }
}

data "archive_file" "admin" {
  type        = "zip"
  source_dir  = "${path.module}/../../lambda/admin/dist"
  output_path = "${path.module}/builds/admin.zip"
  depends_on  = [null_resource.admin_build]
}

resource "aws_lambda_function" "admin" {
  function_name    = "${local.name_prefix}-admin"
  filename         = data.archive_file.admin.output_path
  source_code_hash = data.archive_file.admin.output_base64sha256
  handler          = "index.handler"
  runtime          = var.lambda_runtime
  role             = aws_iam_role.admin_lambda.arn
  memory_size      = var.lambda_memory_size
  timeout          = var.lambda_timeout

  reserved_concurrent_executions = var.lambda_reserved_concurrency

  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }

  environment {
    variables = {
      ADMIN_TABLE                = aws_dynamodb_table.admin.name
      GALLERIES_TABLE            = aws_dynamodb_table.galleries.name
      INQUIRIES_TABLE            = aws_dynamodb_table.inquiries.name
      BOOKINGS_TABLE             = aws_dynamodb_table.bookings.name
      MEDIA_BUCKET               = aws_s3_bucket.media.id
      FROM_EMAIL                 = var.from_email
      CONTACT_EMAIL              = var.contact_email
      SITE_URL                   = var.use_custom_domain ? "https://${var.domain_name}" : ""
      ENVIRONMENT                = var.environment
      CORS_ALLOWED_ORIGINS       = var.use_custom_domain ? "https://${var.domain_name},https://www.${var.domain_name}" : "*"
      ORCHESTRATOR_FUNCTION_NAME = var.enable_raw_pipeline ? "${local.name_prefix}-image-processor-orchestrator" : ""
      IMAGENAI_PROFILE_ID        = var.imagenai_profile_id
    }
  }

  layers = [aws_lambda_layer_version.shared.arn]

  tags = {
    Name = "${local.name_prefix}-admin"
  }
}

resource "aws_cloudwatch_log_group" "admin" {
  name              = "/aws/lambda/${aws_lambda_function.admin.function_name}"
  retention_in_days = 14
}

resource "aws_lambda_permission" "admin_api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.admin.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}
