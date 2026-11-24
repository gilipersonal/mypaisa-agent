# The one ECR repository the Lambda images live in, and the role that alone pushes to it (ARCHITECTURE §17.4, MA-237).
#
# Shared by dev and prod, so prod runs the very digest dev tested; that is why it lives here, beside the roles, and
# not in either environment's root. The images are built on GitHub's free ubuntu-24.04-arm runner (the repository is
# public; Arun, 24 Nov 2026: "MA-237, can we do the builds on Github ? We are public now"), so nothing here builds:
# no CodeBuild project, no connection to GitHub and no build-minute budget.

resource "aws_ecr_repository" "images" {
  name = "mypaisa"

  # A tag names one build for good: lambda-<sha> and stream-<sha> are never pushed twice, so a digest dev tested
  # cannot be swapped under prod.
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  # Prod's functions run from it; it goes only by a change to this line that Arun reads.
  lifecycle {
    prevent_destroy = true
  }
}

# Untagged layers (a build superseded mid-push) go after a day. Each target keeps its last five tagged images: prod's,
# its rollback, dev's and two more. A code-only build adds one small layer (the Dockerfile keeps the package apart from
# its dependencies), so the repository stays near the base images' size, a few cents a month.
resource "aws_ecr_lifecycle_policy" "images" {
  repository = aws_ecr_repository.images.name
  policy = jsonencode({
    rules = concat(
      [{
        rulePriority = 1
        description  = "Untagged images go after a day"
        selection    = { tagStatus = "untagged", countType = "sinceImagePushed", countUnit = "days", countNumber = 1 }
        action       = { type = "expire" }
      }],
      [for i, target in ["lambda", "stream"] : {
        rulePriority = i + 2
        description  = "Keep the last five ${target} images"
        selection    = { tagStatus = "tagged", tagPrefixList = ["${target}-"], countType = "imageCountMoreThan", countNumber = 5 }
        action       = { type = "expire" }
      }],
    )
  })
}

# Lambda pulls the image for MyPaisa's own functions only. Written here, so Lambda never adds it on its own at the
# first deploy (which would be drift).
data "aws_iam_policy_document" "images_repository" {
  statement {
    sid     = "LambdaPullsForMyPaisa"
    effect  = "Allow"
    actions = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "aws:sourceArn"
      values   = ["arn:aws:lambda:us-east-1:${local.account_id}:function:mypaisa-*"]
    }
  }
}

resource "aws_ecr_repository_policy" "images" {
  repository = aws_ecr_repository.images.name
  policy     = data.aws_iam_policy_document.images_repository.json
}

# --- ci-image: the image job's push, from main only ---------------------------------------------------------------
#
# Trusted only for a push to main (a pull request builds without pushing, and holds no role). It pushes to this one
# repository and does nothing else in the account.

data "aws_iam_policy_document" "ci_image_trust" {
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
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["${local.repo_subject}:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "ci_image" {
  name                 = "mypaisa-ci-image"
  description          = "GitHub CI for ${var.github_owner}/${var.github_repo}: pushes the Lambda images to ECR from main (MA-237)"
  assume_role_policy   = data.aws_iam_policy_document.ci_image_trust.json
  max_session_duration = 3600
}

data "aws_iam_policy_document" "ci_image_push" {
  # The login token is account-wide by design; it grants nothing on its own.
  statement {
    sid       = "Login"
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid    = "PushToTheOneRepository"
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = [aws_ecr_repository.images.arn]
  }
}

resource "aws_iam_role_policy" "ci_image_push" {
  name   = "mypaisa-bootstrap-ci-image-push"
  role   = aws_iam_role.ci_image.name
  policy = data.aws_iam_policy_document.ci_image_push.json
}
