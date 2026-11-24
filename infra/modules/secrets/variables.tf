variable "env" {
  description = "dev or prod: the `<env>` in every parameter's path."
  type        = string

  validation {
    condition     = contains(["dev", "prod"], var.env)
    error_message = "env is dev or prod."
  }
}

variable "evals_key" {
  description = "Whether this environment holds the evals workspace's key (dev only; MA-21, MA-250)."
  type        = bool
  default     = false
}
