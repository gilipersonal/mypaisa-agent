output "table_name" {
  description = "The single table."
  value       = aws_dynamodb_table.core.name
}

output "bucket_names" {
  description = "Each bucket by its part."
  value       = { for k, b in aws_s3_bucket.this : k => b.bucket }
}

output "parameter_names" {
  description = "Every SSM parameter Arun fills by hand after the first apply."
  value       = sort([for p in aws_ssm_parameter.this : p.name])
}
