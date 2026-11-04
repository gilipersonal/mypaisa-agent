# Working rules for the web app (MA-194)

The plan and the backend have their own rules (the root `CLAUDE.md`, `backend/CLAUDE.md`, `.claude/rules/`). This file is
how the code under `web/` is written. The screens are built from their picked boards in `docs/design/app-v1/`
(`.claude/rules/plan-sync.md`, rule 4); the stack is ARCHITECTURE §8.4.

## How the project is laid out

```
web/
  vite.config.ts        SvelteKit 3's configuration (adapter-static, the service worker, the CSP), Tailwind, Vitest
  pnpm-workspace.yaml   one catalog of versions, the release-age guard, the security overrides
  src/
    app.css             Tailwind, the DS v1 tokens and motion, shadcn-svelte's names mapped onto the tokens
    app.html            the document: fonts, the manifest, the icons
    service-worker.ts   caches the shell only; /v1 and /.well-known always go to the network
    routes/             pages: thin, each reads through a query and renders components
    lib/                imported as #lib/...; api/, query/, cards/, formatting/, privacy/ and test-ids.ts are what
                        the iOS shell shares by path, so they import no door's framework and run on Hermes too
                        (MA-165: no Intl in money.ts); the rest is the web app's own: Svelte components
      api/              the typed client (openapi-fetch) and the TanStack Query definitions
      api-types.d.ts    generated from backend/openapi.json by `pnpm api:types`; never edited by hand
      query/            the one QueryClient and its retry rules
      components/ui/    shadcn-svelte components as its registry writes them
      components/...    the app's own components, built on ui/
      formatting/       money in GBP, INR (lakh and crore), USD and EUR, from decimal strings
      privacy/          privacy mode's masking
      cards/            the chat cards' envelope (MA-174 owns the schema)
      styles/           DS v1's tokens.css and motion.css, held equal to docs/design/ds-v1/ by a test
```

## The rules

- **Imports:** use `#lib/...` (SvelteKit 3's subpath import; `$lib` is gone), and name every imported file with its
  extension (`#lib/formatting/money.ts`, `./client.ts`, `#lib/components/ui/button/index.ts`). eslint refuses either
  mistake.
- **The api is typed from the backend:** when a route changes, run
  `uv run --directory backend python -m mypaisa_agent.api.openapi > backend/openapi.json`, then
  `corepack pnpm@12.16.1 --dir web api:types`. The backend's test fails while `openapi.json` is stale, and the web gate
  while `api-types.d.ts` is.
- **Data goes through TanStack Query**, whose definitions live in `#lib/api/queries.ts`. A component never calls
  `fetch` itself. A 4xx the api meant is never retried.
- **Money is a decimal string** from the api to the screen. `formatMoney` formats it without turning it into a float,
  except the compact shortening (£1.3m), which is display-only.
  Privacy mode masks every amount through `maskedMoney`.
- **Colours come from the tokens.** Use Tailwind's theme (`bg-card`, `text-muted-foreground`, `text-up`) or shadcn's
  variables, never a hex value. Dark mode follows the system, and `.t-light` or `.t-dark` force a theme; the tokens and
  Tailwind's `dark:` variant follow the same rule.
- **shadcn-svelte components** are added from its registry into `src/lib/components/ui/` and kept as written, so an
  update replaces them cleanly; the app sets sizes at the call site (`class="min-h-11"`).
- **Accessibility:** one `main` landmark, a skip link, 44 px targets (`min-h-11`), visible focus, and `aria-live` where
  a value updates. A button is never disabled while it refetches, so focus stays put.
- **The page shell:** pages sit inside the shell in `components/shell/`; the design system's adaptive shell
  (`.mp-app`, `.mp-shell`, `.mp-cols`) arrives with the first real screens (MA-199, MA-183 to MA-185).

## The gates

`scripts/web_gates.sh` runs every gate (`--offline` skips the audit). It is also the jira-flow `web` gate and CI's Web
job. In order:

1. the frozen lockfile;
2. the api types against `backend/openapi.json`;
3. svelte-check, strict, with warnings as failures, and the service worker's own type check;
4. eslint (typescript-eslint strict and stylistic, svelte) with no warnings;
5. prettier;
6. vitest with 90% coverage of `src/lib`;
7. the build, which must emit the CSP and the service worker;
8. `pnpm audit` at high.

Playwright, axe and Argos run only when Arun asks (MA-304).

Needs Node 24 or later with corepack (on Node 25 and later, `brew install corepack` first). Run locally:
`corepack pnpm@12.16.1 --dir web dev`, with the backend on port 8000; Vite proxies `/v1` to it.
