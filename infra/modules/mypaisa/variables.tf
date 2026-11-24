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

variable "evals_key" {
  description = "Whether this environment holds the evals workspace's key (dev only; MA-21, MA-250)."
  type        = bool
  default     = false
}
