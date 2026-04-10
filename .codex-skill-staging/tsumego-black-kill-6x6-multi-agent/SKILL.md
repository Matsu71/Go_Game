---
name: tsumego-black-kill-6x6-multi-agent
description: Use by default when creating or revising 6x6 black-to-kill tsumego in this project. Coordinates a lean 3-agent workflow with puzzle design, tactical auditing, and uniqueness auditing before the main agent updates canonical tsumego data and regenerates exports.
---

# 6x6 Black-Kill Tsumego Multi-Agent

Use this skill by default when the user wants `6路盤` の `黒先白死` 詰碁を作る or 直す。

Use it together with `tsumego-black-kill-6x6`.

## Coordinate convention

When the user names a point as `x-y`, interpret it as:

- first number: column from the left
- second number: row from the top
- both numbers are 1-based

## Main policy

The main agent is the orchestrator and final integrator.

- The main agent gathers constraints from the user.
- The main agent keeps ownership of final edits in `data/canonical/tsumego-canonical.json` and related exports unless there is a clear reason to delegate a bounded patch.
- Parallel agents should propose, audit, and verify. They should not overwrite each other's work.

## Data workflow

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

Spawn **3 agents by default**.

1. `Problem Designer`

- Responsibility: propose the target white group, starting position, intended kill line, and theme.

2. `Tactical Auditor`

- Responsibility: review wrong black moves, White's best local defense, and whether the final kill is clean and natural.

3. `Uniqueness Auditor`

- Responsibility: check ambiguity, similarity to existing problems, and whether the requested move count matches current app behavior.

## Required outputs

`Problem Designer` must return:

- candidate `initialPosition.rows`
- `target.groups`
- intended correct line
- whether the puzzle should use `solutions.successCondition: "prevent-white-two-eyes"` instead of a guided White reply
- why White dies

`Tactical Auditor` must return:

- which stones are necessary
- which black stones can be removed
- at least one wrong black first move
- White's best local defense
- whether a forced `wrongFirstMoveDefense` should be encoded
- whether White's death is already certain when Black prevents two eyes
- whether the final black move actually captures the target
- whether the guided line feels natural

`Uniqueness Auditor` must return:

- whether alternate correct first moves exist
- which existing problems are closest
- whether the shape or idea is too similar
- a clear pass/fail recommendation

## Execution order

1. Main agent reads the current relevant puzzle data and user constraints.
2. Main agent reads nearby existing problems in canonical before delegating.
3. Main agent spawns the 3 default agents in parallel.
4. Main agent chooses one final candidate.
5. Main agent updates canonical, regenerates exports, and runs validation.

## Validation standard

Do not ship a new `黒先白死` puzzle until all of these are true:

- The intended first move is legal.
- The target white group exists in the start position.
- For `solutions.successCondition: "prevent-white-two-eyes"`, the intended first move collapses White's two-eye shape, solves immediately, and does not queue auto-white.
- For guided problems, the intended line kills White in the stated move count.
- At least one plausible wrong move fails.
- If `wrongFirstMoveDefense` is configured, White's forced reply is legal after wrong starts and reproduces the intended White settlement.
- The puzzle is not substantially similar to an existing one.
- The regenerated exports stay in sync with canonical.
