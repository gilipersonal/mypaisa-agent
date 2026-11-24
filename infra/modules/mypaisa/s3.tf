# --- S3: documents, exports, imports and the dashboard's site (ARCHITECTURE §17.1) ----------------------------------
#
# Private, owner-enforced, encrypted with S3's own key (free), TLS only; versioned where the data is kept (prod).
# The site's CloudFront distribution and its dashboard(-dev) record come with the first release that serves the
# web app (MA-107); until then the bucket only exists.

locals {
  buckets = toset([
    "documents", # every file a member sends, kept for good (ARCHITECTURE §4.6)
    "exports",   # the nightly Parquet exports of the events and views (§11.1)
    "imports",   # workbooks waiting for their dry run and the owner's confirm (§17.5)
    "site",      # the dashboard's web app and the iOS app's association file (§17.2)
  ])
}

resource "aws_s3_bucket" "this" {
  for_each = local.buckets

  bucket = "${local.prefix}-${each.key}"

  # In both environments, as the table: a bucket is emptied by its own job, never dropped with the stack.
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_ownership_controls" "this" {
  for_each = aws_s3_bucket.this

  bucket = each.value.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "this" {
  for_each = aws_s3_bucket.this

  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  for_each = aws_s3_bucket.this

  bucket = each.value.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "this" {
  for_each = aws_s3_bucket.this

  bucket = each.value.id
  versioning_configuration {
    # "Disabled" is valid only on a bucket that never had versioning, which is what dev's are.
    status = local.protected ? "Enabled" : "Disabled"
  }
}

data "aws_iam_policy_document" "tls_only" {
  for_each = aws_s3_bucket.this

  statement {
    sid       = "TlsOnly"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [each.value.arn, "${each.value.arn}/*"]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "tls_only" {
  for_each = aws_s3_bucket.this

  bucket = each.value.id
  policy = data.aws_iam_policy_document.tls_only[each.key].json

  depends_on = [aws_s3_bucket_public_access_block.this]
}
