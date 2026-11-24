# MyPaisa prod's SSM parameters, in a state of their own (ARCHITECTURE §17.4, MA-25): ci-plan, which plans infra/prod on
# every pull request, never plans this root, so it never refreshes a secret. Run it through
# infra/scripts/tf.sh prod-secrets, never bare terraform. Planned and applied only by the release, with
# ci-prod-deploy in the prod environment after Arun approves (MA-107); a local apply is refused.
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
    key          = "mypaisa-agent/prod/secrets.tfstate"
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
      env   = "prod"
      owner = "arun"
    }
  }
}

module "secrets" {
  source = "../modules/secrets"

  env       = "prod"
  evals_key = false
}

output "parameter_names" {
  value = module.secrets.parameter_names
}
