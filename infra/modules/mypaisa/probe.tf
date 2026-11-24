# Dev's probe Lambda (Arun, 24 Nov 2026, MA-231): the watch tower proved live before the real images land. A zip with
# the OpenTelemetry layer, because it has no image; the real functions are images with the same layer unzipped into
# /opt (§9.3), and take the same environment and role policies from this module's outputs. It carries a `live` alias,
# as every function the release finds by its tags must (scripts/release.py). Removed when the first real function
# ships (MA-347).

locals {
  # The role policies every function carries (§9.3): logs, X-Ray write, and Application Signals.
  lambda_role_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess",
    "arn:aws:iam::aws:policy/CloudWatchLambdaApplicationSignalsExecutionRolePolicy",
  ]

  # Every role dev's stack makes carries dev's boundary (infra/bootstrap/prod_guard.tf); prod's roles carry none.
  role_boundary = var.env == "dev" ? "arn:aws:iam::${local.account_id}:policy/mypaisa-dev-boundary" : null

  # §9.3: the wrapper, the service name and env; the release adds build and version to OTEL_RESOURCE_ATTRIBUTES.
  otel_environment = { for p, n in local.function_names : p => {
    AWS_LAMBDA_EXEC_WRAPPER              = "/opt/otel-instrument"
    OTEL_SERVICE_NAME                    = n
    OTEL_AWS_APPLICATION_SIGNALS_ENABLED = "true"
    OTEL_RESOURCE_ATTRIBUTES             = "env=${var.env}"
  } }
}

data "archive_file" "probe" {
  count = var.probe ? 1 : 0

  type        = "zip"
  source_file = "${path.module}/probe/handler.py"
  output_path = "${path.root}/.build/probe.zip"
}

data "aws_iam_policy_document" "lambda_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "probe" {
  count = var.probe ? 1 : 0

  name                 = "${local.prefix}-probe"
  description          = "Dev's probe Lambda: logs, X-Ray and Application Signals, nothing else (MA-231)"
  assume_role_policy   = data.aws_iam_policy_document.lambda_trust.json
  permissions_boundary = local.role_boundary
}

resource "aws_iam_role_policy_attachment" "probe" {
  for_each = var.probe ? toset(local.lambda_role_policy_arns) : toset([])

  role       = aws_iam_role.probe[0].name
  policy_arn = each.value
}

resource "aws_lambda_function" "probe" {
  count = var.probe ? 1 : 0

  function_name    = local.function_names["probe"]
  description      = "Dev's probe: proves the watch tower live (MA-231)"
  role             = aws_iam_role.probe[0].arn
  runtime          = "python3.13"
  architectures    = ["arm64"]
  handler          = "handler.handler"
  filename         = data.archive_file.probe[0].output_path
  source_code_hash = data.archive_file.probe[0].output_base64sha256
  memory_size      = 256
  timeout          = 15
  layers           = [var.otel_layer_arn]

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = merge(local.otel_environment["probe"], {
      OTEL_RESOURCE_ATTRIBUTES = "env=${var.env},build=${substr(data.archive_file.probe[0].output_sha256, 0, 12)},version=probe"
    })
  }

  depends_on = [aws_cloudwatch_log_group.function, aws_iam_role_policy_attachment.probe]
}

# The release publishes a version and moves this alias on every run (scripts/release.py); Terraform makes it once.
resource "aws_lambda_alias" "probe_live" {
  count = var.probe ? 1 : 0

  name             = "live"
  function_name    = aws_lambda_function.probe[0].function_name
  function_version = "$LATEST"

  lifecycle {
    ignore_changes = [function_version]
  }
}
