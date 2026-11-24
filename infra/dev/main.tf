# MyPaisa's dev environment: the module with dev's settings, in its own state (ARCHITECTURE §17.4).
# Run it through infra/scripts/tf.sh dev, never bare terraform.
terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.87, < 7.0"
    }
  }

  backend "s3" {
    bucket       = "wealth-tracker-tfstate"
    key          = "mypaisa-agent/dev/infra.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      app   = "mypaisa"
      env   = "dev"
      owner = "arun"
    }
  }
}

variable "alert_email" {
  description = "The admin's address for mypaisa-dev-admin-alerts; never written in the repository (MA-231)."
  type        = string
  sensitive   = true
}

module "mypaisa" {
  source = "../modules/mypaisa"

  env          = "dev"
  protect_data = false

  # The watch tower (MA-231). The admin's address never sits in this public repository: TF_VAR_alert_email on the
  # laptop, the MYPAISA_ALERT_EMAIL secret in CI.
  alert_email = var.alert_email

  # Transaction Search and Application Signals are one setting per account; dev's root owns them, and prod's spans
  # ride on them (Arun, 24 Nov 2026, MA-231). The probe proves the tower live until the real images land (MA-237).
  owns_account_observability = true
  probe                      = true
}

# X-Ray made aws/spans on dev's first span (24 Nov 2026, MA-231); the module holds its 30 days from here on.
import {
  to = module.mypaisa.aws_cloudwatch_log_group.spans[0]
  id = "aws/spans"
}

output "table_name" {
  value = module.mypaisa.table_name
}

output "bucket_names" {
  value = module.mypaisa.bucket_names
}

output "dashboard_name" {
  value = module.mypaisa.dashboard_name
}

output "alerts_topic_arn" {
  value = module.mypaisa.alerts_topic_arn
}

output "probe_function_name" {
  value = module.mypaisa.probe_function_name
}
