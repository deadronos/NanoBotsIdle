# TASK004 - Save/Load System

**Status:** Completed
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Implement game state persistence to localStorage with migration support for version changes.

## Thought Process
Create serialization helpers with schema headers and a migration registry. Implement autosave manager and separate meta/run handling. Provide unit tests for migration scenarios.

## Implementation Plan
- [x] Step 1: implement serialize/deserialize with schema header (covered in `src/state/persistence.ts`)
- [x] Step 2: implement migration helpers and tests (`src/state/migrations.ts`, `src/state/migrations.test.ts`)
- [x] Step 3: autosave manager and manual UI (autosave manager implemented; UI wiring + controls added)
- [x] Step 4: documentation / memory updates

## Progress Log

- 2025-11-01: Implemented `src/state/saveManager.ts` providing:
	- `saveAll(state)` writes `meta` and `run` sections separately to localStorage keys `nanofactory-save-meta` and `nanofactory-save-run` with version/timestamp headers.
	- `loadAll()` reconstructs a save blob, runs migrations, and returns migrated `meta`/`run` sections.
	- `AutoSaver` class for periodic autosaves (default 30s interval).
	- `clearSaves()` helper.

- 2025-11-01: Added unit test `src/state/saveManager.test.ts` to verify save/load behavior.
- 2025-11-01: Added UI controls `src/ui/panels/SaveControls.tsx` and wired into `TopBar.tsx`.
- 2025-11-01: Added import/export tests `src/state/saveManager.importExport.test.ts` and extended `saveManager` with `exportSave`/`importSave`.
- 2025-11-01: Implemented safe restore routine `applySaveToStore` and integrated Load action to fully restore in-memory store (pauses simulation while applying).
- 2025-11-01: Added lightweight ToastProvider `src/ui/ToastProvider.tsx` and replaced alerts/console logs in `SaveControls` with toasts.
 - 2025-11-01: Added full-world snapshot support in saves and implemented full run restore (replaces in-memory `world` when present in save).
 - 2025-11-01: Added compressed export/import helpers (`exportCompressedSave` / `importCompressedSave`) using gzip + base64 and UI support to copy compressed payload to clipboard.
 - 2025-11-01: Wired AutoSaver into app startup (`src/App.tsx`) to start autosave on mount (30s default) and stop on unmount.
 - 2025-11-01: Added `src/ui/panels/SaveControls.tsx` UI with Save / Load / Clear / Export / Export Compressed / Import actions and integrated it into `TopBar.tsx`.
 - 2025-11-01: Added unit tests covering migrations, save/load, import/export, compressed import, and full-world restore:
	 - `src/state/migrations.test.ts`
	 - `src/state/saveManager.test.ts`
	 - `src/state/saveManager.importExport.test.ts`
	 - `src/state/restore.test.ts`
 - 2025-11-01: Updated documentation and TASK004 progress log (this file).

## Summary of acceptance

- Game state persists across browser refreshes via `saveAll()` and `AutoSaver`.
- Meta upgrades are stored separately from run state (`nanofactory-save-meta`, `nanofactory-save-run`).
- Migration pipeline (`src/state/migrations.ts`) upgrades legacy saves to the current schema before restore.
- Full-run restores supported: when a `run.world` snapshot exists in a save blob, `applySaveToStore()` will replace the in-memory `world` safely (simulation paused during apply).
- Export/import supported for raw JSON and compressed base64-gzip payloads; compressed payloads can be copied to clipboard for sharing.

## Notes and follow-ups

- Replacing the full `world` is destructive; consider adding a confirmation modal with an undo snapshot in the UI (recommended).
- Large run snapshots may exceed localStorage limits. For larger worlds consider moving run snapshots to IndexedDB and keeping meta in localStorage.
- The compressed export uses `pako` — ensure `npm install` is run to include the dependency.
## Acceptance Criteria
- Game state persists across browser refreshes
- Meta upgrades saved separately from run state
- Migration handles old save formats gracefully

Expanded Acceptance (concrete checks)
- Autosave persists `meta` and `run` state separately on a 30s interval by default (configurable).
- `serializeWorld()` and `deserializeWorld()` support a schema version header; migration functions handle forward/backward compatibility in tests.
- Unit test: saving a sample world and loading it back produces an equivalent `meta` state and a run state compatible with a newer schema (migration test case).
	- Tests added for basic save/load; additional migration-specific import tests may be added later.
