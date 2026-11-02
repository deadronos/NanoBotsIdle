Canonical long-form: `.github/instructions/prompt.instructions.md`

# Prompt & Agent Files

Live locations (do not add new prompt directories):

- `.github/prompts/kebab-case.prompt.md` — 17 files.
- `.github/agents/*.agent.md` — 29 files.
- `skills/<name>/SKILL.md` — 7 skills.

Prompt *content and safety* is `ai-prompt-engineering.md`'s job. This file covers format and tooling.

## Frontmatter

`description`, `mode`, `model`, `tools`. List only tools the prompt actually calls; drop the rest.

## Body order

role → inputs → steps → output format → stop condition.

## Rules

- Real-path rule: reference paths that exist (`src/components/World.tsx`, `memory/tasks/`) and real commands (`npm run typecheck`). Never invent a script.
- End with `Done when:` naming a verifiable check, not "the task is complete".
- Do not restate the hard rules from `AGENTS.md` — link them.
- If a referenced path or command moves, update the prompt in the same PR:

```bash
grep -rn 'src/\|npm run' .github/prompts .github/agents
```
