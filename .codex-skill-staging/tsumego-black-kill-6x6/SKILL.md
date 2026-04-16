---
name: tsumego-black-kill-6x6
description: Reference guidance for creating or revising 6x6 tsumego in this project where Black to play must kill White. Use the canonical tsumego dataset workflow and prefer the companion skill `tsumego-black-kill-6x6-multi-agent` by default for actual puzzle creation or revision work.
---

# 6x6 Black-Kill Tsumego

Use this skill as domain guidance for `黒先白死` problems on `6路盤` in this project.

For actual puzzle creation or revision, prefer `tsumego-black-kill-6x6-multi-agent` by default.

## Coordinate convention

When the user names a point as `x-y`, interpret it as:

- first number: column from the left
- second number: row from the top
- both numbers are 1-based

Example:

- `4-2` means "left 4, top 2"
- in `rows` array indexing, that is `rows[1][3]`

## Data workflow

This project uses canonical-first tsumego data.

- The only master data is `data/canonical/tsumego-canonical.json`.
- Browser data is generated into `data/export/web/tsumego-data.js`.
- Solver and CLI data is generated into `data/export/solver/tsumego-problems.json`.
- When adding or revising a puzzle, edit canonical first, then regenerate exports, then validate.

Use this sequence:

```bash
npm run build:tsumego
npm run validate:tsumego
```

## Core rule

Start from White's eye shape or escape shape, then design the killing move sequence.

- Identify the white group whose death matters.
- Prefer sparse, purposeful black stones.
- Make sure the theme is "kill White", not "capture a random stone that was already dead."

## Problem-building workflow

0. Check exact duplicates first.

- Compare the requested board, goal, target white group, and intended solution against existing canonical problems.
- If it is exactly the same as an existing problem, do not edit files or regenerate exports. Tell the user which existing `第N問` it matches and stop.
- If it is only similar, continue with design and call out the relevant difference.

1. Decide whether the problem is 1-move or guided multi-move.

- If White should die immediately, a single winning first move is enough.
- If Black's move prevents White from ever making two eyes, treat that point as solved. Use `solutions.successCondition: "prevent-white-two-eyes"` and do not require an automatic White reply.
- If the intended answer is 3 moves or longer, encode the reading with `solutions.principalVariation`.

2. Define the target clearly.

- Put the white target under `target.groups`.
- The target should match the group the user is meant to kill.

3. Build the sequence around the vital point.

- The correct black first move should either remove White's last liberty or collapse the eye shape so the guided line finishes the kill.
- For "prevent White's two eyes" problems, the correct black move only needs to collapse the eye shape and make White's death certain.
- If the puzzle is 3-move, White's guided reply should be the strongest local defense and Black's final move should actually capture the target.

4. Check alternate starts.

- Wrong black first moves should fail.
- If another first move also kills cleanly, mark the problem as non-unique or rebuild it.

5. Keep the shape natural.

- Avoid overfilling the board with black stones.
- Avoid themes where White is already trivially dead before Black plays.

## Repo-specific implementation

Edit `data/canonical/tsumego-canonical.json`.

- Use `goalType: "kill"`.
- Put the starting board in `initialPosition.rows`.
- Put the first correct move in `solutions.winningFirstMoves`.
- For one-move eye-shape kills where White's death is certain after Black occupies the vital point, put `solutions.successCondition: "prevent-white-two-eyes"` and keep `verification.shortestWinLength` at `1`.
- For 3-move problems, put the full `black -> white -> black` line in `solutions.principalVariation`.
- If a wrong first move should let White settle immediately, encode the forced white reply in `solutions.wrongFirstMoveDefense`.
- Keep display text in `ui`.

## Validation checklist

Run these checks after editing:

```bash
npm run build:tsumego
npm run validate:tsumego
npm run check:script
```

Use a small Node harness when you need to inspect a line:

```bash
node - <<'NODE'
globalThis.document = undefined;
require('./data/export/web/tsumego-data.js');
const go = require('./script.js');
const problem = go.TSUMEGO_PROBLEMS.find((item) => item.id === 'problem-id');
console.log(problem.solutions);
NODE
```

## Multi-move note

This project already supports guided principal-variation tsumego for `kill` problems.

- Use that only when the intended line is explicit and stable.
- Do not use a guided line just to show White's doomed reply after Black has already prevented two eyes.
- Keep `verification.status` honest when the problem has not been solver-proven against all legal replies.
- If `wrongFirstMoveDefense` is present, make sure the forced white move is legal after plausible wrong starts and actually stabilizes White in the intended way.
