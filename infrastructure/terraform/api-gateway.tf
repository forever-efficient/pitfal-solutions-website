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

  # CORS preflight response
  # When using custom domain: specific origin for security
  # When using CloudFront default: wildcard for preflight (Lambda validates actual requests)
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Requested-With'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.api_gateway_cors_origin}'"
  }
}

# Gateway response for request validation failures
resource "aws_api_gateway_gateway_response" "bad_request_body" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "BAD_REQUEST_BODY"
  status_code   = "400"

  # CORS error response headers
  # When using custom domain: specific origin for security
  # When using CloudFront default: wildcard (these are error responses, not sensitive)
  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'${local.api_gateway_cors_origin}'"
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

# ─────────────────────────────────────────────
# Client API Routes
# ─────────────────────────────────────────────

# /api/client
resource "aws_api_gateway_resource" "client" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "client"
}

# /api/client/auth
resource "aws_api_gateway_resource" "client_auth" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.client.id
  path_part   = "auth"
}

# ANY /api/client/auth → client-auth Lambda
resource "aws_api_gateway_method" "client_auth_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.client_auth.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "client_auth_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.client_auth.id
  http_method             = aws_api_gateway_method.client_auth_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.client_auth.invoke_arn
}

# OPTIONS /api/client/auth (CORS)
resource "aws_api_gateway_method" "client_auth_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.client_auth.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "client_auth_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.client_auth.id
  http_method = aws_api_gateway_method.client_auth_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "client_auth_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.client_auth.id
  http_method = aws_api_gateway_method.client_auth_options.http_method
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

resource "aws_api_gateway_integration_response" "client_auth_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.client_auth.id
  http_method = aws_api_gateway_method.client_auth_options.http_method
  status_code = aws_api_gateway_method_response.client_auth_options.status_code

  depends_on = [aws_api_gateway_integration.client_auth_options]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Requested-With'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.api_gateway_cors_origin}'"
  }
}

# /api/client/{galleryId}
resource "aws_api_gateway_resource" "client_gallery" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.client.id
  path_part   = "{galleryId}"
}

# ANY /api/client/{galleryId} → client-gallery Lambda
resource "aws_api_gateway_method" "client_gallery_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.client_gallery.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "client_gallery_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.client_gallery.id
  http_method             = aws_api_gateway_method.client_gallery_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.client_gallery.invoke_arn
}

# OPTIONS /api/client/{galleryId} (CORS)
resource "aws_api_gateway_method" "client_gallery_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.client_gallery.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "client_gallery_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.client_gallery.id
  http_method = aws_api_gateway_method.client_gallery_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "client_gallery_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.client_gallery.id
  http_method = aws_api_gateway_method.client_gallery_options.http_method
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

resource "aws_api_gateway_integration_response" "client_gallery_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.client_gallery.id
  http_method = aws_api_gateway_method.client_gallery_options.http_method
  status_code = aws_api_gateway_method_response.client_gallery_options.status_code

  depends_on = [aws_api_gateway_integration.client_gallery_options]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Requested-With'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.api_gateway_cors_origin}'"
  }
}

# /api/client/{galleryId}/comment
resource "aws_api_gateway_resource" "client_gallery_comment" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.client_gallery.id
  path_part   = "comment"
}

# ANY /api/client/{galleryId}/comment → client-gallery Lambda
resource "aws_api_gateway_method" "client_gallery_comment_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.client_gallery_comment.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "client_gallery_comment_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.client_gallery_comment.id
  http_method             = aws_api_gateway_method.client_gallery_comment_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.client_gallery.invoke_arn
}

# OPTIONS /api/client/{galleryId}/comment (CORS)
resource "aws_api_gateway_method" "client_gallery_comment_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.client_gallery_comment.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "client_gallery_comment_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.client_gallery_comment.id
  http_method = aws_api_gateway_method.client_gallery_comment_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "client_gallery_comment_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.client_gallery_comment.id
  http_method = aws_api_gateway_method.client_gallery_comment_options.http_method
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

resource "aws_api_gateway_integration_response" "client_gallery_comment_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.client_gallery_comment.id
  http_method = aws_api_gateway_method.client_gallery_comment_options.http_method
  status_code = aws_api_gateway_method_response.client_gallery_comment_options.status_code

  depends_on = [aws_api_gateway_integration.client_gallery_comment_options]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Requested-With'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.api_gateway_cors_origin}'"
  }
}

# /api/client/{galleryId}/download
resource "aws_api_gateway_resource" "client_gallery_download" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.client_gallery.id
  path_part   = "download"
}

# ANY /api/client/{galleryId}/download → client-gallery Lambda
resource "aws_api_gateway_method" "client_gallery_download_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.client_gallery_download.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "client_gallery_download_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.client_gallery_download.id
  http_method             = aws_api_gateway_method.client_gallery_download_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.client_gallery.invoke_arn
}

# OPTIONS /api/client/{galleryId}/download (CORS)
resource "aws_api_gateway_method" "client_gallery_download_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.client_gallery_download.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "client_gallery_download_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.client_gallery_download.id
  http_method = aws_api_gateway_method.client_gallery_download_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "client_gallery_download_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.client_gallery_download.id
  http_method = aws_api_gateway_method.client_gallery_download_options.http_method
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

resource "aws_api_gateway_integration_response" "client_gallery_download_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.client_gallery_download.id
  http_method = aws_api_gateway_method.client_gallery_download_options.http_method
  status_code = aws_api_gateway_method_response.client_gallery_download_options.status_code

  depends_on = [aws_api_gateway_integration.client_gallery_download_options]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Requested-With'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.api_gateway_cors_origin}'"
  }
}

# ─────────────────────────────────────────────
# Admin API Routes
# ─────────────────────────────────────────────

# /api/admin
resource "aws_api_gateway_resource" "admin" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "admin"
}

# /api/admin/auth
resource "aws_api_gateway_resource" "admin_auth" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "auth"
}

# ANY /api/admin/auth → admin Lambda
resource "aws_api_gateway_method" "admin_auth_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_auth.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_auth_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin_auth.id
  http_method             = aws_api_gateway_method.admin_auth_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.admin.invoke_arn
}

# OPTIONS /api/admin/auth (CORS)
resource "aws_api_gateway_method" "admin_auth_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_auth.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_auth_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_auth.id
  http_method = aws_api_gateway_method.admin_auth_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_auth_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_auth.id
  http_method = aws_api_gateway_method.admin_auth_options.http_method
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

resource "aws_api_gateway_integration_response" "admin_auth_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_auth.id
  http_method = aws_api_gateway_method.admin_auth_options.http_method
  status_code = aws_api_gateway_method_response.admin_auth_options.status_code

  depends_on = [aws_api_gateway_integration.admin_auth_options]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Requested-With'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.api_gateway_cors_origin}'"
  }
}

# /api/admin/galleries
resource "aws_api_gateway_resource" "admin_galleries" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "galleries"
}

# ANY /api/admin/galleries → admin Lambda
resource "aws_api_gateway_method" "admin_galleries_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_galleries.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_galleries_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin_galleries.id
  http_method             = aws_api_gateway_method.admin_galleries_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.admin.invoke_arn
}

# OPTIONS /api/admin/galleries (CORS)
resource "aws_api_gateway_method" "admin_galleries_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_galleries.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_galleries_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_galleries.id
  http_method = aws_api_gateway_method.admin_galleries_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_galleries_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_galleries.id
  http_method = aws_api_gateway_method.admin_galleries_options.http_method
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

resource "aws_api_gateway_integration_response" "admin_galleries_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_galleries.id
  http_method = aws_api_gateway_method.admin_galleries_options.http_method
  status_code = aws_api_gateway_method_response.admin_galleries_options.status_code

  depends_on = [aws_api_gateway_integration.admin_galleries_options]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Requested-With'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.api_gateway_cors_origin}'"
  }
}

# /api/admin/galleries/{id}
resource "aws_api_gateway_resource" "admin_gallery_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin_galleries.id
  path_part   = "{id}"
}

# ANY /api/admin/galleries/{id} → admin Lambda
resource "aws_api_gateway_method" "admin_gallery_id_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_gallery_id.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_gallery_id_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin_gallery_id.id
  http_method             = aws_api_gateway_method.admin_gallery_id_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.admin.invoke_arn
}

# OPTIONS /api/admin/galleries/{id} (CORS)
resource "aws_api_gateway_method" "admin_gallery_id_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_gallery_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_gallery_id_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_gallery_id.id
  http_method = aws_api_gateway_method.admin_gallery_id_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_gallery_id_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_gallery_id.id
  http_method = aws_api_gateway_method.admin_gallery_id_options.http_method
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

resource "aws_api_gateway_integration_response" "admin_gallery_id_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_gallery_id.id
  http_method = aws_api_gateway_method.admin_gallery_id_options.http_method
  status_code = aws_api_gateway_method_response.admin_gallery_id_options.status_code

  depends_on = [aws_api_gateway_integration.admin_gallery_id_options]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Requested-With'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.api_gateway_cors_origin}'"
  }
}

# /api/admin/images
resource "aws_api_gateway_resource" "admin_images" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "images"
}

# ANY /api/admin/images → admin Lambda
resource "aws_api_gateway_method" "admin_images_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_images.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_images_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin_images.id
  http_method             = aws_api_gateway_method.admin_images_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.admin.invoke_arn
}

# OPTIONS /api/admin/images (CORS)
resource "aws_api_gateway_method" "admin_images_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_images.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_images_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_images.id
  http_method = aws_api_gateway_method.admin_images_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_images_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_images.id
  http_method = aws_api_gateway_method.admin_images_options.http_method
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

resource "aws_api_gateway_integration_response" "admin_images_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_images.id
  http_method = aws_api_gateway_method.admin_images_options.http_method
  status_code = aws_api_gateway_method_response.admin_images_options.status_code

  depends_on = [aws_api_gateway_integration.admin_images_options]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Requested-With'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.api_gateway_cors_origin}'"
  }
}

# /api/admin/images/{id}
resource "aws_api_gateway_resource" "admin_image_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin_images.id
  path_part   = "{id}"
}

# ANY /api/admin/images/{id} → admin Lambda
resource "aws_api_gateway_method" "admin_image_id_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_image_id.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_image_id_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin_image_id.id
  http_method             = aws_api_gateway_method.admin_image_id_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.admin.invoke_arn
}

# OPTIONS /api/admin/images/{id} (CORS)
resource "aws_api_gateway_method" "admin_image_id_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_image_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_image_id_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_image_id.id
  http_method = aws_api_gateway_method.admin_image_id_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_image_id_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_image_id.id
  http_method = aws_api_gateway_method.admin_image_id_options.http_method
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

resource "aws_api_gateway_integration_response" "admin_image_id_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_image_id.id
  http_method = aws_api_gateway_method.admin_image_id_options.http_method
  status_code = aws_api_gateway_method_response.admin_image_id_options.status_code

  depends_on = [aws_api_gateway_integration.admin_image_id_options]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Requested-With'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.api_gateway_cors_origin}'"
  }
}

# /api/admin/inquiries
resource "aws_api_gateway_resource" "admin_inquiries" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "inquiries"
}

# ANY /api/admin/inquiries → admin Lambda
resource "aws_api_gateway_method" "admin_inquiries_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_inquiries.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_inquiries_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin_inquiries.id
  http_method             = aws_api_gateway_method.admin_inquiries_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.admin.invoke_arn
}

# OPTIONS /api/admin/inquiries (CORS)
resource "aws_api_gateway_method" "admin_inquiries_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_inquiries.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_inquiries_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_inquiries.id
  http_method = aws_api_gateway_method.admin_inquiries_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_inquiries_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_inquiries.id
  http_method = aws_api_gateway_method.admin_inquiries_options.http_method
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

resource "aws_api_gateway_integration_response" "admin_inquiries_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_inquiries.id
  http_method = aws_api_gateway_method.admin_inquiries_options.http_method
  status_code = aws_api_gateway_method_response.admin_inquiries_options.status_code

  depends_on = [aws_api_gateway_integration.admin_inquiries_options]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Requested-With'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.api_gateway_cors_origin}'"
  }
}

# /api/admin/inquiries/{id}
resource "aws_api_gateway_resource" "admin_inquiry_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin_inquiries.id
  path_part   = "{id}"
}

# ANY /api/admin/inquiries/{id} → admin Lambda
resource "aws_api_gateway_method" "admin_inquiry_id_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_inquiry_id.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_inquiry_id_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin_inquiry_id.id
  http_method             = aws_api_gateway_method.admin_inquiry_id_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.admin.invoke_arn
}

# OPTIONS /api/admin/inquiries/{id} (CORS)
resource "aws_api_gateway_method" "admin_inquiry_id_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_inquiry_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_inquiry_id_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_inquiry_id.id
  http_method = aws_api_gateway_method.admin_inquiry_id_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_inquiry_id_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_inquiry_id.id
  http_method = aws_api_gateway_method.admin_inquiry_id_options.http_method
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

resource "aws_api_gateway_integration_response" "admin_inquiry_id_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_inquiry_id.id
  http_method = aws_api_gateway_method.admin_inquiry_id_options.http_method
  status_code = aws_api_gateway_method_response.admin_inquiry_id_options.status_code

  depends_on = [aws_api_gateway_integration.admin_inquiry_id_options]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Requested-With'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.api_gateway_cors_origin}'"
  }
}

# /api/admin/galleries/{id}/notify
resource "aws_api_gateway_resource" "admin_gallery_notify" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin_gallery_id.id
  path_part   = "notify"
}

# ANY /api/admin/galleries/{id}/notify → admin Lambda
resource "aws_api_gateway_method" "admin_gallery_notify_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_gallery_notify.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_gallery_notify_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin_gallery_notify.id
  http_method             = aws_api_gateway_method.admin_gallery_notify_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.admin.invoke_arn
}

# OPTIONS /api/admin/galleries/{id}/notify (CORS)
resource "aws_api_gateway_method" "admin_gallery_notify_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_gallery_notify.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_gallery_notify_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_gallery_notify.id
  http_method = aws_api_gateway_method.admin_gallery_notify_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_gallery_notify_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_gallery_notify.id
  http_method = aws_api_gateway_method.admin_gallery_notify_options.http_method
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

resource "aws_api_gateway_integration_response" "admin_gallery_notify_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_gallery_notify.id
  http_method = aws_api_gateway_method.admin_gallery_notify_options.http_method
  status_code = aws_api_gateway_method_response.admin_gallery_notify_options.status_code

  depends_on = [aws_api_gateway_integration.admin_gallery_notify_options]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Requested-With'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.api_gateway_cors_origin}'"
  }
}

# ─────────────────────────────────────────────
# Admin Gallery Bulk Download
# ─────────────────────────────────────────────

# /api/admin/galleries/{id}/bulk-download
resource "aws_api_gateway_resource" "admin_gallery_bulk_download" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin_gallery_id.id
  path_part   = "bulk-download"
}

# ANY /api/admin/galleries/{id}/bulk-download → admin Lambda
resource "aws_api_gateway_method" "admin_gallery_bulk_download_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_gallery_bulk_download.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_gallery_bulk_download_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin_gallery_bulk_download.id
  http_method             = aws_api_gateway_method.admin_gallery_bulk_download_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.admin.invoke_arn
}

# OPTIONS /api/admin/galleries/{id}/bulk-download (CORS)
resource "aws_api_gateway_method" "admin_gallery_bulk_download_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_gallery_bulk_download.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_gallery_bulk_download_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_gallery_bulk_download.id
  http_method = aws_api_gateway_method.admin_gallery_bulk_download_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_gallery_bulk_download_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_gallery_bulk_download.id
  http_method = aws_api_gateway_method.admin_gallery_bulk_download_options.http_method
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

resource "aws_api_gateway_integration_response" "admin_gallery_bulk_download_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_gallery_bulk_download.id
  http_method = aws_api_gateway_method.admin_gallery_bulk_download_options.http_method
  status_code = aws_api_gateway_method_response.admin_gallery_bulk_download_options.status_code

  depends_on = [aws_api_gateway_integration.admin_gallery_bulk_download_options]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Requested-With'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.api_gateway_cors_origin}'"
  }
}

# ─────────────────────────────────────────────
# Client Gallery Bulk Download
# ─────────────────────────────────────────────

# /api/client/{galleryId}/bulk-download
resource "aws_api_gateway_resource" "client_gallery_bulk_download" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.client_gallery.id
  path_part   = "bulk-download"
}

# ANY /api/client/{galleryId}/bulk-download → client-gallery Lambda
resource "aws_api_gateway_method" "client_gallery_bulk_download_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.client_gallery_bulk_download.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "client_gallery_bulk_download_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.client_gallery_bulk_download.id
  http_method             = aws_api_gateway_method.client_gallery_bulk_download_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.client_gallery.invoke_arn
}

# OPTIONS /api/client/{galleryId}/bulk-download (CORS)
resource "aws_api_gateway_method" "client_gallery_bulk_download_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.client_gallery_bulk_download.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "client_gallery_bulk_download_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.client_gallery_bulk_download.id
  http_method = aws_api_gateway_method.client_gallery_bulk_download_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "client_gallery_bulk_download_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.client_gallery_bulk_download.id
  http_method = aws_api_gateway_method.client_gallery_bulk_download_options.http_method
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

resource "aws_api_gateway_integration_response" "client_gallery_bulk_download_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.client_gallery_bulk_download.id
  http_method = aws_api_gateway_method.client_gallery_bulk_download_options.http_method
  status_code = aws_api_gateway_method_response.client_gallery_bulk_download_options.status_code

  depends_on = [aws_api_gateway_integration.client_gallery_bulk_download_options]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Requested-With'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.api_gateway_cors_origin}'"
  }
}

# API Gateway deployment
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      # Existing contact resources
      aws_api_gateway_resource.api.id,
      aws_api_gateway_resource.contact.id,
      aws_api_gateway_method.contact_post.id,
      aws_api_gateway_integration.contact_post.id,
      aws_api_gateway_method.contact_options.id,
      aws_api_gateway_integration.contact_options.id,
      aws_api_gateway_request_validator.contact.id,
      aws_api_gateway_model.contact_request.id,
      aws_api_gateway_gateway_response.bad_request_body.id,
      # Client auth
      aws_api_gateway_resource.client.id,
      aws_api_gateway_resource.client_auth.id,
      aws_api_gateway_method.client_auth_any.id,
      aws_api_gateway_integration.client_auth_any.id,
      # Client gallery
      aws_api_gateway_resource.client_gallery.id,
      aws_api_gateway_method.client_gallery_any.id,
      aws_api_gateway_integration.client_gallery_any.id,
      # Client gallery comment
      aws_api_gateway_resource.client_gallery_comment.id,
      aws_api_gateway_method.client_gallery_comment_any.id,
      aws_api_gateway_integration.client_gallery_comment_any.id,
      # Client gallery download
      aws_api_gateway_resource.client_gallery_download.id,
      aws_api_gateway_method.client_gallery_download_any.id,
      aws_api_gateway_integration.client_gallery_download_any.id,
      # Admin auth
      aws_api_gateway_resource.admin.id,
      aws_api_gateway_resource.admin_auth.id,
      aws_api_gateway_method.admin_auth_any.id,
      aws_api_gateway_integration.admin_auth_any.id,
      # Admin galleries
      aws_api_gateway_resource.admin_galleries.id,
      aws_api_gateway_method.admin_galleries_any.id,
      aws_api_gateway_integration.admin_galleries_any.id,
      # Admin gallery by id
      aws_api_gateway_resource.admin_gallery_id.id,
      aws_api_gateway_method.admin_gallery_id_any.id,
      aws_api_gateway_integration.admin_gallery_id_any.id,
      # Admin images
      aws_api_gateway_resource.admin_images.id,
      aws_api_gateway_method.admin_images_any.id,
      aws_api_gateway_integration.admin_images_any.id,
      # Admin image by id
      aws_api_gateway_resource.admin_image_id.id,
      aws_api_gateway_method.admin_image_id_any.id,
      aws_api_gateway_integration.admin_image_id_any.id,
      # Admin inquiries
      aws_api_gateway_resource.admin_inquiries.id,
      aws_api_gateway_method.admin_inquiries_any.id,
      aws_api_gateway_integration.admin_inquiries_any.id,
      # Admin inquiry by id
      aws_api_gateway_resource.admin_inquiry_id.id,
      aws_api_gateway_method.admin_inquiry_id_any.id,
      aws_api_gateway_integration.admin_inquiry_id_any.id,
      # Admin gallery notify
      aws_api_gateway_resource.admin_gallery_notify.id,
      aws_api_gateway_method.admin_gallery_notify_any.id,
      aws_api_gateway_integration.admin_gallery_notify_any.id,
      # Admin gallery bulk download
      aws_api_gateway_resource.admin_gallery_bulk_download.id,
      aws_api_gateway_method.admin_gallery_bulk_download_any.id,
      aws_api_gateway_integration.admin_gallery_bulk_download_any.id,
      # Client gallery bulk download
      aws_api_gateway_resource.client_gallery_bulk_download.id,
      aws_api_gateway_method.client_gallery_bulk_download_any.id,
      aws_api_gateway_integration.client_gallery_bulk_download_any.id,
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
    # Always disabled - data traces can log sensitive request/response bodies
    data_trace_enabled = false
    metrics_enabled    = true
  }
}
