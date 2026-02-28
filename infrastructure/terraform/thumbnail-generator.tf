# Pitfal Solutions - Thumbnail Generator (AOT Image Processing)

# ─────────────────────────────────────────────
# IAM Role
# ─────────────────────────────────────────────

resource "aws_iam_role" "thumbnail_generator" {
  name = "${local.name_prefix}-thumbnail-gen"

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

resource "aws_iam_role_policy_attachment" "thumbnail_generator_logs" {
  role       = aws_iam_role.thumbnail_generator.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "thumbnail_generator_dlq" {
  name = "${local.name_prefix}-thumbnail-gen-dlq"
  role = aws_iam_role.thumbnail_generator.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sqs:SendMessage"]
      Resource = aws_sqs_queue.lambda_dlq.arn
    }]
  })
}

resource "aws_iam_role_policy" "thumbnail_generator_s3" {
  name = "${local.name_prefix}-thumbnail-gen-s3"
  role = aws_iam_role.thumbnail_generator.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadGalleryOriginals"
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.media.arn}/gallery/*"
      },
      {
        Sid    = "ManageProcessedThumbnails"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.media.arn}/processed/*"
      }
    ]
  })
}

# ─────────────────────────────────────────────
# Lambda Function
# ─────────────────────────────────────────────

data "archive_file" "thumbnail_generator" {
  type        = "zip"
  source_dir  = "${path.module}/../../lambda/thumbnail-generator/dist"
  output_path = "${path.module}/builds/thumbnail-generator.zip"
}

resource "aws_lambda_function" "thumbnail_generator" {
  filename         = data.archive_file.thumbnail_generator.output_path
  source_code_hash = data.archive_file.thumbnail_generator.output_base64sha256
  function_name    = "${local.name_prefix}-thumbnail-gen"
  role             = aws_iam_role.thumbnail_generator.arn
  handler          = "index.handler"
  runtime          = var.lambda_runtime
  
  # Sharp processing is memory/CPU intensive
  memory_size = 1024
  timeout     = 60
  
  layers = [
    aws_lambda_layer_version.sharp.arn
  ]

  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }

  environment {
    variables = {
      MEDIA_BUCKET = aws_s3_bucket.media.id
      ENVIRONMENT  = var.environment
    }
  }

  tags = {
    Name = "${local.name_prefix}-thumbnail-gen"
  }
}

resource "aws_cloudwatch_log_group" "thumbnail_generator" {
  name              = "/aws/lambda/${local.name_prefix}-thumbnail-gen"
  retention_in_days = 14
}

# ─────────────────────────────────────────────
# S3 Event Triggers
# ─────────────────────────────────────────────

resource "aws_lambda_permission" "thumbnail_generator_s3" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.thumbnail_generator.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.media.arn
  source_account = data.aws_caller_identity.current.account_id
}

# Add the event notifications.
# CAUTION: We merge these with the existing media_notifications block in image-processor
# to avoid overwrite conflicts. AWS S3 has a single notification configuration per bucket.
