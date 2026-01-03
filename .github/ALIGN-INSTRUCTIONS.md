# Aligned Instructions

This document lists the instruction files analyzed and the actions taken to align them with best practices and the specific context of the **NanoBotsIdle** repository.

## Summary of Changes

### 1. New Entry Point: `AGENTS.md`
**Action:** Established/Rewritten `AGENTS.md` in the root directory.
**Purpose:** Serves as a central dispatch for agents, directing them to the project-specific `copilot-instructions.md` and the specialized guidelines in `.github/instructions/`.
**Why:** To ensure a clear documentation hierarchy where `AGENTS.md` acts as the primary index, resolving references from `copilot-instructions.md`.

### 2. Testing Guidelines: `nodejs-javascript-vitest.instructions.md`
**Action:** Relaxed the rule "NEVER change original code to make it easier to test".
**Change:** Updated to encourage refactoring for testability (e.g., dependency injection, pure functions) while cautioning against altering business logic solely for testing convenience.
**Why:** The original rule was too rigid and conflicted with the TDD philosophy promoted in `copilot-instructions.md` (Red -> Green -> Refactor).

### 3. Code Review: `code-review-generic.instructions.md`
**Action:** Populated the "Project Context" section.
**Change:** Added specific details:
- **Tech Stack:** React 19, React Three Fiber, Zustand, Vite, Tailwind v4+
- **Architecture:** Component-based, Modular Engine (`src/engine`), Web Worker simulation
- **Testing:** Vitest, Playwright
**Why:** The file was a generic template. Customizing it ensures that code reviews are relevant to the actual project stack.

### 4. Workflow: `spec-driven-workflow-v1.instructions.md`
**Action:** Added a reference to `copilot-instructions.md`.
**Change:** Inserted a header link to the project-specific instructions.
**Why:** To ensure that agents following the generic workflow also respect the specific architectural constraints of this repository.

## File Inventory

| File | Purpose | Alignment Status |
| :--- | :--- | :--- |
| `.github/copilot-instructions.md` | **Primary** project instructions (Architecture, Stack). | Source of Truth. |
| `.github/instructions/spec-driven-workflow-v1.instructions.md` | Defines the Analyze -> Design -> Implement loop. | Aligned (Linked to Project Specifics). |
| `.github/instructions/memory-bank.instructions.md` | Defines the context management system. | Aligned (Referenced by `AGENTS.md`). |
| `.github/instructions/reactjs.instructions.md` | React best practices. | Aligned. |
| `.github/instructions/typescript-5-es2022.instructions.md` | TypeScript best practices. | Aligned. |
| `.github/instructions/nodejs-javascript-vitest.instructions.md` | Node.js & Vitest guidelines. | **Modified** (Testing rule relaxed). |
| `.github/instructions/code-review-generic.instructions.md` | Code review checklist. | **Modified** (Project context added). |
| `.github/instructions/performance-optimization.instructions.md` | Performance guide. | Aligned. |
| `.github/instructions/playwright-typescript.instructions.md` | E2E testing guide. | Aligned. |
| `AGENTS.md` | Root entry point. | **Created**. |

## Usage
Agents should start by reading `AGENTS.md`, which directs them to the appropriate resources based on the task at hand.
