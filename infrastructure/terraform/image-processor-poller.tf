# Pitfal Solutions - ImagenAI Poller Lambda
#
# Runs every 5 minutes (EventBridge Scheduler). Scans DynamoDB for
# PROCESSING_JOB records with status=processing, checks ImagenAI project
# status, and downloads finished JPEGs into S3 finished/ when complete.

# ─────────────────────────────────────────────
# Build + Package
# ─────────────────────────────────────────────

resource "null_resource" "poller_build" {
  count = var.enable_raw_pipeline ? 1 : 0

  triggers = {
    source_hash  = filesha256("${path.module}/../../lambda/image-processor-poller/index.ts")
    package_hash = filesha256("${path.module}/../../lambda/image-processor-poller/package.json")
  }

  provisioner "local-exec" {
    command     = "cd ${path.module}/../../lambda/image-processor-poller && npm ci --ignore-scripts && npm run build"
    interpreter = ["bash", "-c"]
  }
}

data "archive_file" "poller" {
  count       = var.enable_raw_pipeline ? 1 : 0
  type        = "zip"
  source_dir  = "${path.module}/../../lambda/image-processor-poller/dist"
  output_path = "${path.module}/builds/image-processor-poller.zip"
  depends_on  = [null_resource.poller_build]
}

# ─────────────────────────────────────────────
# Lambda Function
# ─────────────────────────────────────────────

resource "aws_lambda_function" "image_processor_poller" {
  count = var.enable_raw_pipeline ? 1 : 0

  function_name    = "${local.name_prefix}-image-processor-poller"
  filename         = data.archive_file.poller[0].output_path
  source_code_hash = data.archive_file.poller[0].output_base64sha256
  handler          = "index.handler"
  runtime          = var.lambda_runtime
  role             = aws_iam_role.image_processor_poller[0].arn
  memory_size      = 512
  timeout          = 300  # 5 minutes: download + re-upload multiple JPEGs per batch

  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }

  environment {
    variables = {
      ADMIN_TABLE         = aws_dynamodb_table.admin.name
      GALLERIES_TABLE     = aws_dynamodb_table.galleries.name
      MEDIA_BUCKET        = aws_s3_bucket.media.id
      IMAGENAI_API_KEY    = var.imagenai_api_key
    }
  }

  tags = {
    Name = "${local.name_prefix}-image-processor-poller"
  }
}

resource "aws_cloudwatch_log_group" "image_processor_poller" {
  count             = var.enable_raw_pipeline ? 1 : 0
  name              = "/aws/lambda/${aws_lambda_function.image_processor_poller[0].function_name}"
  retention_in_days = 14
}

# ─────────────────────────────────────────────
# EventBridge Scheduler (every 5 minutes)
# ─────────────────────────────────────────────

resource "aws_iam_role" "poller_scheduler" {
  count = var.enable_raw_pipeline ? 1 : 0
  name  = "${local.name_prefix}-poller-scheduler"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "scheduler.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "poller_scheduler_invoke" {
  count = var.enable_raw_pipeline ? 1 : 0
  name  = "${local.name_prefix}-poller-scheduler-invoke"
  role  = aws_iam_role.poller_scheduler[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["lambda:InvokeFunction"]
      Resource = aws_lambda_function.image_processor_poller[0].arn
    }]
  })
}

resource "aws_scheduler_schedule" "poller" {
  count = var.enable_raw_pipeline ? 1 : 0

  name                         = "${local.name_prefix}-imagenai-poller"
  schedule_expression          = "rate(5 minutes)"
  schedule_expression_timezone = "UTC"

  flexible_time_window {
    mode                      = "FLEXIBLE"
    maximum_window_in_minutes = 1
  }

  target {
    arn      = aws_lambda_function.image_processor_poller[0].arn
    role_arn = aws_iam_role.poller_scheduler[0].arn

    retry_policy {
      maximum_retry_attempts = 0  # Don't retry — next run is only 5 min away
    }
  }
}

# ─────────────────────────────────────────────
# IAM Role + Policies
# ─────────────────────────────────────────────

resource "aws_iam_role" "image_processor_poller" {
  count = var.enable_raw_pipeline ? 1 : 0
  name  = "${local.name_prefix}-poller-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "poller_logs" {
  count      = var.enable_raw_pipeline ? 1 : 0
  role       = aws_iam_role.image_processor_poller[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "poller_dynamodb" {
  count = var.enable_raw_pipeline ? 1 : 0
  name  = "${local.name_prefix}-poller-dynamodb"
  role  = aws_iam_role.image_processor_poller[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:Scan",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem"
        ]
        Resource = [aws_dynamodb_table.admin.arn]
      },
      {
        Effect = "Allow"
        Action = ["dynamodb:GetItem", "dynamodb:UpdateItem"]
        Resource = [aws_dynamodb_table.galleries.arn]
      }
    ]
  })
}

resource "aws_iam_role_policy" "poller_s3" {
  count = var.enable_raw_pipeline ? 1 : 0
  name  = "${local.name_prefix}-poller-s3"
  role  = aws_iam_role.image_processor_poller[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "${aws_s3_bucket.media.arn}/finished/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:DeleteObject"]
        Resource = "${aws_s3_bucket.media.arn}/staging/*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "poller_dlq" {
  count = var.enable_raw_pipeline ? 1 : 0
  name  = "${local.name_prefix}-poller-dlq"
  role  = aws_iam_role.image_processor_poller[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sqs:SendMessage"]
      Resource = aws_sqs_queue.lambda_dlq.arn
    }]
  })
}
