# The whole stack, once, but its SSM parameters (ARCHITECTURE §17.4). infra/dev and infra/prod call it with their own
# settings; the parameters are infra/modules/secrets' (MA-25).
#
# 1.11 and the AWS provider 5.87 are the floors for write-only arguments (value_wo), so no secret reaches state
# (MA-159). The archive provider zips dev's probe Lambda (MA-231).
terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.87, < 7.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = ">= 2.4, < 3.0"
    }
  }
}
