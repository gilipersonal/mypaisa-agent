# MyPaisa: review of the agentic architecture after MA-307

Reviewed 2 Nov 2026, read only, against `ARCHITECTURE.md` at `5e77e01` (the "before" is `82ecd51^`). Line numbers are the current file's unless marked "old". Prices are the repo's own (TECH_STACK l.144: Haiku 5.5 $0.10/$0.50, Sonnet 5.5 $2/$10, Opus 5.5 $4/$20 per million tokens). The expected spend is $21 to $36 a month against a $160 prod ceiling (§14.1, l.2324).

**Short verdict.** The safety and plumbing are best in class for one household: guards in code, one write service, the figure check, the evals that run on change, the meter and its ladder. The deterministic engine (§6) is solid. As an *agent*, though, MyPaisa is now mostly reactive. MA-307 took away the only proactive voice (the 07:15 brief and the Saturday review) and replaced it with nothing. It also left a few orphans: Opus, web search's purpose, the 07:45 anchor and the cost lines. Most of the intelligence Arun is asking for (goals, "how do I get to X by Y", what moved and why, quiet useful nudges, honest forecast ranges) can be added inside the rules, mostly as code and tools rather than as new agents, for about $8 to $12 a month.

---

## 1. What changed

| Area | Removed | Kept | Changed |
| --- | --- | --- | --- |
| Agents | News scout, Analyst (rules engine), Forecaster (old §20.1) | Concierge, Data steward, Ops warden, Budget keeper, Admin desk | Grader and tuner: from daily prediction grading and calibration plus household months (old §20.4, §20.9) to household months only (§18.8). Nine agents became six |
| Tools | `get_signals`, `get_macro`, `run_scenario`, `get_events`, `get_sentiment`, `get_stances`, `get_scorecard`, `log_decision` (old l.1279-1283) | Registry, draft and propose tools, `run_projection`, `rearrange_budget`, the `query_ledger` pair, `memory`, `ask_user`, `get_audit`, `get_spend` | Every drafting tool is admin-only in code (MA-308); delete and restore are drafted events (MA-309) |
| Patterns | Bull/bear debate plus a judge; reflection over four weeks of stances (old l.1276-1279) | The per-run self-audit | none |
| Models | Opus for the Saturday review; Haiku for sentiment scoring | Sonnet for chat and cards, Haiku for small turns, statements and summaries | **Opus now has no job** (§7 l.1122-1123), yet it is still listed everywhere |
| Web search | "Why?" research and the review's sources | Server tools isolated from household figures | Purpose narrowed to "a holding's public details when it is added" (l.1130) |
| Batches | Nightly sentiment scoring | Overnight eval judges | none |
| Scheduled jobs | Engine, Forecaster, grade, calibrate, brief, wrap, news (old §20.5) | Price ingest, nightly views, Projection run, check-ins, ledger export, use counts, judges | The 07:45 switch now watches "the night's jobs" instead of the brief (l.1907) |
| Data | Signals, stances, `ScoreDaily`, news and sentiment, calibration maps | Registry, events, `ProjectionRun`, `MonthGrade`, `LearnedProposal`, `MemberSignal`, `MemoryNote` | Prices exist only to value holdings |
| Learning loops | Daily grading and calibration, challengers (E4 to E6) | E9 month grades, an annual Projection grade, E10 use signals | none |
| Costs | Sentiment line ($3); the brief and the Saturday review | Every other line | The total fell by only $3 ($24 to $21 standard). The £12 chat line was relabelled but not re-derived (l.2261, l.2331) |
| Budget shares | Forecaster 10%, News scout 10% | Admin desk 5%, steward and warden 5%, reserve 5% | Concierge 55% to 75%; Grader 10% (l.2860-2861) |

---

## 2. Holes the removal left

| # | Hole | Where | Severity |
| --- | --- | --- | --- |
| H1 | **No proactive voice.** The brief and the Saturday review were the agent's only unprompted, reasoned output. What remains is code check-ins and threshold alerts (§10). "Asks on its own" (l.6) now means only "is the EMI paid?". | §7, §10, §14.1 | High |
| H2 | **Opus is orphaned.** It has no route in §7 or §18.1, yet it is listed in TECH_STACK l.144, README l.517, PLAN l.383, §22.1 l.3508, §22.6 l.3669, and in inside-mypaisa, agent-journey and tech-stack-observability.html. | several | Low (cost); medium (clarity) |
| H3 | **Web search's purpose is split.** §7 l.1130 says it runs at add time (phases 2 and 5), but PLAN phase 11 (l.1785-1788) introduces `web_search` with a `/why` command, and phase 10 (l.1755) still limits '"Why?"'. Nothing says what `/why` searches now. TECH_STACK l.212 still prices "Heavier use of 'Why?'". The ~60 searches a month (§14) was a "Why?" estimate. | §7, §14, PLAN 10 and 11 | Medium |
| H4 | **The 07:45 switch lost its anchor.** It was "the brief has not gone out" (old l.1986). It now watches the night's jobs at a time no member-facing deliverable needs. Check-ins are in the daily run (§18.4 l.2812) but not in the switch's list (l.1907), and their send time is never stated. | §9.5, §9.6, §18.4 | Low |
| H5 | **The cost lines were not re-derived.** "Chat, cards, statements, alerts, the agents' reviews" stays at £7/£12/£21, though briefs and the Opus review went. "The agents' reviews" now means one monthly Sonnet note. | §14 l.2261, §14.1 l.2331 | Low |
| H6 | **The daily pipeline is thin for its machinery.** A Step Functions run and an "Ops warden" (§18.1 l.2747, l.2754) now drive four chained jobs that §19.1 already chains through SQS. It is harmless (free tier), but the warden's value is now mostly DLQ replay. | §18.4, §19.1 | Low |
| H7 | **Learning lost its fast loop.** Only monthly grading is left: the Budget forecast monthly, the Projection's net worth yearly (§18.8). The Monte Carlo fan's *calibration* (do actuals land inside p10 to p90?) is never graded. | §18.8 | Medium |
| H8 | **Rule 2 against the budget rearrangement.** Rule 2 says nothing "tells the household to buy, add, hold, **pause, trim** or sell" (l.160). §6 l.1087 offers "trim a category… pause or reduce a SIP". Pausing a SIP is literally a pause of investing. The rule needs to say it covers market calls on a holding, not code-computed cash-flow options. | §1, §6 | Medium (the eval and the refusal check will collide) |
| H9 | **"What moved and why" has no mechanism.** It is promised in l.8 and l.2068 ("why is my net worth down this month?"), and Overview shows "where growth comes from" (l.1472). But no attribution engine, view or tool exists. The engine's trace explains *future* figures only. | §2, §6, §8.3, §11 | High |
| H10 | **Memory forbids figures, and there is no Goal entity.** A note may not hold an amount or a date (§22.2 l.3575), and §4.1 has no goal. "Saving £30k for a car by 2028" can only be a figureless note or a plan item, which is a flow, not a target. | §4.1, §22.2 | High |
| H11 | **Stale numbering and figures.** TECH_STACK l.189 still says "$24 to $39". TECH_STACK l.193-194 and l.217 cite §23.7, §15.2 and §20.7. RESEARCH l.546 says `max_turns=6` against §14.1's eight calls a run (l.2379). | TECH_STACK, RESEARCH | Low |
| H12 | **Old surfaces still describe the market side.** README l.94 says "nine agents… Opus, Sonnet and Haiku… the 07:15 brief" for architecture-v4, which now draws six. architecture-v4's ladder still routes "Alerts and check-in cards" to Sonnet, but §4.9 says check-ins are code with no LLM. | README, design pages | Low |
| H13 | **Evals.** No stance cases were left behind (the safety suite was rewritten to "a buy, sell or hold call"). But no capability suite tests planning or explanation quality. The figure check verifies *numbers*, not *causal claims*. | §21.3 | Medium |
| H14 | **Under-specified.** "Surplus is allocated by a rule" (l.1012) names no rule. The Monte Carlo is "for the market returns" only (l.976), so inflation, FX and salary are deterministic. The tool for "XIRR since 2021" is not named (is it `get_holding` or `query_ledger`?). There is no `get_projection` to read the stored run without overrides. | §6, §7 | Medium |

---

## 3. How intelligent it is today, as a wealth agent

| Capability | Today | Grade |
| --- | --- | --- |
| **Conversation** | Strong mechanics: one question at a time with chips; skips what was already said; `ask_user` plus `PendingAction` resumable for a day; append-only history; Haiku notes on recent conversations; memory notes the member can see and edit. Thin on depth: no stated thinking or effort route for hard planning turns. The eight-call cap and a one-scenario-per-call `run_projection` make a three-way comparison expensive in calls. | B+ |
| **Proactivity** | Code check-ins (EMI, SIP, salary, maturity, valuation), budget-over-plan alerts, overdue check-ins, milestones and trouble flags inside a Projection run, the tuner's monthly proposals. Missing: idle cash, a goal slipping, a rate reset or fixed-rate end coming, an allowance deadline, an unusual spend, a salary not credited, an FX swing on INR assets, and any weekly "what changed" digest. | C |
| **Planning and forecasting** | A very good deterministic core: month-by-month flows, priors by country, a shrinkage-blended XIRR, plan items with three effects, a goal-seek for shortfalls, reproducible runs, a trace per figure. Missing: goals as targets, "how do I get to X by Y", probability of success, sensitivity (which input moves the 2045 figure most), stochastic inflation and FX (the largest risks for a UK and India household), correlated shocks, saved and compared scenarios, retirement drawdown logic beyond "a locked pension cannot cover a shortfall". | B- |
| **Tool use** | Typed, strict, gated, manifest-checked: excellent hygiene. About 25 tools for one loop, with overlaps (`get_portfolio`, `get_holding`, `get_history`, `chart_series`, `get_networth`; `propose_change` vs `draft_event`). Missing: `get_projection`, `explain_change`, `solve_goal`, `compare_scenarios`, `get_calendar` (dates and allowances). | B |
| **Data ingest** | Statements (PDF, CSV, XLSX) with the merchant memory and Haiku; factsheets and screenshots through a quarantined extractor; CAS by an open-source parser (phase 14); the Excel importer; payslips as a document kind. Good and safe. No automated feeds (Open Banking or India's Account Aggregator), which is reasonable for now. | B+ |
| **Explanation** | Plain top and technical underside; XIRR and CAGR with the working; the Projection's figure trace. No attribution of a past change (H9). | C+ |
| **Learning** | E9 and E10 are well bounded: evidence, a margin, one step at a time, an admin decides. No fan calibration, no prior re-fit from realised returns, no learning of nudge usefulness. | B- |
| **Multi-agent** | The right call for this job: one real tool-loop agent, plus code workflows that use a model only for words. That matches Anthropic's advice to prefer simple, composable workflows and add agents only where open-ended steps need them ([Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)). The six "agents" are services with narrow jobs; do not add more. Add *capabilities* to the concierge and *jobs* to the worker. | A- |
| **Safety** | Excellent: least agency, a fail-closed policy gate, untrusted text in one way, the figure check, admin-only writes in code, the second check, pass^k safety suites. Two gaps: H8, and figures from Claude-written SQL (§11.1), which come from untested code and so stretch rule 1. Label them as "a query MyPaisa wrote", as §11.1 half does. | A |

---

## 4. Recommendations, within the rules

Code computes every figure, Claude chooses words and tools, nothing trades, admins write. The Claude costs are per month at this household's scale.

### P1: what makes it feel intelligent

| # | Recommendation | What it adds | Section and phase | New pieces | Model | Claude cost a month |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Goals and a goal solver** | "£40k for a car deposit by Sep 2028" and "₹1.5 cr for education by 2035" become tracked targets. "What would it take?" returns the monthly saving needed (a bisection on a `change_flow` amount over the deterministic path), the date reached at today's saving, and from phase 7b the chance of reaching it from the fan. | New §6.x; `Goal` entity in §4.1; phase 7 | `Goal` (target, by, currency, funded-from pools, priority); tool `solve_goal(goal or target, by, levers[])`. Admin saves it with Confirm, members view. Memory notes may name a goal ("the car goal") without its figure, which fixes H10 | Sonnet | ~$0.50 |
| 2 | **"What changed and why" attribution** | "Net worth up £3,100 in October: saving +£1,900, markets +£1,600, INR −£450 on Indian assets, loan principal +£620, property revaluation £0, other −£570." Each causal sentence must cite a component. | New §6.x; phase 5 (needs prices), complete in 9 | `attribution` view by month, member, record and country (flows, valuation change split into price and FX, debt paydown, corrections). Tool `explain_change(scope, from, to)`. Extend the figure check into a **claim check**: a reply's "because" must map to a component | Sonnet (words only) | ~$1 |
| 3 | **Insight job: ranked, quiet nudges** | Notices things unasked. Detectors in code: budget drift (run rate against plan), idle cash above N months of spend, goal off its glide path, maturity within 30 days, fixed-rate end or reset within 90 days, prepayment impact (shown as a computed comparison, never "you should"), an unusual spend, a salary not credited, an INR move over a band, allowance deadlines (rec. 5). | §10, new §10.1; phase 10 | Nightly worker job `insights`. Score = impact × urgency × novelty × the member's past engagement (E10). Quiet by default: one Monday digest card and at most one timely nudge a week per admin. Muted kinds learned by E10. Each nudge kind has eval cases for "fact, not advice" wording | Code; Sonnet writes the digest; Haiku the one-liners | ~$0.50 |
| 4 | **A scenario workspace in the chat** | "Compare: house in 2028, house in 2030, no house". Side by side at 5, 10 and 20 years, the leanest month, goal hits. Named scenarios kept, then promoted to plan items with one Confirm. | §6, §7; phase 7 | `Scenario` entity (overrides, name, owner). Tool `compare_scenarios(scenarios[≤4])` in one call, saving model calls under the eight-call cap. *Open question for Arun:* may a non-admin save their own scenarios as a "preference", or are they admin-only? | Sonnet | ~$1 |
| 5 | **Tax-year awareness as facts and dates** | "£14,200 of this year's ISA allowance used; the tax year ends 5 April." "India's financial year ends 31 March." No tax maths, no advice. | §6, §10; phase 9 (UK), phase 14 (India) | Versioned settings with their gov.uk and Income Tax India sources (allowances, year ends; 80C only for a member who files in India under the old regime). `get_calendar(window)`; the insight job's deadline detector. Clarify the line in §21.2 between "tax advice" (refused) and "a stated allowance and what the ledger shows" (allowed) | Code; Haiku for words | ~$0.20 |
| 6 | **Fix rule 2's wording, and the evals for it** | Stops the refusal check colliding with the budget rearrangement and the nudges. | §1, §6, §21.3; phase 0 doc fix | Rule 2: "no call on a holding drawn from a market view; code-computed cash-flow options shown as options are not calls". Safety cases for both sides | none | $0 |

### P2: honest forecasting and a learning loop

| # | Recommendation | What it adds | Section and phase | New pieces | Model | Claude cost a month |
| --- | --- | --- | --- | --- | --- | --- |
| 7 | **A richer Monte Carlo** | Ranges that reflect a UK and India household's real risks. | §6; phase 7 (7b) | Joint, correlated draws for class returns, CPI by country and GBP/INR (inflation-gap drift plus volatility), with fat tails (Student-t), all as versioned priors with sources. Sequence risk in drawdown years. A **sensitivity** table: a tornado over the five inputs that move the horizon figure most | none (code; Lambda free tier) | $0 |
| 8 | **Forecast accuracy loop** | Trust that grows: "the band has held 9 of the last 10 quarters". | §18.8; phase 9, then 13 | Grade the fan, not only the median: coverage of p10 to p90 at 1, 3 and 12 months; a PIT histogram once there are 12 or more points. Grade goal glide paths. Re-fit return and inflation priors only on evidence, in the existing bands. Add the line to the tuner's note | Sonnet (monthly note, existing share) | $0 |
| 9 | **Reasoning-quality evals** | Catches confident but wrong explanations and over-asking. | §21.3 to §21.5; phases 7, 10, 11 | Capability cases with engine ground truth: goal solving, attribution, three-way comparisons, ambiguous plans. Judges for "causal claims faithful to the trace or attribution", "asked only what was missing", "fact, not advice". Trajectory metrics (calls per answer, repeated calls) in `RunRecord.checks`. In line with Anthropic's [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Haiku judges (Batches) | ~$0.50, plus T1 inside its $30 |
| 10 | **Consolidate and complete the tools** | Fewer, richer tools give better choices and fewer calls, as [Writing tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents) advises (consolidate overlapping tools; return meaningful context). | §7, §21.5; phase 11 | Merge the reads into `get_wealth(scope, view, period)` (net worth, holding, history, series). Add `get_projection(run)` and `get_returns(scope, from, to)`. Keep `query_ledger_sql` for the long tail (§11.1); it is the right long-context use of the ledger, with figures from results only, as [context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) advises (fetch just in time, not stuffed into context) | none | saves cost |
| 11 | **Give Opus one job, or drop it** | Deep, slower "plan with me" sessions: retirement, education, a house. Opus orchestrates `solve_goal`, `compare_scenarios` and sensitivity, then writes the plan for an admin's Confirm. | §7, §14.1; phase 11 | A route: admin-started, separate loop (one model per loop, §22.1), its own share (5%, about $8), and a high effort setting. About $0.40 a session at repo prices; 10 sessions is about $4 | Opus | ~$4 (capped) |

### P3: polish

| # | Recommendation | Section and phase | Model | Claude cost a month |
| --- | --- | --- | --- | --- |
| 12 | **Voice and quick actions.** On-device speech-to-text in the composer at both doors; App Intents and Siri ("log £40 groceries", "how's the car goal?") go through the same chat and Confirm. | §8.1, phase 15 (already "the app beyond the chat") | existing | ~$0 |
| 13 | **Preference memory, structured.** Keep notes figureless, but add typed `Preference` fields the agent proposes with a card (answer depth, risk wording, which currency first, digest day). | §22.2, §4.1; phase 9 with E10 | Haiku | ~$0 |
| 14 | **A conversation-start brief instead of a daily one.** On the first message after 24 hours, the concierge gets a compact, code-built "since you were last here" block (attribution summary, open nudges) after the cached prefix. This is proactivity without push. | §7, §22.1; phase 10 | Sonnet | ~$0.50 |
| 15 | **Automated feeds, investigated only.** UK Open Banking and India's Account Aggregator would remove statement uploads. Regulated access, cost and terms are unknown here, so treat it as a research spike with Arun's approval, not a plan. | §5, phase 14+ | none | unknown |

**Total added Claude spend:** about $8 to $12 a month, mostly Opus if it is kept. The expected total becomes about $30 to $48 against the $160 ceiling. The shares need re-cutting: Concierge 70%, Grader and tuner 5%, Insights and planner 10%, Admin desk 5%, steward and warden 5%, reserve 5%.

**What not to do:** do not add agents for these. Each recommendation is a tool, a view or a worker job behind the existing manifest, gate and figure check. Do not let Claude-written code compute forecasts (code execution would break rule 1). Do not let a nudge say "should".

---

## 5. Inconsistencies to fix now

1. **TECH_STACK l.189:** "$24 to $39" becomes "$21 to $36".
2. **TECH_STACK l.193-194, l.217:** §23.7 becomes §21.7, §15.2 becomes §14.2, §20.7 becomes §18.6.
3. **TECH_STACK l.212** and **PLAN l.1755:** drop '"Why?"'. Say "web searches (a holding's public details on adding)". **PLAN l.1785-1788:** either move `web_search` to phase 2 or 5, where §7 l.1130 uses it, or say what `/why` searches. Re-estimate §14's "~60 a month" (likely under 10).
4. **README l.94:** "nine agents" becomes "six agents", "Opus, Sonnet and Haiku" becomes "Sonnet and Haiku", and drop the 07:15 brief journey, or mark the page stale. **PLAN l.383:** the same.
5. **Opus:** remove it from README l.517, PLAN l.383, §22.1 l.3508, §22.6 l.3669 and the three explainer pages, or adopt rec. 11 and give it a route in §7 and §18.1. TECH_STACK l.144 can keep it in the price list.
6. **§14 l.2261 and §14.1 l.2331:** rename "the agents' reviews" to "the tuner's monthly note", and re-derive the £12 and $20 lines now that briefs and the Opus review are gone.
7. **§1 l.160 against §6 l.1087:** reword rule 2 (rec. 6), so "pause or reduce a SIP" and "trim a category" are clearly allowed options computed by code, not calls.
8. **§9.6 l.1907 and §18.4 l.2826:** re-anchor the 07:45 switch to a stated deliverable ("views and Projection current by 07:00; check-ins sent by 09:00 outside quiet hours"), and add check-ins to its list.
9. **architecture-v4.html ladder:** "Alerts and check-in cards" are not Sonnet. Check-ins are templates (§4.9); route only alert wording to Sonnet.
10. **RESEARCH l.546:** `max_turns=6` becomes "at most eight model calls a run (§14.1)".
11. **§6 l.1012:** name the surplus rule (for example: to cash up to N months of spend, then pro rata to SIPs), or mark it an open question in §16.
12. **l.8 and l.1472:** "computes what moved and why" and "where growth comes from" have no mechanism. Add rec. 2 or soften the wording until it exists.

Sources: Anthropic, [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents); [Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents); [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents); [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents). The first, second and fourth are already in docs/RESEARCH.md l.1266; the third was confirmed by one web search.
