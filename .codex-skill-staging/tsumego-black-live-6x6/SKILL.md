---
name: tsumego-black-live-6x6
description: Reference guidance for creating or revising 6x6 tsumego in this project where Black to play must live, usually by making two eyes. Prefer the companion skill `tsumego-black-live-6x6-multi-agent` by default for actual puzzle creation or revision work.
---

# 6x6 Black-Live Tsumego

Use this skill as domain guidance for `黒先黒生き` problems on the fixed `6路盤` in this project.

For actual puzzle creation or revision, prefer `tsumego-black-live-6x6-multi-agent` by default.

## Coordinate convention

When the user names a point as `x-y`, interpret it as:

- first number: column from the left
- second number: row from the top
- both numbers are 1-based

Example:

- `3-5` means "left 3, top 5"
- in `rows` array indexing, that is `rows[4][2]`

## Core rule

Start from the final living black shape, not from a random surrounded position.

- First identify the smallest natural black shape that is alive.
- Prefer edge or corner use when searching for a minimal two-eye shape.
- If the minimal shape is unclear, search programmatically before editing problem data.

## Problem-building workflow

1. Decide the target outcome.

- Black must live.
- For two-eye problems, the final target black group must have two eyes.
- Do not assume the puzzle is 1-move only. The intended move count may be 1, 3, 5, or more.

2. Build the final alive shape first.

- Create a candidate final board where the target black group is alive.
- Keep black stones minimal unless the user asks for a richer shape.
- Confirm the final shape is truly alive by checking the target group's `eyeRegionIds.size >= 2` with the repo logic in `script.js`.

3. Back up to the puzzle start.

- Remove the final correct black move, or back out the full correct line one move at a time for longer problems.
- The starting black group must not already be alive.
- The correct line should restore life cleanly.

4. Add white stones sparingly.

- Put only the white stones needed to attack or surround the black group.
- White should have outside liberties or a believable attacking shape.
- In simple black-live problems, White's attacking shape should also be hard to kill.
- If a diagonal weakness or thin point lets Black switch plans and kill White instead of proving life, reinforce that weakness before shipping the puzzle.
- Do not fill the whole board with white just to force the result.
- Avoid setups where the "black lives" move is really just "black captures all white immediately."

5. Check wrong moves.

- Legal but wrong black moves should fail to make the target black group alive.
- For this app, wrong moves on `goalType: "live"` should still give white a sensible auto-attack path.
- If a candidate wrong move accidentally also makes two eyes, the problem is ambiguous and should be rebuilt.

6. Check similarity against existing problems.

- Compare the candidate with existing entries in `tsumego-data.js`.
- Treat mirrored, shifted, rotated, or lightly decorated versions of the same local idea as too similar.
- If the vital point and eye-making idea match an existing problem too closely, rebuild the candidate.

## Repo-specific implementation

Edit `tsumego-data.js` and keep the entry explicit.

- Use `goalType: "live"`.
- `rows` should describe the starting position.
- `targetStones` should identify the black stones whose survival matters in the starting position.
- `solution` is the first correct move.
- Update the problem count or problem description in `README.md` when adding or replacing a puzzle.

## Validation checklist

Run these checks after editing:

```bash
node --check script.js
node --check tsumego-data.js
```

Use a small Node harness for puzzle validation:

```bash
node - <<'NODE'
require('./tsumego-data.js');
const go = require('./script.js');
const problem = go.TSUMEGO_PROBLEMS.find((item) => item.id === 'problem-id');
const result = go.attemptTsumegoMove(go.createTsumegoState('problem-id'), row, col);
console.log(result.valid, result.nextState?.solved);
console.log(go.isTsumegoLiveByTwoEyes(result.nextState.board, problem));
NODE
```

For a good `黒生き` puzzle, verify all of the following:

- The intended first move is legal.
- The intended line makes the target black group alive.
- The starting position is not already alive.
- At least one plausible wrong move stays not alive.
- On simple black-live problems, plausible wrong moves should not turn into an easy White-killing sequence because White was left too thin.
- White stones are not overfilled and are not trivially all captured by the correct move unless that is the explicit puzzle theme.
- The puzzle is not substantially similar to an existing problem in local shape, life idea, or vital point.

## Multi-move note

The current app logic grades only the first move and then lets the user continue reading freely.

- If the user asks for a true 3-move or 5-move judged problem, do not pretend the current implementation already supports that.
- Either extend the app to validate move sequences, or state clearly that only the first move is auto-judged and the rest is for study.
