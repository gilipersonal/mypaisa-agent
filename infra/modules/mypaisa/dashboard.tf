# The dashboard (ARCHITECTURE §9.5, MA-231): one per environment (three are free), eight panels.
#
# Widgets carry a width and a height but no position: CloudWatch lays them out in order, so a panel that gains a widget
# (the api's, once MA-30 passes its id) moves nothing by hand. Every widget is bound to a metric, an alarm or a log
# group this module names; the custom metrics stay empty until the code that emits them lands.

locals {
  fn_list = [for p in local.function_parts : local.function_names[p]]

  # Each metric widget, in panel order: a title, its lines, the statistic and the period.
  lambda_lines = { for metric in ["Errors", "Throttles", "Duration", "ConcurrentExecutions"] : metric => [
    for n in local.fn_list : ["AWS/Lambda", metric, "FunctionName", n]
  ] }

  # Application Signals' own metrics per function: Lambda reports under the environment lambda:default.
  signals_lines = { for metric in ["Fault", "Latency"] : metric => [
    for n in local.fn_list : ["ApplicationSignals", metric, "Service", n, "Environment", "lambda:default"]
  ] }

  custom = { for k, name in local.m : k => [local.metric_namespace, name] }

  queue_lines = {
    age     = [for k, q in var.queues : ["AWS/SQS", "ApproximateAgeOfOldestMessage", "QueueName", "${local.prefix}-${q.queue}"]]
    depth   = [for k, q in var.queues : ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", "${local.prefix}-${q.queue}"]]
    letters = [for k, q in var.queues : ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", "${local.prefix}-${q.dlq}"]]
  }

  sources = join(" | ", [for g in local.log_groups.functions : "SOURCE '${g}'"])

  panels = [
    {
      title = "Today"
      note  = "Application Signals' service map is in the console: CloudWatch, Application Signals, Services."
      metrics = concat([
        { title = "Errors by function", lines = local.lambda_lines.Errors, stat = "Sum", period = 300 },
        { title = "Duration p95 by function (ms)", lines = local.lambda_lines.Duration, stat = "p95", period = 300 },
        { title = "Application Signals: faults", lines = local.signals_lines.Fault, stat = "Sum", period = 300 },
        { title = "Application Signals: latency p95 (ms)", lines = local.signals_lines.Latency, stat = "p95", period = 300 },
        ], var.api_id == null ? [] : [
        { title = "The api: 5xx", lines = [["AWS/ApiGateway", "5xx", "ApiId", var.api_id]], stat = "Sum", period = 300 },
        { title = "The api: latency p95 (ms)", lines = [["AWS/ApiGateway", "Latency", "ApiId", var.api_id]], stat = "p95", period = 300 },
      ])
      alarms = true
      logs   = []
    },
    {
      title = "The chat"
      note  = ""
      metrics = [
        { title = "Time to the first word, as the doors saw it, p95 (ms)", lines = [local.custom.client_first_word], stat = "p95", period = 300 },
        { title = "Stream resyncs and push failures", lines = [local.custom.stream_resyncs, local.custom.push_failures], stat = "Sum", period = 300 },
        { title = "Open streams (the stream function's concurrency)", lines = [for l in local.lambda_lines.ConcurrentExecutions : l if l[3] == "${local.prefix}-stream"], stat = "Maximum", period = 300 },
      ]
      alarms = false
      logs   = []
    },
    {
      title = "The model"
      note  = ""
      metrics = [
        { title = "Cost by day (USD)", lines = [local.custom.model_cost_usd], stat = "Sum", period = 86400 },
        { title = "Tokens and cache reads", lines = [local.custom.tokens, local.custom.cache_read_tokens], stat = "Sum", period = 3600 },
        { title = "Time to the first token p95 (ms)", lines = [local.custom.time_to_first_token], stat = "p95", period = 300 },
        { title = "Refusals and template fallbacks", lines = [local.custom.refusals, local.custom.template_fallbacks], stat = "Sum", period = 3600 },
      ]
      alarms = false
      logs = [{
        title = "Today's cost by feature and model"
        query = "${local.sources} | filter ispresent(${local.m.model_cost_usd}) | stats sum(${local.m.model_cost_usd}) as usd by feature, model | sort usd desc"
      }]
    },
    {
      title = "Tools"
      note  = ""
      metrics = [
        { title = "Tool errors", lines = [local.custom.tool_errors], stat = "Sum", period = 3600 },
      ]
      alarms = false
      logs = [{
        title = "The slowest tools (from the spans)"
        query = "SOURCE 'aws/spans' | filter name like /^tool / | stats pct(durationNano, 95) / 1000000 as p95_ms, count(*) as calls by name | sort p95_ms desc | limit 10"
      }]
    },
    {
      title = "Queues and schedules"
      note  = ""
      metrics = [
        { title = "Oldest message (s)", lines = local.queue_lines.age, stat = "Maximum", period = 60 },
        { title = "Messages waiting", lines = local.queue_lines.depth, stat = "Maximum", period = 60 },
        { title = "Dead letters", lines = local.queue_lines.letters, stat = "Maximum", period = 60 },
        { title = "Schedule lateness (s)", lines = [local.custom.schedule_lateness], stat = "Maximum", period = 300 },
      ]
      alarms = false
      logs   = []
    },
    {
      title = "Data"
      note  = ""
      metrics = [
        { title = "Oldest price (days)", lines = [local.custom.price_freshness_days], stat = "Maximum", period = 3600 },
        { title = "Audit chain holds (1 is yes)", lines = [local.custom.audit_chain_ok], stat = "Minimum", period = 86400 },
      ]
      alarms = false
      logs   = []
    },
    {
      title = "Quality"
      note  = ""
      metrics = [
        { title = "Proposals cancelled, by week", lines = [local.custom.proposals_cancelled], stat = "Sum", period = 604800 },
      ]
      alarms = false
      logs   = []
    },
    {
      title = "Deploys and alarms"
      note  = ""
      metrics = [
        { title = "Throttles by function", lines = local.lambda_lines.Throttles, stat = "Sum", period = 300 },
      ]
      alarms = false
      logs = [{
        title = "Deploys and alarms, in order"
        query = "${local.sources} | filter trigger in [\"deploy\", \"alarm\"] | fields @timestamp, trigger, run_id | sort @timestamp asc | limit 100"
      }]
    },
  ]

  alarm_arns = concat(
    [aws_cloudwatch_composite_alarm.unhealthy.arn],
    [for p in local.function_parts : aws_cloudwatch_metric_alarm.function["${p}-errors"].arn],
    [for a in aws_cloudwatch_metric_alarm.dead_letters : a.arn],
  )

  widgets = flatten([
    for panel in local.panels : concat(
      [{
        type       = "text"
        width      = 24
        height     = panel.note == "" ? 1 : 2
        properties = { markdown = panel.note == "" ? "## ${panel.title}" : "## ${panel.title}\n${panel.note}" }
      }],
      panel.alarms ? [{
        type       = "alarm"
        width      = 24
        height     = 3
        properties = { title = "Alarms", alarms = local.alarm_arns }
      }] : [],
      [for w in panel.metrics : {
        type   = "metric"
        width  = 8
        height = 6
        properties = {
          title   = w.title
          metrics = w.lines
          stat    = w.stat
          period  = w.period
          region  = local.region
          view    = "timeSeries"
        }
      }],
      [for l in panel.logs : {
        type   = "log"
        width  = 24
        height = 6
        properties = {
          title  = l.title
          query  = l.query
          region = local.region
          view   = "table"
        }
      }],
    )
  ])
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = local.prefix
  dashboard_body = jsonencode({ widgets = local.widgets })
}
