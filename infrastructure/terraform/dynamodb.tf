# Pitfal Solutions - DynamoDB Tables

# Inquiries table (contact form submissions)
resource "aws_dynamodb_table" "inquiries" {
  name         = "${local.name_prefix}-inquiries"
  billing_mode = var.dynamodb_billing_mode
  hash_key     = "id"

  lifecycle {
    prevent_destroy = true
  }

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

  # GSI for querying by email (KEYS_ONLY - used for rate limiting COUNT queries)
  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    range_key       = "createdAt"
    projection_type = "KEYS_ONLY"
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

  server_side_encryption {
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

  lifecycle {
    prevent_destroy = true
  }

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

  server_side_encryption {
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

  lifecycle {
    prevent_destroy = true
  }

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

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = "${local.name_prefix}-admin"
  }
}

# ─────────────────────────────────────────────
# Bookings table (availability, bookings, scheduling)
# ─────────────────────────────────────────────
# Single-table design with pk/sk composite keys:
#
# Entity types:
#   Availability slot:  pk=AVAIL#YYYY-MM-DD   sk=HH:MM#<uuid>
#   Booking:            pk=BOOKING#<uuid>      sk=METADATA
#   Blocked date:       pk=BLOCKED#YYYY-MM-DD  sk=ALL | HH:MM
#   Recurring avail:    pk=RECURRING           sk=<dayOfWeek> (0-6)
#
# GSIs:
#   status-date-index:  Query bookings by status + date range
#   date-index:         Query all entities by date (availability, bookings)
#   client-index:       Query bookings by client email
#
resource "aws_dynamodb_table" "bookings" {
  name         = "${local.name_prefix}-bookings"
  billing_mode = var.dynamodb_billing_mode
  hash_key     = "pk"
  range_key    = "sk"

  lifecycle {
    prevent_destroy = true
  }

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "date"
    type = "S"
  }

  attribute {
    name = "clientEmail"
    type = "S"
  }

  # GSI for querying bookings by status (pending, confirmed, cancelled, completed)
  global_secondary_index {
    name            = "status-date-index"
    hash_key        = "status"
    range_key       = "date"
    projection_type = "ALL"
  }

  # GSI for querying by date across all entity types
  global_secondary_index {
    name            = "date-index"
    hash_key        = "date"
    range_key       = "pk"
    projection_type = "ALL"
  }

  # GSI for querying bookings by client email
  global_secondary_index {
    name            = "client-index"
    hash_key        = "clientEmail"
    range_key       = "date"
    projection_type = "ALL"
  }

  # TTL for auto-expiring old availability slots and cancelled bookings
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = "${local.name_prefix}-bookings"
  }
}
