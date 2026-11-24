# The developer role for the laptop, and the three CI roles (ARCHITECTURE §17.4).

# --- The developer role -------------------------------------------------------------------------------------------
#
# Works in dev; the guard keeps it out of prod but for the put-only exception (prod_guard.tf). Assumed by Arun's
# own identity in the account (an IAM Identity Center or IAM user with MFA, never the root user, which cannot assume
# a role); the `agent-toolkit` profile then names this role (infra/README.md).

data "aws_iam_policy_document" "developer_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole", "sts:SetSourceIdentity"]
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${local.account_id}:root"]
    }
    condition {
      test     = "Bool"
      variable = "aws:MultiFactorAuthPresent"
      values   = ["true"]
    }
  }
}

resource "aws_iam_role" "developer" {
  name                 = "mypaisa-dev-developer"
  description          = "The laptop's role: works in dev, kept out of prod but for putting prod's secret values (MA-26)"
  assume_role_policy   = data.aws_iam_policy_document.developer_trust.json
  max_session_duration = 43200
}

resource "aws_iam_role_policy_attachment" "developer_admin" {
  role       = aws_iam_role.developer.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_role_policy" "developer_guard" {
  name   = "mypaisa-bootstrap-developer-guard"
  role   = aws_iam_role.developer.name
  policy = data.aws_iam_policy_document.guard_developer.json
}

# --- The CI roles, through the account's existing GitHub OIDC provider ----------------------------------------------
#
# Trusted by GitHub's immutable subject, which carries the owner's and the repository's permanent numeric ids, so no
# other repository (a rename or a fork included) can assume them. StringEquals, never a wildcard.

data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

locals {
  repo_subject = "repo:${var.github_owner}@${var.github_owner_id}/${var.github_repo}@${var.github_repo_id}"

  ci_roles = {
    # Read only, any branch and pull request: the plan on a PR and the nightly drift check (MA-108).
    plan = {
      subjects = ["${local.repo_subject}:*"]
      test     = "StringLike"
    }
    # main only, or the dev environment (which allows only main).
    dev-deploy = {
      subjects = ["${local.repo_subject}:ref:refs/heads/main", "${local.repo_subject}:environment:dev"]
      test     = "StringEquals"
    }
    # Only the prod environment, which waits for Arun's approval and allows only main.
    prod-deploy = {
      subjects = ["${local.repo_subject}:environment:prod"]
      test     = "StringEquals"
    }
  }
}

data "aws_iam_policy_document" "ci_trust" {
  for_each = local.ci_roles

  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    # The repository part is matched exactly even where the rest is a wildcard (ci-plan): `repo:owner@id/repo@id:`
    # ends in a colon, so no other repository's subject can match it.
    condition {
      test     = each.value.test
      variable = "token.actions.githubusercontent.com:sub"
      values   = each.value.subjects
    }
  }
}

resource "aws_iam_role" "ci" {
  for_each = local.ci_roles

  name                 = "mypaisa-ci-${each.key}"
  description          = "GitHub CI for ${var.github_owner}/${var.github_repo}: ${each.key} (MA-26)"
  assume_role_policy   = data.aws_iam_policy_document.ci_trust[each.key].json
  max_session_duration = 3600
}

# ci-plan reads everything Terraform refreshes, and takes the state lock for MyPaisa's keys only.
resource "aws_iam_role_policy_attachment" "ci_plan_read" {
  role       = aws_iam_role.ci["plan"].name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

data "aws_iam_policy_document" "ci_plan_lock" {
  statement {
    sid       = "StateLockOnly"
    effect    = "Allow"
    actions   = ["s3:PutObject", "s3:DeleteObject"]
    resources = ["arn:aws:s3:::${var.state_bucket}/mypaisa-agent/*.tflock"]
  }
}

resource "aws_iam_role_policy" "ci_plan_lock" {
  name   = "mypaisa-bootstrap-ci-plan-lock"
  role   = aws_iam_role.ci["plan"].name
  policy = data.aws_iam_policy_document.ci_plan_lock.json
}

# ci-dev-deploy applies dev: anything, inside the guard with no exception.
resource "aws_iam_role_policy_attachment" "ci_dev_admin" {
  role       = aws_iam_role.ci["dev-deploy"].name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_role_policy" "ci_dev_guard" {
  name   = "mypaisa-bootstrap-ci-dev-guard"
  role   = aws_iam_role.ci["dev-deploy"].name
  policy = data.aws_iam_policy_document.guard_dev.json
}

# ci-prod-deploy applies prod after Arun approves; prod's data resources carry prevent_destroy and deletion
# protection, and it may not change the roles that hold the guard.
resource "aws_iam_role_policy_attachment" "ci_prod_admin" {
  role       = aws_iam_role.ci["prod-deploy"].name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

data "aws_iam_policy_document" "ci_prod_limits" {
  statement {
    sid       = "DenyChangingTheGuard"
    effect    = "Deny"
    actions   = ["iam:*"]
    resources = local.guard_holders
  }
}

resource "aws_iam_role_policy" "ci_prod_limits" {
  name   = "mypaisa-bootstrap-ci-prod-limits"
  role   = aws_iam_role.ci["prod-deploy"].name
  policy = data.aws_iam_policy_document.ci_prod_limits.json
}
