# The GitHub environments the deploy jobs run in (ARCHITECTURE §17.4). Both allow only main; prod also waits for
# Arun's approval, and ci-prod-deploy trusts nothing but a job in it.

resource "github_repository_environment" "env" {
  for_each = toset(["dev", "prod"])

  repository          = var.github_repo
  environment         = each.key
  prevent_self_review = false

  dynamic "reviewers" {
    for_each = each.key == "prod" ? [1] : []
    content {
      users = var.prod_reviewer_github_ids
    }
  }

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}

resource "github_repository_environment_deployment_policy" "main_only" {
  for_each = github_repository_environment.env

  repository     = var.github_repo
  environment    = each.value.environment
  branch_pattern = "main"
}
