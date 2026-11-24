# --- SSM: the environment's keys and ids, under /mypaisa-agent/<env>/ (ARCHITECTURE §13, §17.4, .claude/rules/aws-changes.md)
#
# Every parameter, secret or id, lives here and nowhere else, called by infra/dev-secrets and infra/prod-secrets with
# state of their own, so the plan CI runs on a pull request (infra/dev and infra/prod, with ci-plan) never refreshes
# one: the provider reads a SecureString with decryption on every refresh, and ci-plan is denied every parameter
# value (Arun, 24 Nov 2026, MA-25).
#
# Every parameter is made with a write-only placeholder (value_wo), so no value is ever in state, and Arun puts the
# real value by hand after the apply that made it (`read -rs`, then `aws ssm put-parameter --overwrite`). The
# provider stores a SecureString's decrypted value in state on every refresh if it is set through `value`, whatever
# ignore_changes says; a write-only value is never stored (MA-159).
#
# Never change, for a parameter that exists: value_wo_version (a bump sends the placeholder again, over the real
# value), or any argument but its tags (description, tier, type, key_id, allowed_pattern, data_type, name): an
# in-place change sends an empty value and a replacement writes the placeholder. If one must change, bump
# value_wo_version in that apply and put the value again by hand straight after.

locals {
  ssm_path = "/mypaisa-agent/${var.env}"

  # Secrets: SecureString, with the account's aws/ssm key.
  secrets = merge(
    {
      "anthropic/api_key"  = "This environment's Claude workspace key (MA-21)"
      "twelvedata/api_key" = "Twelve Data key for the US lines and the FX fallback (MA-22, MA-142)"
      "apple/apns_key"     = "APNs auth key, p8 (MA-164)"
      "apple/siwa_key"     = "Sign in with Apple key that revokes tokens, p8 (MA-164)"
    },
    var.evals_key ? { "anthropic/evals_key" = "The evals workspace's key, read only by ci-evals (MA-21, MA-250)" } : {},
  )

  # Ids: not secret, but put by hand the same way so the two kinds follow one rule.
  ids = {
    "apple/team_id"        = "Apple developer team id (MA-162)"
    "apple/bundle_id"      = "The app's bundle id (MA-20, MA-142)"
    "apple/services_id"    = "Sign in with Apple's Services ID for the web app (MA-143)"
    "apple/apns_key_id"    = "The APNs key's id (MA-164)"
    "apple/siwa_key_id"    = "The Sign in with Apple key's id (MA-164)"
    "google/client_id"     = "Google iOS client id (MA-143)"
    "google/web_client_id" = "Google web client id (MA-143)"
  }

  parameters = merge(
    { for k, d in local.secrets : k => { description = d, type = "SecureString" } },
    { for k, d in local.ids : k => { description = d, type = "String" } },
  )
}

resource "aws_ssm_parameter" "this" {
  for_each = local.parameters

  name        = "${local.ssm_path}/${each.key}"
  description = each.value.description
  type        = each.value.type
  tier        = "Standard"

  # The placeholder: written once, at create. Set once and never bumped (see above).
  value_wo         = "unset: put by hand"
  value_wo_version = 1
}
