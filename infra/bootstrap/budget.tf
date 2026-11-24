# The account's hard backstop behind the app's own £50 cap (ARCHITECTURE §14.2, MA-137): one cost budget, in
# dollars, alerting on actual and forecast spend. Monitoring is free. Its action that stops dev's schedules joins
# with the schedules it stops (MA-137); until then it only alerts.

resource "aws_budgets_budget" "backstop" {
  name         = "mypaisa-account-backstop"
  budget_type  = "COST"
  limit_amount = tostring(var.budget_limit_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  dynamic "notification" {
    for_each = {
      actual80    = { type = "ACTUAL", threshold = 80 }
      actual100   = { type = "ACTUAL", threshold = 100 }
      forecast100 = { type = "FORECASTED", threshold = 100 }
    }
    content {
      comparison_operator        = "GREATER_THAN"
      notification_type          = notification.value.type
      threshold                  = notification.value.threshold
      threshold_type             = "PERCENTAGE"
      subscriber_email_addresses = var.budget_alert_emails
    }
  }
}
