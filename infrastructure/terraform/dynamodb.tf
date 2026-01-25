# Pitfal Solutions - DynamoDB Tables

# Inquiries table (contact form submissions)
resource "aws_dynamodb_table" "inquiries" {
  name         = "${local.name_prefix}-inquiries"
  billing_mode = var.dynamodb_billing_mode
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  # GSI for querying by email
  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  # GSI for querying by status
  global_secondary_index {
    name            = "status-index"
    hash_key        = "status"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = "${local.name_prefix}-inquiries"
  }
}

# Galleries table
resource "aws_dynamodb_table" "galleries" {
  name         = "${local.name_prefix}-galleries"
  billing_mode = var.dynamodb_billing_mode
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  attribute {
    name = "type"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  attribute {
    name = "slug"
    type = "S"
  }

  # GSI for querying by category
  global_secondary_index {
    name            = "category-index"
    hash_key        = "category"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  # GSI for querying by type (portfolio vs client)
  global_secondary_index {
    name            = "type-index"
    hash_key        = "type"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  # GSI for querying by slug
  global_secondary_index {
    name            = "slug-index"
    hash_key        = "slug"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = "${local.name_prefix}-galleries"
  }
}

# Admin table (admin users, sessions, settings)
resource "aws_dynamodb_table" "admin" {
  name         = "${local.name_prefix}-admin"
  billing_mode = var.dynamodb_billing_mode
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  attribute {
    name = "gsi1pk"
    type = "S"
  }

  attribute {
    name = "gsi1sk"
    type = "S"
  }

  # GSI for inverted access patterns
  global_secondary_index {
    name            = "gsi1"
    hash_key        = "gsi1pk"
    range_key       = "gsi1sk"
    projection_type = "ALL"
  }

  # TTL for session expiration
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = "${local.name_prefix}-admin"
  }
}
