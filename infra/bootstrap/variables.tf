variable "github_owner" {
  description = "The repository's owner login."
  type        = string
  default     = "gilipersonal"
}

variable "github_owner_id" {
  description = "The owner's permanent numeric id, part of GitHub's immutable OIDC subject."
  type        = number
  default     = 325700199
}

variable "github_repo" {
  description = "The repository's name."
  type        = string
  default     = "mypaisa-agent"
}

variable "github_repo_id" {
  description = "The repository's permanent numeric id: the CI roles trust this repository and no other."
  type        = number
  default     = 1430843725
}

variable "prod_reviewer_github_ids" {
  description = "GitHub user ids whose approval a prod deploy waits for (Arun)."
  type        = list(number)
  default     = [65853426]
}

variable "state_bucket" {
  description = "The account's Terraform state bucket, shared with the wealth tracker; MyPaisa's keys sit under mypaisa-agent/."
  type        = string
  default     = "wealth-tracker-tfstate"
}

variable "budget_limit_usd" {
  description = "The account's hard backstop in dollars: about £75 (ARCHITECTURE §14.2). Raising it is a pull request."
  type        = number
  default     = 95
}

variable "budget_alert_emails" {
  description = "Who the backstop emails. Passed at apply time (TF_VAR_budget_alert_emails), never committed."
  type        = list(string)
  sensitive   = true
}
