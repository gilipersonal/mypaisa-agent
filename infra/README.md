# infra: MyPaisa's AWS, in Terraform only

Arun, 24 Oct 2026 (MA-106): every AWS change goes through Terraform, the AWS MCP only reads, and prod is
deployed only by GitHub CI. The rules are in `.claude/rules/aws-changes.md`; the design is ARCHITECTURE §17.

| Root | What it holds | Applied by | State key |
| --- | --- | --- | --- |
| `bootstrap/` | The developer role and its prod guard, the CI roles (`mypaisa-ci-plan`, `-dev-deploy`, `-prod-deploy`), dev's permissions boundary, the GitHub `dev` and `prod` environments, the account's budget backstop | Arun, from the laptop, once and then only when he asks | `mypaisa-agent/bootstrap/infra.tfstate` |
| `dev/` | `modules/mypaisa` with dev's settings | the laptop (developer role) or CI's `mypaisa-ci-dev-deploy` | `mypaisa-agent/dev/infra.tfstate` |
| `prod/` | `modules/mypaisa` with prod's settings | CI only, in the `prod` environment after Arun approves (MA-107) | `mypaisa-agent/prod/infra.tfstate` |
| `dev-secrets/` | `modules/secrets` with dev's settings: every SSM parameter, secret or id | the laptop (developer role) or CI's `mypaisa-ci-dev-deploy` | `mypaisa-agent/dev/secrets.tfstate` |
| `prod-secrets/` | `modules/secrets` with prod's settings | CI only, in the `prod` environment after Arun approves (MA-107) | `mypaisa-agent/prod/secrets.tfstate` |

The parameters live apart from the stack (Arun, 24 Nov 2026, MA-25): the provider reads a SecureString with
decryption on every refresh, so whatever plans a root that holds one can read it. CI plans `dev/` and `prod/` on
every pull request with `mypaisa-ci-plan`, and never the secrets roots. `ci-plan` reads configuration, never contents:
explicit denies refuse it every parameter value in the account, `kms:Decrypt`, every S3 object but those two states
and the lock files, DynamoDB items, Cognito users, log lines and secret values (`bootstrap/roles.tf`).

The state bucket is the account's `wealth-tracker-tfstate`, with S3's own lock files. The `mypaisapp.com` zone
and certificate belong to the wealth tracker's `dns/` root and are looked up by name when the first record is
made (MA-107).

## What the modules make today (MA-26, MA-25)

- `mypaisa-<env>-core`: the single DynamoDB table (pk, sk; on demand). Prod has deletion protection and
  point-in-time recovery.
- `mypaisa-<env>-documents`, `-exports`, `-imports`, `-site`: private S3 buckets, owner-enforced, S3-encrypted
  and TLS only. Prod's are versioned.
- In `modules/secrets`, called by `dev-secrets/` and `prod-secrets/`: the SSM parameters under
  `/mypaisa-agent/<env>/`, each made with a write-only placeholder (see below).
- Every resource is tagged `env`, `app` and `owner`. The table and the buckets carry `prevent_destroy` in both
  environments.

Each of these comes with the story that needs it:

- the Lambdas, the API, the schedules and the `api` and `dashboard` records: MA-29, MA-30 and MA-107;
- the Cognito pool: MA-109;
- the log groups and alarms: MA-231;
- ECR and CodeBuild: MA-237;
- `ci-evals`: MA-250.

CI's Plan job (MA-25) plans `dev/` and `prod/` on every pull request from this repository that touches `infra/`, and
posts the plan on the PR from a second job that holds no AWS role. Until bootstrap is applied `ci-plan` does not
exist, so that job fails.

Every role dev's stack makes must carry the `mypaisa-dev-boundary` permissions boundary. The guard refuses one
without it.

## Running it

Always through `infra/scripts/tf.sh`, never bare `terraform`. It checks that the state key matches the root. It
applies only a saved plan file. It refuses a local apply of prod, and it refuses destroy.

```bash
infra/scripts/tf.sh dev plan -out=dev.tfplan
infra/scripts/tf.sh dev show dev.tfplan
infra/scripts/tf.sh dev apply dev.tfplan
```

`scripts/infra_gates.sh` is the offline gate, and CI's Infra job. With no credentials, it checks `fmt` and
`validate` on all five roots, tflint (`.tflint.hcl`) and trivy's HIGH and CRITICAL misconfigurations (accepted ones in
`.trivyignore`, each with its reason), and that `tf.sh` refuses what it must.

### The first time (Arun)

1. **Sign in as yourself, not the root user.** The root user cannot assume a role. Use an IAM Identity Center
   user, or an IAM user with MFA, that is allowed `sts:AssumeRole` on `mypaisa-dev-developer`. Until bootstrap is
   applied, that identity needs admin rights to apply it.
2. **Apply bootstrap**, from the laptop:

   ```bash
   export GITHUB_TOKEN=$(gh auth token)
   export TF_VAR_budget_alert_emails='["<your address>"]'
   infra/scripts/tf.sh bootstrap plan -out=bootstrap.tfplan
   infra/scripts/tf.sh bootstrap show bootstrap.tfplan
   infra/scripts/tf.sh bootstrap apply bootstrap.tfplan
   ```

3. **Prove the guard** against the same plan, before or after the apply. It runs IAM's policy simulator over the
   guard and ci-plan's denies as planned, and reads nothing in the account:

   ```bash
   (cd infra/bootstrap && terraform show -json bootstrap.tfplan) > /tmp/bootstrap.json
   python3 scripts/infra_guard_check.py /tmp/bootstrap.json
   ```

4. **Point the `agent-toolkit` profile at the developer role.** In `~/.aws/config`, set `role_arn` to
   bootstrap's `developer_role_arn` output, and `source_profile` to your own identity's profile, with
   `mfa_serial`. From then on the laptop works in dev, and prod refuses it.
5. **Apply dev, then dev-secrets** with `tf.sh dev` and `tf.sh dev-secrets`, after reading each plan. Prod and
   prod-secrets are applied by CI, through the release workflow (below).

### Releasing (MA-107)

`.github/workflows/release.yml` deploys; nothing else applies prod. It starts when CI passes on a push to `main`,
and ships only when the commit changes something a release ships (`infra/`, `backend/`, `web/`, the release scripts
or the workflow) since the commit prod last ran. Otherwise it stops before AWS and asks nothing.

1. **Dev**, with `mypaisa-ci-dev-deploy`: plans `dev-secrets` and `dev` to files and applies those files. It moves
   each Lambda's `live` alias, then runs `scripts/smoke.py --env dev`. A failed smoke moves the aliases back and
   stops the run.
2. **Prod plan**, with `mypaisa-ci-plan` and no approval: the whole plan of `infra/prod` goes in the run's summary,
   with its digest. Read it there.
3. **Prod**, in the `prod` environment once you approve:
   - plans `infra/prod` again and refuses a plan whose digest is not the one you read;
   - plans `prod-secrets` and refuses anything but a new parameter or a change to a parameter's tags (the same
     rule holds for `dev-secrets`);
   - refuses a release that ships a Lambda while any `/mypaisa-agent/prod/*` parameter is still at version 1;
   - applies both, moves the aliases, then runs the read-only `scripts/smoke.py --env prod`. A failed smoke moves
     every alias back.

A test run by hand (Actions, Release, Run workflow, from `main` once CI is green on it) takes `force_smoke_failure`:
`dev` stops the run before prod, `prod` rolls the aliases back. `python3 scripts/release.py selftest` and
`python3 scripts/smoke.py selftest` hold every refusal, and the infra gate runs both.

The first run applies dev's and prod's empty stacks. Then put prod's values (below). The Lambda stages are proved
on the first Lambda (MA-347).

### Putting a value

Terraform makes each parameter with a write-only placeholder (`value_wo`), so no value is ever in state. You
put the real one by hand, after the apply that made the parameter:

```bash
read -rs V && aws ssm put-parameter --overwrite --name /mypaisa-agent/dev/anthropic/api_key --type SecureString --value "$V" && unset V
```

Prod's values go in the same way, from the laptop. The developer role's one exception to its `env=prod` deny is
`ssm:PutParameter` on `/mypaisa-agent/prod/*`, for Arun to put prod's secret values by hand; it never reads,
decrypts, deletes or tags a prod parameter, and Claude never runs it (Arun, 24 Nov 2026, MA-26). The put must
overwrite a parameter Terraform made: a new name under prod's path is refused.

Never change `value_wo_version`, or any argument of a parameter but its tags, once it exists. A bump sends the
placeholder over the real value; an in-place change sends an empty value
(`.claude/rules/aws-changes.md`).
