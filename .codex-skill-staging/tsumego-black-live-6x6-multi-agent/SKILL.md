---
name: tsumego-black-live-6x6-multi-agent
description: Use by default when creating or revising 6x6 black-to-live tsumego in this project. Coordinates a multi-agent workflow with puzzle design, stone-economy review, white attack validation, similarity checking against existing problems, and ambiguity checks before the main agent edits tsumego-data.js.
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
- The main agent keeps ownership of final edits in `tsumego-data.js` and `README.md` unless there is a clear reason to delegate a bounded patch.
- Parallel agents should propose, audit, and verify. They should not overwrite each other's work.

## Default team

Spawn **5 agents by default**. This is the recommended baseline.

1. `Problem Designer`

- Responsibility: propose the final alive black shape, the starting position, intended solution line, and target stones.
- Focus: whether the puzzle is interesting, natural, and consistent with the requested move count.

2. `Stone Economy Auditor`

- Responsibility: remove unnecessary black and white stones.
- Focus: whether the board is overfilled, whether white stones are doing real work, whether the puzzle can be made smaller or cleaner, and whether trimming White accidentally makes the attack too easy to kill.

3. `White Attack Verifier`

- Responsibility: inspect wrong black moves and confirm that White's best attack is sensible.
- Focus: whether White should occupy the vital point, whether the current auto-White logic chooses a reasonable move, whether Black is actually chased or killed in a believable way, and whether White's attack shape is robust enough not to die first in simple problems.

4. `Ambiguity Checker`

- Responsibility: search for alternate correct first moves or unintended life.
- Focus: whether the start position is already alive, whether multiple first moves solve, and whether the intended move count matches the current app behavior.

5. `Similarity Checker`

- Responsibility: compare the candidate against existing tsumego in `tsumego-data.js`.
- Focus: whether the candidate repeats an existing eye-making idea, vital point, local topology, or is just a shifted, mirrored, or lightly decorated version of an existing problem.

Add more agents only when there is a concrete reason. Good optional additions:

- `UI/Data Integrator`: prepares the exact `tsumego-data.js` entry text if the main agent wants a sidecar drafting pass.
- `Sequence Judge Reviewer`: when the user asks for true 3-move, 5-move, or longer judged problems.

## Required outputs from each agent

Every agent should return concise, structured results.

`Problem Designer` must return:

- candidate `rows`
- `targetStones`
- intended correct line
- why the final black group is alive

`Stone Economy Auditor` must return:

- which stones are necessary
- which stones can be removed
- which white stones look thin but are actually required to stop Black from killing White
- whether the setup still feels natural after trimming

`White Attack Verifier` must return:

- at least one wrong black move
- White's best reply or reply sequence
- whether White occupies the vital point when appropriate
- whether any wrong black move turns into an easy White-killing sequence because White was left too thin
- whether the auto-White behavior in the app is acceptable or needs code adjustment
- user-facing move references in `x-y` notation when reporting points

`Ambiguity Checker` must return:

- whether the start is already alive
- whether alternate correct moves exist
- whether the current implementation can truly judge the requested move count

`Similarity Checker` must return:

- which existing problems are the closest matches
- whether the candidate is effectively the same shape after translation, reflection, rotation, or light decoration
- whether the life-making idea and vital point are too similar even if the stone coordinates differ
- a clear pass/fail recommendation

## Execution order

1. Main agent reads the current relevant puzzle data and user constraints.
2. Main agent reads nearby existing problems in `tsumego-data.js` before delegating.
3. Main agent spawns the 5 default agents in parallel.
4. Main agent waits for enough results to choose the best candidate.
5. If the `Similarity Checker` says the candidate is too similar, reject it and loop back to puzzle design before editing files.
6. Main agent synthesizes one final puzzle shape.
7. Main agent updates `tsumego-data.js`, any related text, and validation checks.

## Validation standard

Do not ship a new `黒生き` puzzle until all of these are true:

- The correct first move is legal.
- The target black stones are not already alive in the start position.
- The intended line makes black alive.
- At least one plausible wrong move remains not alive.
- White stones are sparse and purposeful.
- On simple black-live problems, White's attack shape is robust enough that Black cannot easily kill White first through an obvious thin point.
- The puzzle does not accidentally become a "capture all White" problem unless that is the explicit theme.
- The candidate is not substantially similar to an existing problem in shape, idea, or vital point. If it is too similar, rebuild it.

## Multi-move caution

The current app auto-judges only the first move.

- If the requested puzzle is 3 moves, 5 moves, or longer, the team must explicitly decide whether:
- the app will be extended to validate full move sequences, or
- the app will judge only the first move and allow free reading after that.

Do not describe a puzzle as fully sequence-judged unless the code actually supports that.
