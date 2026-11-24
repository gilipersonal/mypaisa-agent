# The prod guard: the denies that keep dev's principals (the developer role, ci-dev-deploy and every role dev's
# stack makes) out of prod, and out of the roles that hold the guard (ARCHITECTURE §17.1).
#
# Two halves, because not every service evaluates aws:ResourceTag on every action:
#   - by tag: anything tagged env=prod, and any request that would tag something env=prod;
#   - by name: every prod ARN MyPaisa names (mypaisa-prod-*, /mypaisa-agent/prod/*, prod's state key).
#
# The developer role's one exception to its env=prod deny is ssm:PutParameter on /mypaisa-agent/prod/*, for Arun
# to put prod's secret values by hand; it never reads, decrypts, deletes or tags a prod parameter, and Claude never
# runs it (Arun, 24 Nov 2026, MA-26). An explicit deny beats any allow, so the exception is cut out of the deny
# itself (NotAction), never added as an allow beside it. ci-dev-deploy and dev's stack get the guard without it.

locals {
  account_id = data.aws_caller_identity.current.account_id

  # Every prod ARN MyPaisa names, by service, but its parameters. A new kind of prod resource adds its pattern here;
  # one whose ARN carries no name (a Cognito pool's id) is guarded by its tag alone.
  prod_arns = [
    "arn:aws:dynamodb:*:${local.account_id}:table/mypaisa-prod-*",
    "arn:aws:s3:::mypaisa-prod-*",
    "arn:aws:s3:::mypaisa-prod-*/*",
    "arn:aws:s3:::${var.state_bucket}/mypaisa-agent/prod/*",
    "arn:aws:iam::${local.account_id}:role/mypaisa-prod-*",
    "arn:aws:iam::${local.account_id}:policy/mypaisa-prod-*",
    "arn:aws:lambda:*:${local.account_id}:function:mypaisa-prod-*",
    "arn:aws:sqs:*:${local.account_id}:mypaisa-prod-*",
    "arn:aws:sns:*:${local.account_id}:mypaisa-prod-*",
    "arn:aws:logs:*:${local.account_id}:log-group:/aws/lambda/mypaisa-prod-*",
    "arn:aws:logs:*:${local.account_id}:log-group:mypaisa-prod-*",
    "arn:aws:events:*:${local.account_id}:event-bus/mypaisa-prod-*",
    "arn:aws:scheduler:*:${local.account_id}:schedule/mypaisa-prod-*/*",
    "arn:aws:states:*:${local.account_id}:stateMachine:mypaisa-prod-*",
    # The watch tower (MA-231): prod's alarms and its dashboard. Its log groups and topic match the patterns above;
    # a saved query's ARN carries no name and holds no data, so it has no pattern.
    "arn:aws:cloudwatch:*:${local.account_id}:alarm:mypaisa-prod-*",
    "arn:aws:cloudwatch::${local.account_id}:dashboard/mypaisa-prod",
  ]
  prod_parameters = "arn:aws:ssm:*:${local.account_id}:parameter/mypaisa-agent/prod/*"
  dev_boundary    = "arn:aws:iam::${local.account_id}:policy/mypaisa-dev-boundary"

  # The roles and policies that hold the guard: nothing guarded may change them.
  guard_holders = [
    "arn:aws:iam::${local.account_id}:role/mypaisa-dev-developer",
    "arn:aws:iam::${local.account_id}:role/mypaisa-ci-*",
    "arn:aws:iam::${local.account_id}:policy/mypaisa-bootstrap-*",
    local.dev_boundary,
  ]
}

data "aws_caller_identity" "current" {}

# The developer role's guard: the exception's ssm:PutParameter is cut out of the two denies that would refuse it.
data "aws_iam_policy_document" "guard_developer" {
  source_policy_documents = [data.aws_iam_policy_document.guard_common.json]

  statement {
    sid         = "DenyProdByTagButThePut"
    effect      = "Deny"
    not_actions = ["ssm:PutParameter"]
    resources   = ["*"]
    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/env"
      values   = ["prod"]
    }
  }

  statement {
    sid         = "DenyProdParametersButThePut"
    effect      = "Deny"
    not_actions = ["ssm:PutParameter"]
    resources   = [local.prod_parameters]
  }

  # The put overwrites a parameter Terraform made, never makes a new one under prod's path.
  statement {
    sid       = "PutOnlyOverwrites"
    effect    = "Deny"
    actions   = ["ssm:PutParameter"]
    resources = [local.prod_parameters]
    condition {
      test     = "StringEquals"
      variable = "ssm:Overwrite"
      values   = ["false"]
    }
  }

  # A parameter tagged env=prod outside prod's path gets no put either.
  statement {
    sid           = "PutOnlyInProdPath"
    effect        = "Deny"
    actions       = ["ssm:PutParameter"]
    not_resources = [local.prod_parameters]
    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/env"
      values   = ["prod"]
    }
  }
}

# ci-dev-deploy's guard and dev's boundary: no exception.
data "aws_iam_policy_document" "guard_dev" {
  source_policy_documents = [data.aws_iam_policy_document.guard_common.json]

  statement {
    sid       = "DenyProdByTag"
    effect    = "Deny"
    actions   = ["*"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/env"
      values   = ["prod"]
    }
  }

  statement {
    sid       = "DenyProdParameters"
    effect    = "Deny"
    actions   = ["*"]
    resources = [local.prod_parameters]
  }
}

# What every guarded principal shares.
data "aws_iam_policy_document" "guard_common" {
  # Nothing may create or tag a resource env=prod (the exception's overwrite sends no tags).
  statement {
    sid       = "DenyTaggingProd"
    effect    = "Deny"
    actions   = ["*"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "aws:RequestTag/env"
      values   = ["prod"]
    }
  }

  statement {
    sid       = "DenyProdByName"
    effect    = "Deny"
    actions   = ["*"]
    resources = local.prod_arns
  }

  statement {
    sid       = "DenyChangingTheGuard"
    effect    = "Deny"
    actions   = ["iam:*"]
    resources = local.guard_holders
  }

  # A role a guarded principal makes or grants to carries the dev boundary, so the guard cannot be stepped around
  # by a new role, or by widening another role in the account.
  statement {
    sid       = "DenyRolesOutsideTheBoundary"
    effect    = "Deny"
    actions   = ["iam:CreateRole", "iam:PutRolePermissionsBoundary", "iam:AttachRolePolicy", "iam:PutRolePolicy"]
    resources = ["*"]
    condition {
      test     = "StringNotEquals"
      variable = "iam:PermissionsBoundary"
      values   = [local.dev_boundary]
    }
  }

  statement {
    sid    = "DenyLeavingTheBoundary"
    effect = "Deny"
    actions = [
      "iam:DeleteRolePermissionsBoundary",
      "iam:CreateUser",
      "iam:CreateAccessKey",
      "iam:CreateLoginProfile",
      "iam:UpdateLoginProfile",
      "iam:CreateOpenIDConnectProvider",
    ]
    resources = ["*"]
  }
}

# The boundary every role dev's stack makes carries: anything, inside the guard.
resource "aws_iam_policy" "dev_boundary" {
  name        = "mypaisa-dev-boundary"
  description = "Permissions boundary for every role dev's stack makes: anything, but never prod (MA-26)"
  policy      = data.aws_iam_policy_document.dev_boundary.json
}

data "aws_iam_policy_document" "dev_boundary" {
  source_policy_documents = [data.aws_iam_policy_document.guard_dev.json]

  statement {
    sid       = "AllowInsideTheGuard"
    effect    = "Allow"
    actions   = ["*"]
    resources = ["*"]
  }
}
