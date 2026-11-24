# The watch tower (ARCHITECTURE §9.3 to §9.9, MA-231): built before the first Lambda runs, so the first run is already
# logged, traced, measured and alarmed, and nothing about watching is ever made by hand.
#
# Everything is keyed on the fixed names ARCHITECTURE gives the functions (§9.3) and the queues (§19.2), so it stands
# before they do: a log group made ahead keeps its 14 days (Lambda would make one that never expires), and an alarm on
# a metric that has no data yet waits in INSUFFICIENT_DATA, treated as fine. The Lambda, queue and API stories bring
# the things watched; they take the OpenTelemetry settings and the role policies from this module's outputs.

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.region

  # §9.5: the custom metrics' namespace and names, named once here and read by code from the outputs.
  metric_namespace = "${var.metric_namespace_prefix}/${var.env}"
  m                = var.metric_names

  # Every function, by its part, and dev's probe while it stands.
  function_parts = concat(var.functions, var.probe ? ["probe"] : [])
  function_names = { for p in local.function_parts : p => "${local.prefix}-${p}" }

  alert_actions = [aws_sns_topic.alerts.arn]

  # Where the saved queries and the dashboard's tables read. aws/spans is the account's, made by X-Ray.
  log_groups = {
    functions = [for p in local.function_parts : aws_cloudwatch_log_group.function[p].name]
    stream    = contains(local.function_parts, "stream") ? [aws_cloudwatch_log_group.function["stream"].name] : []
    api       = contains(local.function_parts, "api") ? [aws_cloudwatch_log_group.function["api"].name] : []
    access    = [aws_cloudwatch_log_group.api_access.name]
    spans     = ["aws/spans"]
  }
}

# --- Log groups: 14 days (§9.9) --------------------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "function" {
  for_each = local.function_names

  name              = "/aws/lambda/${each.value}"
  retention_in_days = 14
}

# The api's access log in JSON (§9.7): request id, trace id, route, status, latency, the member's hash, never a body.
# The API's stage writes to it when it is made (MA-30).
resource "aws_cloudwatch_log_group" "api_access" {
  name              = "${local.prefix}-api-access"
  retention_in_days = 14
}

# --- The alarms' first route (§9.6) ----------------------------------------------------------------------------------
#
# Every alarm goes here from phase 0; phase 1 adds the RunRecord and the owner's outbox (MA-29). Not KMS-encrypted:
# CloudWatch alarms cannot publish to a topic under the AWS-managed SNS key, and a customer key costs money
# (infra/.trivyignore). The topic carries alarm names and states, never a household's content (§9.9).
resource "aws_sns_topic" "alerts" {
  name = "${local.prefix}-admin-alerts"
}

# An email subscription waits until the admin follows the link AWS sends; Terraform cannot confirm it.
resource "aws_sns_topic_subscription" "admin" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# --- The alarms that need no code (§9.6) -----------------------------------------------------------------------------

locals {
  function_alarms = merge([
    for p, n in local.function_names : {
      "${p}-errors"    = { function = n, metric = "Errors" }
      "${p}-throttles" = { function = n, metric = "Throttles" }
    }
  ]...)
}

resource "aws_cloudwatch_metric_alarm" "function" {
  for_each = local.function_alarms

  alarm_name          = "${local.prefix}-${each.key}"
  alarm_description   = "Any ${lower(each.value.metric)} in ${each.value.function} (ARCHITECTURE §9.6)."
  namespace           = "AWS/Lambda"
  metric_name         = each.value.metric
  dimensions          = { FunctionName = each.value.function }
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alert_actions
  ok_actions          = local.alert_actions
}

resource "aws_cloudwatch_metric_alarm" "queue_age" {
  for_each = var.queues

  alarm_name          = "${local.prefix}-${each.key}-age"
  alarm_description   = "The oldest message on ${local.prefix}-${each.value.queue} is over five minutes old (ARCHITECTURE §9.6)."
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateAgeOfOldestMessage"
  dimensions          = { QueueName = "${local.prefix}-${each.value.queue}" }
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 1
  threshold           = 300
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alert_actions
  ok_actions          = local.alert_actions
}

resource "aws_cloudwatch_metric_alarm" "dead_letters" {
  for_each = var.queues

  alarm_name          = "${local.prefix}-${each.key}-dead-letters"
  alarm_description   = "${local.prefix}-${each.value.dlq} holds a message: it failed too often (ARCHITECTURE §9.6, §19.3)."
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  dimensions          = { QueueName = "${local.prefix}-${each.value.dlq}" }
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alert_actions
  ok_actions          = local.alert_actions
}

# The api's 5xx and its p95 over 2 s for fifteen minutes: they need the API's id, so they appear when MA-30 passes it.
resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  count = var.api_id == null ? 0 : 1

  alarm_name          = "${local.prefix}-api-5xx"
  alarm_description   = "The api answered with a 5xx (ARCHITECTURE §9.6)."
  namespace           = "AWS/ApiGateway"
  metric_name         = "5xx"
  dimensions          = { ApiId = var.api_id }
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alert_actions
  ok_actions          = local.alert_actions
}

resource "aws_cloudwatch_metric_alarm" "api_latency" {
  count = var.api_id == null ? 0 : 1

  alarm_name          = "${local.prefix}-api-latency"
  alarm_description   = "The api's p95 latency is over 2 s for fifteen minutes (ARCHITECTURE §9.6)."
  namespace           = "AWS/ApiGateway"
  metric_name         = "Latency"
  dimensions          = { ApiId = var.api_id }
  extended_statistic  = "p95"
  period              = 300
  evaluation_periods  = 3
  threshold           = 2000
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alert_actions
  ok_actions          = local.alert_actions
}

# The watching itself (§9.6): aws/spans taking in more than 1 GB a day, so observability can never run away. One per
# account, with the account's settings below.
resource "aws_cloudwatch_metric_alarm" "spans_ingestion" {
  count = var.owns_account_observability ? 1 : 0

  alarm_name          = "${local.prefix}-spans-ingestion"
  alarm_description   = "aws/spans took in more than 1 GB in a day: the account's tracing is running away (ARCHITECTURE §9.6, §9.9)."
  namespace           = "AWS/Logs"
  metric_name         = "IncomingBytes"
  dimensions          = { LogGroupName = "aws/spans" }
  statistic           = "Sum"
  period              = 86400
  evaluation_periods  = 1
  threshold           = 1073741824
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alert_actions
  ok_actions          = local.alert_actions
}

# One message, not ten, when something large breaks (§9.6): any function error, any dead letter, the api's 5xx.
resource "aws_cloudwatch_composite_alarm" "unhealthy" {
  alarm_name        = "${local.prefix}-unhealthy"
  alarm_description = "Something large is broken in ${var.env}: a function error, a dead letter or the api's 5xx (ARCHITECTURE §9.6)."
  alarm_rule = join(" OR ", concat(
    [for p in local.function_parts : "ALARM(\"${aws_cloudwatch_metric_alarm.function["${p}-errors"].alarm_name}\")"],
    [for k, a in aws_cloudwatch_metric_alarm.dead_letters : "ALARM(\"${a.alarm_name}\")"],
    [for a in aws_cloudwatch_metric_alarm.api_5xx : "ALARM(\"${a.alarm_name}\")"],
  ))
  alarm_actions = local.alert_actions
  ok_actions    = local.alert_actions
}

# --- The account's tracing (§9.3, §9.9): one owner, dev's root ----------------------------------------------------
#
# Transaction Search keeps every span in aws/spans with W3C ids; X-Ray writes there through this policy. Indexing
# stays at the free 1% of spans. Application Signals' discovery is its service-linked role (StartDiscovery makes
# exactly that role). aws/spans is made by X-Ray on the first span, and imported below.

resource "aws_cloudwatch_log_resource_policy" "transaction_search" {
  count = var.owns_account_observability ? 1 : 0

  policy_name = "TransactionSearchXRayAccess"
  policy_document = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "TransactionSearchXRayAccess"
      Effect    = "Allow"
      Principal = { Service = "xray.amazonaws.com" }
      Action    = "logs:PutLogEvents"
      Resource = [
        "arn:aws:logs:${local.region}:${local.account_id}:log-group:aws/spans:*",
        "arn:aws:logs:${local.region}:${local.account_id}:log-group:/aws/application-signals/data:*",
      ]
      Condition = {
        ArnLike      = { "aws:SourceArn" = "arn:aws:xray:${local.region}:${local.account_id}:*" }
        StringEquals = { "aws:SourceAccount" = local.account_id }
      }
    }]
  })
}

resource "aws_xray_trace_segment_destination" "transaction_search" {
  count = var.owns_account_observability ? 1 : 0

  destination = "CloudWatchLogs"

  depends_on = [aws_cloudwatch_log_resource_policy.transaction_search]
}

resource "aws_xray_indexing_rule" "default" {
  count = var.owns_account_observability ? 1 : 0

  name = "Default"
  rule {
    probabilistic {
      desired_sampling_percentage = 1
    }
  }

  depends_on = [aws_xray_trace_segment_destination.transaction_search]
}

# X-Ray makes aws/spans on the first span; infra/dev imports it, so its 30 days (§9.9) are held here, not by default.
resource "aws_cloudwatch_log_group" "spans" {
  count = var.owns_account_observability ? 1 : 0

  name              = "aws/spans"
  retention_in_days = 30
}

resource "aws_iam_service_linked_role" "application_signals" {
  count = var.owns_account_observability ? 1 : 0

  aws_service_name = "application-signals.cloudwatch.amazonaws.com"
}

# --- The saved queries (§9.5) ----------------------------------------------------------------------------------------
#
# One file each in queries/: its first line names the log groups it reads (`# groups: functions,spans`), the rest is
# the query. The fields they read (run_id, trace_id, member, feature, model, door, trigger) are the contract the code's
# log lines keep (§9.3, §9.4).

locals {
  query_files = fileset("${path.module}/queries", "*.logsinsights")
  queries = {
    for f in local.query_files : trimsuffix(f, ".logsinsights") => {
      groups = split(",", regex("^# groups: ([a-z,]+)\n", file("${path.module}/queries/${f}"))[0])
      query  = trimspace(replace(file("${path.module}/queries/${f}"), "/^# groups: [a-z,]+\n/", ""))
    }
  }
}

resource "aws_cloudwatch_query_definition" "saved" {
  for_each = local.queries

  name            = "${local.prefix}/${each.key}"
  log_group_names = distinct(flatten([for g in each.value.groups : local.log_groups[g]]))
  query_string    = each.value.query
}

