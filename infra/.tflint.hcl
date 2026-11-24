# tflint for every root and module under infra/ (MA-25), run by scripts/infra_gates.sh with --recursive.
#
# The terraform ruleset ships inside tflint, so the gate downloads no plugin and runs offline. Its recommended
# preset: deprecated syntax, unused declarations, pinned providers and versions, typed variables, naming.
plugin "terraform" {
  enabled = true
  preset  = "recommended"
}
