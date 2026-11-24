output "developer_role_arn" {
  description = "The role the agent-toolkit profile assumes (infra/README.md)."
  value       = aws_iam_role.developer.arn
}

output "ci_role_arns" {
  description = "For the workflows' aws-actions/configure-aws-credentials steps."
  value       = { for k, r in aws_iam_role.ci : k => r.arn }
}

output "dev_boundary_arn" {
  description = "The permissions boundary every role dev's stack makes must carry."
  value       = aws_iam_policy.dev_boundary.arn
}
