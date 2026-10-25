# AWS changes: Terraform only, the MCP reads, prod through CI

Arun, 24 Oct 2026 (MA-106): "all things on AWS will be controlled using MCP and
applied via terraform only, deployments to prod will be via Github CI".
`ARCHITECTURE.md` §18 holds the design; this file is how to behave.

## The two environments

One account (`545595341442`, `us-east-1`), every component twice:
`mypaisa-dev-<part>` and `mypaisa-prod-<part>`, every resource tagged `env`.
SSM paths are `/mypaisa-agent/dev/...` and `/mypaisa-agent/prod/...`. Dev holds
synthetic data; prod holds the household's.

## What to do, and what never to do

| Act | Here |
| --- | --- |
| Read anything in AWS (describe, list, logs, metrics, costs, Terraform state) | the AWS MCP, read-only calls; no asking |
| Create, change or delete any AWS resource | **Terraform only**, in `infra/`; never the console, the CLI, the MCP or a script |
| `terraform plan` for dev or prod | do it, no asking; plan to a file (`-out`) and read the whole plan |
| `terraform apply` on dev | the saved plan file only, after reading it; say what it changes and what it costs before applying |
| `terraform apply` on prod | **never from the laptop**; only the release workflow, after Arun approves in the GitHub `prod` environment |
| `infra/bootstrap` (the CI and developer roles) | applied from the laptop once, and again only when Arun asks |
| Deploy code to prod | only the release workflow from `main`; never `aws lambda update-*` by hand |
| Put a secret value | Arun, by hand, into SSM (`read -rs` then `put-parameter --overwrite`), after the apply that made the parameter; Terraform creates the parameter with a write-only placeholder (`value_wo` and `value_wo_version`, Terraform 1.11 or later and the `hashicorp/aws` provider 5.87 or later), never `value` or `insecure_value`: the AWS provider stores a SecureString's decrypted value in state on every refresh, whatever `ignore_changes` says, and a write-only value is never stored (MA-159). `value_wo_version` is set once and never bumped: a bump sends the placeholder again, over the real value. A secret is rotated by hand, the same way. Never put a value before Terraform has made its parameter: the create then fails, and importing it would read the value into state |
| Read a secret value | never; code reads it at run time, and nothing prints it |
| Write data into dev | only through the seed scripts (`scripts/seed.sh dev`) or the app |
| Write data into prod | only through the app: the bot's guided flows and the Excel importer (MA-111); no script, no console edit, no MCP call |
| Delete a prod table, bucket or user pool | never; prod's data resources carry `prevent_destroy` and deletion protection |
| Change the `mypaisapp.com` zone or certificate | not here; they belong to `wealth-tracker/infra/terraform/dns/` until MA-97 hands them over; MyPaisa only adds its own records |
| Add anything that costs money | ask first, with the price |

## Drift

If the nightly drift check (MA-108) or a plan shows a difference nobody made in
Terraform, do not "fix" it in AWS. Say what changed, then bring it back through
Terraform: import it, change the code to match, or let the next apply put it
right, as Arun chooses.

## Names and text

No em dashes in AWS resource names, tags or descriptions; use hyphens.
