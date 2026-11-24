variable "env" {
  description = "dev or prod: the `<env>` in every name, path and tag."
  type        = string

  validation {
    condition     = contains(["dev", "prod"], var.env)
    error_message = "env is dev or prod."
  }
}

variable "protect_data" {
  description = "Deletion protection, point-in-time recovery and object versioning on the data stores (prod)."
  type        = bool
}

# --- The watch tower (ARCHITECTURE §9.3 to §9.9, MA-231) -----------------------------------------------------------

variable "alert_email" {
  description = <<-EOT
    The admin's address, which the mypaisa-<env>-admin-alerts topic emails. The repository is public, so it is never
    written in it: TF_VAR_alert_email on the laptop, the MYPAISA_ALERT_EMAIL secret in CI. Sensitive, so a plan posted
    on a pull request shows it as (sensitive value).
  EOT
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$", var.alert_email))
    error_message = "alert_email is the admin's address: set TF_VAR_alert_email (laptop) or the MYPAISA_ALERT_EMAIL secret (CI)."
  }
}

variable "functions" {
  description = "The Lambda functions, by their part of mypaisa-<env>-<part> (§9.3): each gets its log group and its alarms."
  type        = list(string)
  default     = ["api", "agent", "sender", "worker", "stream"]
}

variable "queues" {
  description = "Each SQS queue and its dead-letter queue, by part of mypaisa-<env>-<name> (§19.2, §19.3)."
  type = map(object({
    queue = string
    dlq   = string
  }))
  default = {
    updates = { queue = "updates.fifo", dlq = "updates-dlq.fifo" }
    outbox  = { queue = "outbox.fifo", dlq = "outbox-dlq.fifo" }
    work    = { queue = "work", dlq = "work-dlq" }
  }
}

variable "api_id" {
  description = "The HTTP API's id. Null until the story that makes the API passes it (MA-30); then its 5xx and latency alarms and widgets appear."
  type        = string
  default     = null
}

variable "metric_namespace_prefix" {
  description = "The custom metrics' namespace is <prefix>/<env> (§9.5): MyPaisa/dev, MyPaisa/prod."
  type        = string
  default     = "MyPaisa"
}

variable "metric_names" {
  description = "The fixed custom metric names of §9.5, sixteen with no dimensions. Code reads them from the module's outputs, so each is named once."
  type        = map(string)
  default = {
    schedule_lateness    = "ScheduleLateness"
    model_cost_usd       = "ModelCostUSD"
    tokens               = "Tokens"
    cache_read_tokens    = "CacheReadTokens"
    time_to_first_token  = "TimeToFirstToken"
    refusals             = "Refusals"
    template_fallbacks   = "TemplateFallbacks"
    tool_errors          = "ToolErrors"
    proposals_cancelled  = "ProposalsCancelled"
    stream_resyncs       = "StreamResyncs"
    push_failures        = "PushFailures"
    price_freshness_days = "PriceFreshnessDays"
    audit_chain_ok       = "AuditChainOk"
    client_first_word    = "ClientFirstWord"
    client_errors        = "ClientErrors"
    client_crashes       = "ClientCrashes"
  }

  validation {
    condition     = length(var.metric_names) == 16
    error_message = "§9.5 fixes sixteen custom metrics; a new one is a change to ARCHITECTURE first."
  }
}

variable "owns_account_observability" {
  description = <<-EOT
    Transaction Search (the X-Ray destination, its indexing rule and the logs policy for aws/spans), Application
    Signals' discovery and the aws/spans ingestion alarm are one setting per account and region, and dev and prod
    share the account. One root owns them: dev's (Arun, 24 Nov 2026, MA-231). Prod's spans ride on it.
  EOT
  type        = bool
  default     = false
}

variable "probe" {
  description = "Dev's throwaway probe Lambda (Arun, 24 Nov 2026, MA-231): proves the tower live until the real images land (MA-237)."
  type        = bool
  default     = false
}

variable "otel_layer_arn" {
  description = "The AWS Distro for OpenTelemetry Python layer, Application Signals build, for the probe (zip). The images unzip the same layer into /opt (§9.3)."
  type        = string
  default     = "arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetryDistroPython:35"
}
