output "parameter_names" {
  description = "Every SSM parameter Arun fills by hand after the first apply."
  value       = sort([for p in aws_ssm_parameter.this : p.name])
}
