locals {
  prefix    = "mypaisa-${var.env}"
  ssm_path  = "/mypaisa-agent/${var.env}"
  protected = var.protect_data
}

# --- DynamoDB: the single table (ARCHITECTURE §4.1) ----------------------------------------------------------------
#
# The same shape the local stack makes (scripts/local/aws.py): pk and sk, on demand. Its access patterns and any
# index come with the registry that reads it (MA-27, MA-270).
resource "aws_dynamodb_table" "core" {
  name         = "${local.prefix}-core"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  deletion_protection_enabled = local.protected

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  point_in_time_recovery {
    enabled = local.protected
  }

  # Encrypted at rest with the AWS-owned key, DynamoDB's default and free; a KMS key would add request charges.

  # In both environments: dev's synthetic household is reseeded by scripts/seed.sh, never by dropping its table.
  lifecycle {
    prevent_destroy = true
  }
}
