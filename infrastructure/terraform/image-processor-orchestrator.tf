# Pitfal Solutions - ImagenAI Orchestrator Lambda
#
# Receives { jobId, galleryId, rawKeys[] }, uploads RAW files to ImagenAI,
# starts editing, and updates the DynamoDB job record to status=processing.
#
# Triggered by:
#   - admin Lambda (manual mode): InvocationType=Event invoke
#   - S3 event on staging/ prefix (auto mode, when enable_raw_pipeline=true and processing_mode=auto)

# ─────────────────────────────────────────────
# Build + Package
# ─────────────────────────────────────────────

resource "null_resource" "orchestrator_build" {
  count = var.enable_raw_pipeline ? 1 : 0

  triggers = {
    source_hash  = filesha256("${path.module}/../../lambda/image-processor-orchestrator/index.ts")
    package_hash = filesha256("${path.module}/../../lambda/image-processor-orchestrator/package.json")
  }

  provisioner "local-exec" {
    command     = "cd ${path.module}/../../lambda/image-processor-orchestrator && npm ci --ignore-scripts && npm run build"
    interpreter = ["bash", "-c"]
  }
}

data "archive_file" "orchestrator" {
  count       = var.enable_raw_pipeline ? 1 : 0
  type        = "zip"
  source_dir  = "${path.module}/../../lambda/image-processor-orchestrator/dist"
  output_path = "${path.module}/builds/image-processor-orchestrator.zip"
  depends_on  = [null_resource.orchestrator_build]
}

# ─────────────────────────────────────────────
# Lambda Function
# ─────────────────────────────────────────────

resource "aws_lambda_function" "image_processor_orchestrator" {
  count = var.enable_raw_pipeline ? 1 : 0

  function_name    = "${local.name_prefix}-image-processor-orchestrator"
  filename         = data.archive_file.orchestrator[0].output_path
  source_code_hash = data.archive_file.orchestrator[0].output_base64sha256
  handler          = "index.handler"
  runtime          = var.lambda_runtime
  role             = aws_iam_role.image_processor_orchestrator[0].arn
  memory_size      = 1024   # RAW files can be 20-30 MB each; need memory for buffering
  timeout          = 300    # 5 minutes: upload 10 x 30 MB RAW files + API calls

  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }

  environment {
    variables = {
      ADMIN_TABLE          = aws_dynamodb_table.admin.name
      MEDIA_BUCKET         = aws_s3_bucket.media.id
      IMAGENAI_API_KEY     = var.imagenai_api_key
      IMAGENAI_PROFILE_ID  = var.imagenai_profile_id
    }
  }

  tags = {
    Name = "${local.name_prefix}-image-processor-orchestrator"
  }
}

resource "aws_cloudwatch_log_group" "image_processor_orchestrator" {
  count             = var.enable_raw_pipeline ? 1 : 0
  name              = "/aws/lambda/${aws_lambda_function.image_processor_orchestrator[0].function_name}"
  retention_in_days = 14
}

# ─────────────────────────────────────────────
# IAM Role + Policies
# ─────────────────────────────────────────────

resource "aws_iam_role" "image_processor_orchestrator" {
  count = var.enable_raw_pipeline ? 1 : 0
  name  = "${local.name_prefix}-orchestrator-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "orchestrator_logs" {
  count      = var.enable_raw_pipeline ? 1 : 0
  role       = aws_iam_role.image_processor_orchestrator[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "orchestrator_dynamodb" {
  count = var.enable_raw_pipeline ? 1 : 0
  name  = "${local.name_prefix}-orchestrator-dynamodb"
  role  = aws_iam_role.image_processor_orchestrator[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["dynamodb:GetItem", "dynamodb:UpdateItem"]
      Resource = [aws_dynamodb_table.admin.arn]
    }]
  })
}

resource "aws_iam_role_policy" "orchestrator_s3" {
  count = var.enable_raw_pipeline ? 1 : 0
  name  = "${local.name_prefix}-orchestrator-s3"
  role  = aws_iam_role.image_processor_orchestrator[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = "${aws_s3_bucket.media.arn}/staging/*"
    }]
  })
}

resource "aws_iam_role_policy" "orchestrator_dlq" {
  count = var.enable_raw_pipeline ? 1 : 0
  name  = "${local.name_prefix}-orchestrator-dlq"
  role  = aws_iam_role.image_processor_orchestrator[0].id

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
# S3 event → orchestrator (auto mode only)
# ─────────────────────────────────────────────

resource "aws_lambda_permission" "orchestrator_s3" {
  count         = (var.enable_raw_pipeline && var.processing_mode == "auto") ? 1 : 0
  statement_id  = "AllowS3InvokeOrchestrator"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.image_processor_orchestrator[0].function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.media.arn
}

# Allow admin Lambda to invoke orchestrator (manual trigger)
resource "aws_lambda_permission" "orchestrator_admin_invoke" {
  count         = var.enable_raw_pipeline ? 1 : 0
  statement_id  = "AllowAdminLambdaInvokeOrchestrator"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.image_processor_orchestrator[0].function_name
  principal     = "lambda.amazonaws.com"
  source_arn    = aws_lambda_function.admin.arn
}
