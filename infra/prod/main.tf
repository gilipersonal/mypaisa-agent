# MyPaisa's prod environment: the module with prod's settings, in its own state (ARCHITECTURE §17.4).
# Run it through infra/scripts/tf.sh prod, never bare terraform.
# Applied only by CI, from the prod environment after Arun approves (MA-107); a local apply is refused.
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
    key          = "mypaisa-agent/prod/infra.tfstate"
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

module "mypaisa" {
  source = "../modules/mypaisa"

  env          = "prod"
  protect_data = true
  evals_key    = false
}

output "table_name" {
  value = module.mypaisa.table_name
}

output "bucket_names" {
  value = module.mypaisa.bucket_names
}

output "parameter_names" {
  value = module.mypaisa.parameter_names
}
