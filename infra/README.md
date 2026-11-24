# infra: MyPaisa's AWS, in Terraform only

Arun, 24 Oct 2026 (MA-106): every AWS change goes through Terraform, the AWS MCP only reads, and prod is
deployed only by GitHub CI. The rules are in `.claude/rules/aws-changes.md`; the design is ARCHITECTURE §17.

| Root | What it holds | Applied by | State key |
| --- | --- | --- | --- |
| `bootstrap/` | The developer role and its prod guard, the CI roles (`mypaisa-ci-plan`, `-dev-deploy`, `-prod-deploy`), dev's permissions boundary, the GitHub `dev` and `prod` environments, the account's budget backstop | Arun, from the laptop, once and then only when he asks | `mypaisa-agent/bootstrap/infra.tfstate` |
| `dev/` | `modules/mypaisa` with dev's settings | the laptop (developer role) or CI's `mypaisa-ci-dev-deploy` | `mypaisa-agent/dev/infra.tfstate` |
| `prod/` | `modules/mypaisa` with prod's settings | CI only, in the `prod` environment after Arun approves (MA-107) | `mypaisa-agent/prod/infra.tfstate` |

The state bucket is the account's `wealth-tracker-tfstate`, with S3's own lock files. The `mypaisapp.com` zone
and certificate belong to the wealth tracker's `dns/` root and are looked up by name when the first record is
made (MA-107).

## What the module makes today (MA-26)

- `mypaisa-<env>-core`: the single DynamoDB table (pk, sk; on demand). Prod has deletion protection and
  point-in-time recovery.
- `mypaisa-<env>-documents`, `-exports`, `-imports`, `-site`: private S3 buckets, owner-enforced, S3-encrypted
  and TLS only. Prod's are versioned.
- The SSM parameters under `/mypaisa-agent/<env>/`, each made with a write-only placeholder (see below).
- Every resource is tagged `env`, `app` and `owner`. The table and the buckets carry `prevent_destroy` in both
  environments.

Each of these comes with the story that needs it:

- the Lambdas, the API, the schedules and the `api` and `dashboard` records: MA-29, MA-30 and MA-107;
- the Cognito pool: MA-109;
- the log groups and alarms: MA-231;
- ECR and CodeBuild: MA-237;
- `ci-evals`: MA-250;
- the CI plan job: MA-25.

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

`scripts/infra_gates.sh` is the offline gate. It checks `fmt` and `validate` on all three roots, with no
credentials, and that `tf.sh` refuses what it must.

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
   guard as planned, and reads nothing in the account:

   ```bash
   (cd infra/bootstrap && terraform show -json bootstrap.tfplan) > /tmp/bootstrap.json
   python3 scripts/infra_guard_check.py /tmp/bootstrap.json
   ```

4. **Point the `agent-toolkit` profile at the developer role.** In `~/.aws/config`, set `role_arn` to
   bootstrap's `developer_role_arn` output, and `source_profile` to your own identity's profile, with
   `mfa_serial`. From then on the laptop works in dev, and prod refuses it.
5. **Apply dev** with `tf.sh dev`, after reading its plan. Prod is applied by CI, through MA-107's release
   workflow.

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
