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

module "mypaisa" {
  source = "../modules/mypaisa"

  env          = "dev"
  protect_data = false
  evals_key    = true
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
