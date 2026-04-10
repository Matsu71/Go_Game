---
name: tsumego-black-live-6x6-multi-agent
description: Use by default when creating or revising 6x6 black-to-live tsumego in this project. Coordinates a lean 3-agent workflow with puzzle design, tactical auditing, and uniqueness auditing before the main agent updates canonical tsumego data and regenerates exports.
---

# 6x6 Black-Live Tsumego Multi-Agent

Use this skill by default when the user wants `6路盤` の `黒先黒生き` 詰碁を作る or直す。

Use it together with the single-agent domain guidance in `tsumego-black-live-6x6`.

## Coordinate convention

When the user names a point as `x-y`, interpret it as:

- first number: column from the left
- second number: row from the top
- both numbers are 1-based

Example:

- `3-5` means "left 3, top 5"
- in `rows` array indexing, that is `rows[4][2]`

## Main policy

The main agent is the orchestrator and final integrator.

- The main agent gathers constraints from the user.
- The main agent keeps ownership of final edits in `data/canonical/tsumego-canonical.json` and any related export or docs files unless there is a clear reason to delegate a bounded patch.
- Parallel agents should propose, audit, and verify. They should not overwrite each other's work.

## Data workflow

This project uses canonical-first tsumego data.

- Read nearby existing problems in `data/canonical/tsumego-canonical.json`.
- Add or revise the puzzle in canonical first.
- Regenerate `data/export/web/tsumego-data.js` and `data/export/solver/tsumego-problems.json`.
- Validate after regeneration before declaring the work complete.

Preferred commands:

```bash
npm run build:tsumego
npm run validate:tsumego
```

## Default team

Spawn **3 agents by default**. This is the recommended baseline for cost-conscious work.

1. `Problem Designer`

- Responsibility: propose the final alive black shape, the starting position, intended solution line, and target stones.
- Focus: whether the puzzle is interesting, natural, and consistent with the requested move count.

2. `Tactical Auditor`

- Responsibility: combine stone-economy review with wrong-move and White-attack validation.
- Focus: whether the board is overfilled, whether white stones are doing real work, whether the puzzle can be made smaller or cleaner, whether trimming White accidentally makes the attack too easy to kill, whether White should occupy the vital point after wrong moves, and whether the current auto-White logic chooses a believable attack.

3. `Uniqueness Auditor`

- Responsibility: combine ambiguity checking with similarity checking against existing tsumego.
- Focus: whether the start position is already alive, whether multiple first moves solve, whether the intended move count matches the current app behavior, and whether the candidate repeats an existing eye-making idea, vital point, or local topology after translation, reflection, rotation, or light decoration.

Add more agents only when there is a concrete reason. Good optional additions:

- `UI/Data Integrator`: prepares the exact canonical problem object plus any export-impact notes if the main agent wants a sidecar drafting pass.
- `Sequence Judge Reviewer`: when the user asks for true 3-move, 5-move, or longer judged problems.

## Required outputs from each agent

Every agent should return concise, structured results.

`Problem Designer` must return:

- candidate `initialPosition.rows`
- `target.groups`
- intended correct line
- why the final black group is alive

`Tactical Auditor` must return:

- which stones are necessary
- which stones can be removed
- which white stones look thin but are actually required to stop Black from killing White
- whether the setup still feels natural after trimming
- at least one wrong black move
- White's best reply or reply sequence
- whether White occupies the vital point when appropriate
- whether any wrong black move turns into an easy White-killing sequence because White was left too thin
- whether later wrong black moves in a guided line require `solutions.wrongGuidedMoveDefenses`
- whether White should attack Black's first guided stone after a wrong later move
- whether the auto-White behavior in the app is acceptable or needs code adjustment
- user-facing move references in `x-y` notation when reporting points

`Uniqueness Auditor` must return:

- whether the start is already alive
- whether alternate correct moves exist
- whether the current implementation can truly judge the requested move count
- which existing problems are the closest matches
- whether the candidate is effectively the same shape after translation, reflection, rotation, or light decoration
- whether the life-making idea and vital point are too similar even if the stone coordinates differ
- a clear pass/fail recommendation

## Execution order

1. Main agent reads the current relevant puzzle data and user constraints.
2. Main agent reads nearby existing problems in `data/canonical/tsumego-canonical.json` before delegating.
3. Main agent spawns the 3 default agents in parallel.
4. Main agent waits for enough results to choose the best candidate.
5. If the `Uniqueness Auditor` says the candidate is too similar or too ambiguous, reject it and loop back to puzzle design before editing files.
6. Main agent synthesizes one final puzzle shape.
7. Main agent updates canonical data, regenerates exports, and runs validation checks.

## Validation standard

Do not ship a new `黒生き` puzzle until all of these are true:

- The correct first move is legal.
- The target black stones are not already alive in the start position.
- The intended line makes black alive.
- At least one plausible wrong move remains not alive.
- In guided problems, a plausible wrong later black move must not allow Black to make two eyes on the next move; encode a forced White refutation in `solutions.wrongGuidedMoveDefenses` when needed.
- White stones are sparse and purposeful.
- On simple black-live problems, White's attack shape is robust enough that Black cannot easily kill White first through an obvious thin point.
- The puzzle does not accidentally become a "capture all White" problem unless that is the explicit theme.
- The candidate is not substantially similar to an existing problem in shape, idea, or vital point. If it is too similar, rebuild it.
- The regenerated web and solver exports stay in sync with canonical.

## Multi-move caution

The current app supports guided principal-variation judgement when `solutions.principalVariation` is present.

- If the requested puzzle is 3 moves, 5 moves, or longer, explicitly decide whether it should use guided sequence judgement or first-move-only judgement.
- Do not describe a puzzle as fully sequence-judged unless `solutions.principalVariation` and the UI behavior actually support that.
- When guided sequence support is used, audit wrong later black moves and add `solutions.wrongGuidedMoveDefenses` if the generic auto-White response is not the tactical refutation.
