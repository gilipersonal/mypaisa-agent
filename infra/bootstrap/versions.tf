# The roles CI and the laptop work through, and the account-wide pieces that belong to no environment.
#
# Applied from the laptop, once and again only when Arun asks (.claude/rules/aws-changes.md): CI cannot assume a
# role that does not exist yet. Its own state key, beside dev's and prod's in the account's state bucket.
terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.87, < 7.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }

  backend "s3" {
    bucket       = "wealth-tracker-tfstate"
    key          = "mypaisa-agent/bootstrap/infra.tfstate"
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
      env   = "shared"
      owner = "arun"
    }
  }
}

# Reads GITHUB_TOKEN; the apply runs with `GITHUB_TOKEN=$(gh auth token)` (infra/README.md).
provider "github" {
  owner = var.github_owner
}
