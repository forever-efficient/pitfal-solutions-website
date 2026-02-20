# Pitfal Solutions - Image Auto-Editing Pipeline
#
# Architecture:
# 1. Photographer uploads CR2/CR3 files to s3://media-bucket/staging/
# 2. S3 event notification triggers image-processor Lambda
# 3. Lambda converts RAW → TIFF (LibRaw), applies professional edits (Sharp)
# 4. Original RAW + edited JPEG moved to s3://media-bucket/finished/
# 5. Finished images served via CloudFront at /media/finished/*

# ─────────────────────────────────────────────
# ECR Repository for Docker-based Lambda
# ─────────────────────────────────────────────

resource "aws_ecr_repository" "image_processor" {
  name                 = "${local.name_prefix}-image-processor"
  image_tag_mutability = "MUTABLE"
  force_delete         = var.environment != "prod"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name = "${local.name_prefix}-image-processor"
  }
}

# Lifecycle policy to keep only recent images
resource "aws_ecr_lifecycle_policy" "image_processor" {
  repository = aws_ecr_repository.image_processor.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 5 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 5
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ─────────────────────────────────────────────
# IAM Role for Image Processor Lambda
# ─────────────────────────────────────────────

resource "aws_iam_role" "image_processor" {
  name = "${local.name_prefix}-image-processor"

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

# CloudWatch Logs
resource "aws_iam_role_policy_attachment" "image_processor_logs" {
  role       = aws_iam_role.image_processor.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "image_processor_s3" {
  name = "${local.name_prefix}-image-processor-s3"
  role = aws_iam_role.image_processor.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadStagingRAW"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${aws_s3_bucket.media.arn}/staging/RAW/*",
          "${aws_s3_bucket.media.arn}/staging/JPEG/*"
        ]
      },
      {
        Sid    = "WriteStagingReady"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.media.arn}/staging/ready/*"
      },
      {
        Sid    = "ListBucket"
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.media.arn
        Condition = {
          StringLike = {
            "s3:prefix" = ["staging/RAW/*", "staging/JPEG/*", "staging/ready/*"]
          }
        }
      }
    ]
  })
}

# DLQ access
resource "aws_iam_role_policy" "image_processor_dlq" {
  name = "${local.name_prefix}-image-processor-dlq"
  role = aws_iam_role.image_processor.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage"]
        Resource = aws_sqs_queue.image_processor_dlq.arn
      }
    ]
  })
}

# ─────────────────────────────────────────────
# Dead Letter Queue for failed processing
# ─────────────────────────────────────────────

resource "aws_sqs_queue" "image_processor_dlq" {
  name                       = "${local.name_prefix}-image-processor-dlq"
  message_retention_seconds  = 1209600 # 14 days
  visibility_timeout_seconds = 300
  sqs_managed_sse_enabled    = true

  tags = {
    Name = "${local.name_prefix}-image-processor-dlq"
  }
}

# ─────────────────────────────────────────────
# Lambda Function (Docker-based)
# ─────────────────────────────────────────────

resource "aws_lambda_function" "image_processor" {
  count = var.enable_image_processor ? 1 : 0

  function_name = "${local.name_prefix}-image-processor"
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.image_processor.repository_url}:latest"
  role          = aws_iam_role.image_processor.arn

  # RAW image processing is CPU and memory intensive
  memory_size = var.image_processor_memory_size
  timeout     = var.image_processor_timeout

  # Limit concurrent executions to control costs
  # CR2/CR3 processing is expensive - don't want runaway costs
  reserved_concurrent_executions = var.image_processor_concurrency

  # Ephemeral storage for temp RAW/TIFF files (CR2/CR3 can be 30-60MB each)
  ephemeral_storage {
    size = 2048 # 2GB temp storage
  }

  dead_letter_config {
    target_arn = aws_sqs_queue.image_processor_dlq.arn
  }

  environment {
    variables = {
      MEDIA_BUCKET        = aws_s3_bucket.media.id
      STAGING_RAW_PREFIX  = "staging/RAW/"
      STAGING_JPEG_PREFIX = "staging/JPEG/"
      READY_PREFIX        = "staging/ready/"
      JPEG_QUALITY        = tostring(var.image_processor_jpeg_quality)
      NOTIFICATION_EMAIL  = var.contact_email
      ENVIRONMENT         = var.environment
    }
  }

  tags = {
    Name = "${local.name_prefix}-image-processor"
  }

  # Don't try to create/update until ECR repo exists
  depends_on = [
    aws_ecr_repository.image_processor,
    aws_iam_role_policy.image_processor_s3,
    aws_iam_role_policy.image_processor_dlq,
    aws_cloudwatch_log_group.image_processor,
  ]

  lifecycle {
    # Image URI changes on every deploy - don't force replacement
    ignore_changes = [image_uri]
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "image_processor" {
  name              = "/aws/lambda/${local.name_prefix}-image-processor"
  retention_in_days = 14
}

# ─────────────────────────────────────────────
# S3 Event Notification → Lambda Trigger
# ─────────────────────────────────────────────

# Permission for S3 to invoke Lambda
resource "aws_lambda_permission" "image_processor_s3" {
  count = var.enable_image_processor ? 1 : 0

  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.image_processor[0].function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.media.arn
  source_account = data.aws_caller_identity.current.account_id
}

# S3 bucket notification for staging/RAW/ and staging/JPEG/ uploads
resource "aws_s3_bucket_notification" "media_notifications" {
  count  = var.enable_image_processor ? 1 : 0
  bucket = aws_s3_bucket.media.id

  # RAW file triggers
  lambda_function {
    lambda_function_arn = aws_lambda_function.image_processor[0].arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "staging/RAW/"
    filter_suffix       = ".cr2"
  }

  lambda_function {
    lambda_function_arn = aws_lambda_function.image_processor[0].arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "staging/RAW/"
    filter_suffix       = ".CR2"
  }

  lambda_function {
    lambda_function_arn = aws_lambda_function.image_processor[0].arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "staging/RAW/"
    filter_suffix       = ".cr3"
  }

  lambda_function {
    lambda_function_arn = aws_lambda_function.image_processor[0].arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "staging/RAW/"
    filter_suffix       = ".CR3"
  }

  # JPEG/PNG triggers
  lambda_function {
    lambda_function_arn = aws_lambda_function.image_processor[0].arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "staging/JPEG/"
    filter_suffix       = ".jpg"
  }

  lambda_function {
    lambda_function_arn = aws_lambda_function.image_processor[0].arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "staging/JPEG/"
    filter_suffix       = ".jpeg"
  }

  lambda_function {
    lambda_function_arn = aws_lambda_function.image_processor[0].arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "staging/JPEG/"
    filter_suffix       = ".JPG"
  }

  lambda_function {
    lambda_function_arn = aws_lambda_function.image_processor[0].arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "staging/JPEG/"
    filter_suffix       = ".JPEG"
  }

  lambda_function {
    lambda_function_arn = aws_lambda_function.image_processor[0].arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "staging/JPEG/"
    filter_suffix       = ".png"
  }

  lambda_function {
    lambda_function_arn = aws_lambda_function.image_processor[0].arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "staging/JPEG/"
    filter_suffix       = ".PNG"
  }

  depends_on = [aws_lambda_permission.image_processor_s3]
}

# ─────────────────────────────────────────────
# CloudWatch Alarms for Image Processor
# ─────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "image_processor_errors" {
  count = var.enable_cloudwatch_alarms && var.enable_image_processor ? 1 : 0

  alarm_name          = "${local.name_prefix}-image-processor-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 2
  alarm_description   = "Image processor Lambda errors exceed threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.image_processor[0].function_name
  }

  alarm_actions = var.alarm_email != "" ? [aws_sns_topic.alarms[0].arn] : []

  tags = {
    Name = "${local.name_prefix}-image-processor-errors"
  }
}

resource "aws_cloudwatch_metric_alarm" "image_processor_duration" {
  count = var.enable_cloudwatch_alarms && var.enable_image_processor ? 1 : 0

  alarm_name          = "${local.name_prefix}-image-processor-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Maximum"
  threshold           = var.image_processor_timeout * 1000 * 0.9 # 90% of timeout
  alarm_description   = "Image processor Lambda approaching timeout"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.image_processor[0].function_name
  }

  alarm_actions = var.alarm_email != "" ? [aws_sns_topic.alarms[0].arn] : []

  tags = {
    Name = "${local.name_prefix}-image-processor-duration"
  }
}

resource "aws_cloudwatch_metric_alarm" "image_processor_dlq_messages" {
  count = var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${local.name_prefix}-image-processor-dlq"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Failed image processing jobs in DLQ"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.image_processor_dlq.name
  }

  alarm_actions = var.alarm_email != "" ? [aws_sns_topic.alarms[0].arn] : []

  tags = {
    Name = "${local.name_prefix}-image-processor-dlq"
  }
}
