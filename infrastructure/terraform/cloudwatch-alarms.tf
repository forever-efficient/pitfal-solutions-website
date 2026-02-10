# Pitfal Solutions - CloudWatch Alarms
# Monitors Lambda errors, API Gateway errors, and DynamoDB throttling

# SNS topic for alarm notifications
resource "aws_sns_topic" "alarms" {
  count             = var.enable_cloudwatch_alarms ? 1 : 0
  name              = "${local.name_prefix}-alarms"
  kms_master_key_id = "alias/aws/sns"

  tags = {
    Name = "${local.name_prefix}-alarms"
  }
}

# Email subscription for alarms (optional)
resource "aws_sns_topic_subscription" "alarm_email" {
  count     = var.enable_cloudwatch_alarms && var.alarm_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alarms[0].arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# Lambda Error Alarm
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  count               = var.enable_cloudwatch_alarms ? 1 : 0
  alarm_name          = "${local.name_prefix}-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Lambda function errors exceeded threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.contact.function_name
  }

  alarm_actions = [aws_sns_topic.alarms[0].arn]
  ok_actions    = [aws_sns_topic.alarms[0].arn]

  tags = {
    Name = "${local.name_prefix}-lambda-errors"
  }
}

# Lambda Throttling Alarm
resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  count               = var.enable_cloudwatch_alarms ? 1 : 0
  alarm_name          = "${local.name_prefix}-lambda-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Lambda function throttling detected"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.contact.function_name
  }

  alarm_actions = [aws_sns_topic.alarms[0].arn]
  ok_actions    = [aws_sns_topic.alarms[0].arn]

  tags = {
    Name = "${local.name_prefix}-lambda-throttles"
  }
}

# API Gateway 5xx Errors Alarm
resource "aws_cloudwatch_metric_alarm" "api_5xx_errors" {
  count               = var.enable_cloudwatch_alarms ? 1 : 0
  alarm_name          = "${local.name_prefix}-api-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "API Gateway 5xx errors exceeded threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiName = aws_api_gateway_rest_api.main.name
    Stage   = var.environment
  }

  alarm_actions = [aws_sns_topic.alarms[0].arn]
  ok_actions    = [aws_sns_topic.alarms[0].arn]

  tags = {
    Name = "${local.name_prefix}-api-5xx-errors"
  }
}

# API Gateway 4xx Errors Alarm (high volume may indicate attack)
resource "aws_cloudwatch_metric_alarm" "api_4xx_errors" {
  count               = var.enable_cloudwatch_alarms ? 1 : 0
  alarm_name          = "${local.name_prefix}-api-4xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "API Gateway 4xx errors exceeded threshold (potential abuse)"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiName = aws_api_gateway_rest_api.main.name
    Stage   = var.environment
  }

  alarm_actions = [aws_sns_topic.alarms[0].arn]
  ok_actions    = [aws_sns_topic.alarms[0].arn]

  tags = {
    Name = "${local.name_prefix}-api-4xx-errors"
  }
}

# API Gateway Latency Alarm
resource "aws_cloudwatch_metric_alarm" "api_latency" {
  count               = var.enable_cloudwatch_alarms ? 1 : 0
  alarm_name          = "${local.name_prefix}-api-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = 300
  extended_statistic  = "p95"
  threshold           = 5000
  alarm_description   = "API Gateway p95 latency exceeded 5 seconds"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiName = aws_api_gateway_rest_api.main.name
    Stage   = var.environment
  }

  alarm_actions = [aws_sns_topic.alarms[0].arn]
  ok_actions    = [aws_sns_topic.alarms[0].arn]

  tags = {
    Name = "${local.name_prefix}-api-high-latency"
  }
}

# DynamoDB tables to monitor
locals {
  dynamodb_tables = var.enable_cloudwatch_alarms ? {
    inquiries = aws_dynamodb_table.inquiries.name
    galleries = aws_dynamodb_table.galleries.name
    admin     = aws_dynamodb_table.admin.name
  } : {}
}

# DynamoDB Read Throttling Alarms (all tables)
resource "aws_cloudwatch_metric_alarm" "dynamodb_read_throttle" {
  for_each            = local.dynamodb_tables
  alarm_name          = "${local.name_prefix}-dynamodb-${each.key}-read-throttle"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ReadThrottledRequests"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "DynamoDB ${each.key} table read throttling detected"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = each.value
  }

  alarm_actions = [aws_sns_topic.alarms[0].arn]
  ok_actions    = [aws_sns_topic.alarms[0].arn]

  tags = {
    Name = "${local.name_prefix}-dynamodb-${each.key}-read-throttle"
  }
}

# DynamoDB Write Throttling Alarms (all tables)
resource "aws_cloudwatch_metric_alarm" "dynamodb_write_throttle" {
  for_each            = local.dynamodb_tables
  alarm_name          = "${local.name_prefix}-dynamodb-${each.key}-write-throttle"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "WriteThrottledRequests"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "DynamoDB ${each.key} table write throttling detected"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = each.value
  }

  alarm_actions = [aws_sns_topic.alarms[0].arn]
  ok_actions    = [aws_sns_topic.alarms[0].arn]

  tags = {
    Name = "${local.name_prefix}-dynamodb-${each.key}-write-throttle"
  }
}

# Dead Letter Queue Messages Alarm
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  count               = var.enable_cloudwatch_alarms ? 1 : 0
  alarm_name          = "${local.name_prefix}-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Lambda failures detected in dead letter queue"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.lambda_dlq.name
  }

  alarm_actions = [aws_sns_topic.alarms[0].arn]
  ok_actions    = [aws_sns_topic.alarms[0].arn]

  tags = {
    Name = "${local.name_prefix}-dlq-messages"
  }
}

# CloudWatch Dashboard for monitoring
resource "aws_cloudwatch_dashboard" "main" {
  count          = var.enable_cloudwatch_alarms ? 1 : 0
  dashboard_name = "${local.name_prefix}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Lambda Invocations & Errors"
          region = var.aws_region
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", aws_lambda_function.contact.function_name, { stat = "Sum" }],
            [".", "Errors", ".", ".", { stat = "Sum", color = "#d62728" }],
            [".", "Throttles", ".", ".", { stat = "Sum", color = "#ff7f0e" }]
          ]
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Lambda Duration"
          region = var.aws_region
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.contact.function_name, { stat = "Average" }],
            ["...", { stat = "p95" }],
            ["...", { stat = "Maximum" }]
          ]
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "API Gateway Requests"
          region = var.aws_region
          metrics = [
            ["AWS/ApiGateway", "Count", "ApiName", aws_api_gateway_rest_api.main.name, "Stage", var.environment, { stat = "Sum" }],
            [".", "4XXError", ".", ".", ".", ".", { stat = "Sum", color = "#ff7f0e" }],
            [".", "5XXError", ".", ".", ".", ".", { stat = "Sum", color = "#d62728" }]
          ]
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "API Gateway Latency"
          region = var.aws_region
          metrics = [
            ["AWS/ApiGateway", "Latency", "ApiName", aws_api_gateway_rest_api.main.name, "Stage", var.environment, { stat = "Average" }],
            ["...", { stat = "p95" }]
          ]
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        properties = {
          title  = "DynamoDB - Inquiries Table"
          region = var.aws_region
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", aws_dynamodb_table.inquiries.name, { stat = "Sum" }],
            [".", "ConsumedWriteCapacityUnits", ".", ".", { stat = "Sum" }],
            [".", "ReadThrottledRequests", ".", ".", { stat = "Sum", color = "#d62728" }],
            [".", "WriteThrottledRequests", ".", ".", { stat = "Sum", color = "#ff7f0e" }]
          ]
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6
        properties = {
          title  = "CloudFront Requests"
          region = "us-east-1"
          metrics = [
            ["AWS/CloudFront", "Requests", "DistributionId", aws_cloudfront_distribution.website.id, "Region", "Global", { stat = "Sum" }],
            [".", "4xxErrorRate", ".", ".", ".", ".", { stat = "Average", color = "#ff7f0e" }],
            [".", "5xxErrorRate", ".", ".", ".", ".", { stat = "Average", color = "#d62728" }]
          ]
          period = 300
        }
      }
    ]
  })
}
