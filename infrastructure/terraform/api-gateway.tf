# Pitfal Solutions - API Gateway

# REST API
resource "aws_api_gateway_rest_api" "main" {
  name        = "${local.name_prefix}-api"
  description = "Pitfal Solutions API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name = "${local.name_prefix}-api"
  }
}

# /api resource
resource "aws_api_gateway_resource" "api" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "api"
}

# /api/contact resource
resource "aws_api_gateway_resource" "contact" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "contact"
}

# Request validator for contact endpoint
resource "aws_api_gateway_request_validator" "contact" {
  name                        = "contact-validator"
  rest_api_id                 = aws_api_gateway_rest_api.main.id
  validate_request_body       = true
  validate_request_parameters = false
}

# Request model for contact form
resource "aws_api_gateway_model" "contact_request" {
  rest_api_id  = aws_api_gateway_rest_api.main.id
  name         = "ContactRequest"
  description  = "Contact form submission request body"
  content_type = "application/json"

  schema = jsonencode({
    "$schema" = "http://json-schema.org/draft-04/schema#"
    title     = "ContactRequest"
    type      = "object"
    required  = ["name", "email", "message"]
    properties = {
      name = {
        type      = "string"
        minLength = 2
        maxLength = 100
      }
      email = {
        type      = "string"
        format    = "email"
        maxLength = 254
      }
      phone = {
        type      = "string"
        maxLength = 20
      }
      sessionType = {
        type      = "string"
        maxLength = 50
      }
      message = {
        type      = "string"
        minLength = 10
        maxLength = 5000
      }
      honeypot = {
        type = "string"
      }
    }
    additionalProperties = false
  })
}

# POST /api/contact
resource "aws_api_gateway_method" "contact_post" {
  rest_api_id          = aws_api_gateway_rest_api.main.id
  resource_id          = aws_api_gateway_resource.contact.id
  http_method          = "POST"
  authorization        = "NONE"
  request_validator_id = aws_api_gateway_request_validator.contact.id

  request_models = {
    "application/json" = aws_api_gateway_model.contact_request.name
  }
}

resource "aws_api_gateway_integration" "contact_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.contact.id
  http_method             = aws_api_gateway_method.contact_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.contact.invoke_arn
}

# OPTIONS /api/contact (CORS)
resource "aws_api_gateway_method" "contact_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.contact.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "contact_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.contact.id
  http_method = aws_api_gateway_method.contact_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "contact_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.contact.id
  http_method = aws_api_gateway_method.contact_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "contact_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.contact.id
  http_method = aws_api_gateway_method.contact_options.http_method
  status_code = aws_api_gateway_method_response.contact_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Requested-With'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'https://www.pitfal.solutions'"
  }
}

# Gateway response for request validation failures
resource "aws_api_gateway_gateway_response" "bad_request_body" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "BAD_REQUEST_BODY"
  status_code   = "400"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'https://www.pitfal.solutions'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Requested-With'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
  }

  response_templates = {
    "application/json" = jsonencode({
      success = false
      error   = "Invalid request body"
      code    = "ERR_VALIDATION_FAILED"
      message = "$context.error.validationErrorString"
    })
  }
}

# API Gateway deployment
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.api.id,
      aws_api_gateway_resource.contact.id,
      aws_api_gateway_method.contact_post.id,
      aws_api_gateway_integration.contact_post.id,
      aws_api_gateway_method.contact_options.id,
      aws_api_gateway_integration.contact_options.id,
      aws_api_gateway_request_validator.contact.id,
      aws_api_gateway_model.contact_request.id,
      aws_api_gateway_gateway_response.bad_request_body.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway stage
resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.environment

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId         = "$context.requestId"
      ip                = "$context.identity.sourceIp"
      caller            = "$context.identity.caller"
      user              = "$context.identity.user"
      requestTime       = "$context.requestTime"
      httpMethod        = "$context.httpMethod"
      resourcePath      = "$context.resourcePath"
      status            = "$context.status"
      protocol          = "$context.protocol"
      responseLength    = "$context.responseLength"
      integrationError  = "$context.integrationErrorMessage"
      integrationStatus = "$context.integrationStatus"
    })
  }

  tags = {
    Name = "${local.name_prefix}-api-${var.environment}"
  }
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/api-gateway/${local.name_prefix}-api"
  retention_in_days = 14
}

# API Gateway account settings (for CloudWatch logging)
resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch.arn
}

# Throttling settings
resource "aws_api_gateway_method_settings" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "*/*"

  settings {
    throttling_rate_limit  = var.api_throttle_rate_limit
    throttling_burst_limit = var.api_throttle_burst_limit
    logging_level          = "INFO"
    data_trace_enabled     = var.environment != "prod"
    metrics_enabled        = true
  }
}
