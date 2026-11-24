# Every SSM parameter of one environment (ARCHITECTURE §17.4, MA-25). infra/dev-secrets and infra/prod-secrets call it.
#
# 1.11 and the AWS provider 5.87 are the floors for write-only arguments (value_wo), so no secret reaches state
# (MA-159).
terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.87, < 7.0"
    }
  }
}
