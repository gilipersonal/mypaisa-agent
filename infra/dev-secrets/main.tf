# MyPaisa dev's SSM parameters, in a state of their own (ARCHITECTURE §17.4, MA-25): ci-plan, which plans infra/dev on
# every pull request, never plans this root, so it never refreshes a secret. Run it through
# infra/scripts/tf.sh dev-secrets, never bare terraform; the laptop plans and applies it, then Arun puts each value.
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
    key          = "mypaisa-agent/dev/secrets.tfstate"
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

module "secrets" {
  source = "../modules/secrets"

  env       = "dev"
  evals_key = true
}

output "parameter_names" {
  value = module.secrets.parameter_names
}
