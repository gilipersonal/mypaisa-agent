output "developer_role_arn" {
  description = "The role the agent-toolkit profile assumes (infra/README.md)."
  value       = aws_iam_role.developer.arn
}

output "ci_role_arns" {
  description = "For the workflows' aws-actions/configure-aws-credentials steps."
  value       = { for k, r in aws_iam_role.ci : k => r.arn }
}

output "ci_image_role_arn" {
  description = "The role ci.yml's Images job assumes to push from main (MA-237)."
  value       = aws_iam_role.ci_image.arn
}

output "images_repository_url" {
  description = "Where the Lambda images are pushed, lambda-<sha> and stream-<sha> (MA-237)."
  value       = aws_ecr_repository.images.repository_url
}

output "dev_boundary_arn" {
  description = "The permissions boundary every role dev's stack makes must carry."
  value       = aws_iam_policy.dev_boundary.arn
}
