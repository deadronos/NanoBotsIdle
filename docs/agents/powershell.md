Canonical long-form: `.github/instructions/powershell.instructions.md`

# PowerShell

Scope: **there is no PowerShell in this repo today** — `scripts/` is Node and CI runs `ubuntu-latest`. These rules apply only if a `.ps1` is added; `npm run …` stays the canonical entry point on every OS.

- Use full cmdlet names, never aliases: `Get-ChildItem`, not `ls`.
- `[CmdletBinding()]` plus typed `[Parameter()]` attributes; validate early and fail fast.
- `$ErrorActionPreference = 'Stop'`; `throw` inside `catch`, never `exit` inside a function.
- Emit data with `Write-Output` or objects; `Write-Host` is for human UI only.
- No interactive prompts in automation; support `-WhatIf`/`-Confirm` on destructive operations.
- Run PSScriptAnalyzer before committing; keep LF endings (repo is macOS/Linux-first).

Deletion candidate if no `.ps1` lands — tracked in `decisions.md`.
