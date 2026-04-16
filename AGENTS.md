# Project Instructions

## Purpose

This repository treats Codex as an active maintainer of the project's reusable workflow, not only as a one-off editor.

- When work reveals stable, reusable process knowledge, record it in persistent project artifacts during the same task when practical.
- Prefer storing repeatable project knowledge in repo files rather than leaving it only in chat history.

## Persistent Knowledge Targets

Use these files as the default places to retain project know-how:

- `AGENTS.md`: project-specific working rules for future Codex runs
- `package.json`: stable commands for build, validation, and maintenance workflows
- `README.md`: human-facing workflow and schema documentation
- `scripts/`: deterministic tooling that should be reused instead of re-typed
- `.codex-skill-staging/`: project-managed skill drafts and updates
- `~/.codex/skills/`: installed Codex skills when a staged skill change should be reflected in real usage

## Tsumego Data Policy

- The only source of truth for tsumego problems is `data/canonical/tsumego-canonical.json`.
- Do not add or edit problems directly in `data/export/web/tsumego-data.js`.
- Do not add or edit problems directly in `data/export/solver/tsumego-problems.json`.
- Update canonical first, then regenerate exports, then validate.
- Browser-visible problem numbers are canonical for numbering. Keep each problem's array order, `title` (`第N問`), and `id` (`problem-N`) aligned.
- Before creating or revising a requested tsumego, compare the request with `data/canonical/tsumego-canonical.json`. If the requested problem is exactly the same as an existing problem, including the starting board, goal, target group, and intended solution, make no file changes, do not regenerate exports, do not commit or push, and tell the user it is the same as the existing `第N問`.
- For `黒先白死` problems where Black's correct move prevents White's two eyes and White's death is already certain, treat that move as the solving move. Encode `solutions.successCondition: "prevent-white-two-eyes"`, keep `verification.shortestWinLength` at `1`, and do not require a guided automatic White reply.
- For guided `黒先黒生き` problems, if a wrong later black move should trigger a specific White refutation, encode it in `solutions.wrongGuidedMoveDefenses` instead of relying on generic auto-White heuristics. For example, when Black's first guided stone becomes the target, White should be forced to attack that stone so Black cannot still make two eyes on the next move.

Default command flow:

```bash
npm run build:tsumego
npm run validate:tsumego
```

Full check:

```bash
npm run check
```

When requested work changes project files, run the appropriate checks, commit the finished change, and push the current branch unless the user explicitly says not to.

## Knowledge Capture Policy

- If a workflow becomes repeatable, add or refine an npm script in `package.json`.
- If a check is deterministic and likely to be reused, prefer a script in `scripts/`.
- If a new tsumego design method becomes stable enough to reuse, create or update a skill.
- If an existing skill becomes stale because the project architecture changed, update the staged skill and, when possible, sync the installed copy.

## Skill Policy

- Keep project-related skill drafts under `.codex-skill-staging/`.
- Keep installed skills aligned with staged skills when the project now depends on the new behavior.
- Keep `黒先黒生き` and `黒先白死` skills aligned with the current canonical/export workflow.
- If sequence-judged `3手詰め` support changes, update both the related skills and the validator guidance in the same task.

## Practical Limits

- There is no silent background setting that edits files without a task.
- The intended behavior is proactive maintenance during relevant Codex work: when a task changes the workflow, Codex should also update the durable project instructions, scripts, docs, or skills that encode that workflow.
