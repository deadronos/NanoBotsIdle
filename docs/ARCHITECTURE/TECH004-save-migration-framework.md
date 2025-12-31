# TECH004: Save Migration Framework

**Status:** Implemented  
**PRs:** #99, #100, #101  
**Last updated:** 2025-12-31

## Overview

NanoBotsIdle uses a versioned save schema with an automatic migration framework to ensure backward compatibility as the game state evolves.

## Save Format

All saves follow a consistent envelope structure:

```typescript
interface SaveFile {
  version: number;  // Schema version (currently 2)
  date: string;     // ISO timestamp of save
  data: GameData;   // Actual game state
}
```

## Migration Architecture

### Components

| File | Purpose |
|------|---------|
| `src/utils/migrations/types.ts` | Core types and `CURRENT_SAVE_VERSION` |
| `src/utils/migrations/registry.ts` | Migration execution logic |
| `src/utils/migrations/validation.ts` | Structure and data validation |
| `src/utils/migrations/v1-to-v2.ts` | Example migration |
| `src/utils/migrations/README.md` | Developer guide |

### Migration Flow

```mermaid
flowchart TD
    A[User imports save file] --> B{Validate structure}
    B -->|Invalid| C[Error: missing fields]
    B -->|Valid| D{Check version}
    D -->|Up to date| E[Validate data]
    D -->|Outdated| F[Get migration path]
    F --> G[Apply migrations sequentially]
    G --> E
    E -->|Invalid| H[Error: bad data]
    E -->|Valid| I[Sanitize values]
    I --> J[Apply to game store]
```

### Adding a New Migration

1. **Update version** in `types.ts`:
   ```typescript
   export const CURRENT_SAVE_VERSION = 3;
   ```

2. **Create migration file** (`v2-to-v3.ts`):
   ```typescript
   export const migrateV2ToV3: Migration = {
     fromVersion: 2,
     toVersion: 3,
     description: "Add new field",
     migrate: (data) => ({ ...data, newField: defaultValue }),
   };
   ```

3. **Register** in `registry.ts`

4. **Add tests and fixtures**

## Validation & Sanitization

### Structure Validation
- Checks `version`, `date`, and `data` fields exist
- Validates types (number, string, object)

### Data Validation
- Checks all game state fields are correct types
- Warns about out-of-range values

### Sanitization
- Credits: clamp to ≥ 0
- Prestige level: clamp to ≥ 1
- Drone count: clamp to ≥ 1
- Upgrade levels: clamp to ≥ 1

## Error Handling

Clear, actionable error messages:

- `Save file missing required 'version' field`
- `Field 'credits' must be a finite number, got: string`
- `Warning: Save file version (v99) is newer than this app (v2)`

## Testing

Comprehensive test coverage in:
- `tests/save-migrations.test.ts` — migration logic
- `tests/save-validation.test.ts` — validation
- `tests/save-roundtrip.test.ts` — full import/export cycles

Fixtures in `tests/fixtures/saves/`:
- `valid-v1.json`, `valid-v2.json`, `minimal-v1.json`
- `invalid-no-version.json`, `invalid-no-data.json`
- `future-version.json`

## Related

- `MIGRATION_SUMMARY.md` — detailed implementation notes
- `src/store.ts` — uses current version for exports
- `src/utils/saveUtils.ts` — import/export utilities
