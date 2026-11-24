output "table_name" {
  description = "The single table."
  value       = aws_dynamodb_table.core.name
}

output "bucket_names" {
  description = "Each bucket by its part."
  value       = { for k, b in aws_s3_bucket.this : k => b.bucket }
}

# --- The watch tower (MA-231): what the Lambda stories and the code take from here -----------------------------------

output "metric_namespace" {
  description = "The custom metrics' namespace (§9.5)."
  value       = local.metric_namespace
}

output "metric_names" {
  description = "The sixteen fixed custom metric names (§9.5), by key."
  value       = var.metric_names
}

output "alerts_topic_arn" {
  description = "mypaisa-<env>-admin-alerts: every alarm's first route (§9.6)."
  value       = aws_sns_topic.alerts.arn
}

output "log_group_names" {
  description = "Each function's log group, and the api's access log."
  value = merge(
    { for p, g in aws_cloudwatch_log_group.function : p => g.name },
    { api_access = aws_cloudwatch_log_group.api_access.name },
  )
}

output "lambda_otel_environment" {
  description = "Each function's OpenTelemetry environment (§9.3); the release adds build and version."
  value       = local.otel_environment
}

output "lambda_role_policy_arns" {
  description = "The managed policies every function's role carries (§9.3)."
  value       = local.lambda_role_policy_arns
}

output "dashboard_name" {
  description = "The environment's dashboard (§9.5)."
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

output "probe_function_name" {
  description = "Dev's probe Lambda, while it stands (MA-231); null where there is none."
  value       = var.probe ? aws_lambda_function.probe[0].function_name : null
}
