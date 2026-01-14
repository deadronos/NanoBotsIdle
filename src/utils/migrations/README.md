# Save Data Migrations

This directory contains the versioned save data migration framework for Voxel Walker.

## Overview

The save system uses a versioned schema approach to ensure backward compatibility as the game evolves. When changes are made to the game state structure, migrations allow old save files to be automatically upgraded to the current version.

## Current Version

**Version 2** (as of 2024-12-31)

## Architecture

### Key Files

- **`types.ts`**: Core types and interfaces for the migration system
- **`registry.ts`**: Migration registry and execution logic
- **`validation.ts`**: Save data validation and sanitization utilities
- **`v1-to-v2.ts`**: Example migration (v1 → v2)

### Migration Flow

```
1. User imports save file
   ↓
2. Parse JSON and validate structure (validateSaveStructure)
   ↓
3. Determine migration path (getMigrationsPath)
   ↓
4. Apply migrations sequentially (applyMigrations)
   ↓
5. Validate migrated game state (validateGameState)
   ↓
6. Sanitize values to safe ranges (sanitizeGameState)
   ↓
7. Apply to game store
```

## Creating a New Migration

When you need to make breaking changes to the save format:

### 1. Increment Version

Update `CURRENT_SAVE_VERSION` in `types.ts`:

```typescript
export const CURRENT_SAVE_VERSION = 3; // was 2
```

### 2. Create Migration File

Create a new file `vN-to-vN+1.ts` (e.g., `v2-to-v3.ts`):

```typescript
import type { Migration } from "./types";

// Define old and new data structures
interface SaveDataV2 {
  credits: number;
  // ... existing fields
}

interface SaveDataV3 {
  credits: number;
  newField: string; // New field added
  // ... existing fields
}

// Transformation logic
function transformV2ToV3(v2Data: SaveDataV2): SaveDataV3 {
  return {
    ...v2Data,
    newField: "default_value", // Provide sensible default
  };
}

// Export migration
export const migrateV2ToV3: Migration = {
  fromVersion: 2,
  toVersion: 3,
  description: "Add newField with default value",
  migrate: (data: unknown): SaveDataV3 => {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid v2 save data: expected object");
    }
    return transformV2ToV3(data as SaveDataV2);
  },
};
```

### 3. Register Migration

Add the new migration to the registry in `registry.ts`:

```typescript
import { migrateV1ToV2 } from "./v1-to-v2";
import { migrateV2ToV3 } from "./v2-to-v3";

const migrations: Migration[] = [
  migrateV1ToV2,
  migrateV2ToV3, // Add new migration
];
```

### 4. Update Validation

If new fields require validation, update `validation.ts`:

```typescript
export function validateGameState(data: Partial<GameState>): ValidationResult {
  // ... existing validation

  // Add validation for new field
  if (data.newField !== undefined && typeof data.newField !== "string") {
    errors.push(`Field 'newField' must be a string`);
  }
}
```

### 5. Write Tests

Create test fixtures and add tests to `tests/save-migrations.test.ts`:

```typescript
it("should migrate v2 to v3 successfully", () => {
  const v2Data = {
    credits: 1000,
    // ... v2 fields
  };

  const migrations = getMigrationsPath(2, 3);
  const result = applyMigrations(v2Data, migrations);

  expect(result.newField).toBe("default_value");
});
```

## Testing Strategy

The migration system has three levels of tests:

1. **Unit Tests** (`save-migrations.test.ts`): Test individual migration logic
2. **Validation Tests** (`save-validation.test.ts`): Test validation rules
3. **Roundtrip Tests** (`save-roundtrip.test.ts`): Test complete import/export cycles with fixtures

### Test Fixtures

Located in `tests/fixtures/saves/`:

**Valid Saves:**
- `valid-v1.json`: Valid version 1 save with typical data
- `valid-v2.json`: Valid version 2 save with all current fields
- `minimal-v1.json`: Minimal v1 save with only required fields

**Edge Cases:**
- `edge-case-empty-v1.json`: Completely empty data object (tests defaults)
- `edge-case-extreme-values-v2.json`: Very large numbers (tests value preservation)
- `edge-case-negative-values-v1.json`: Negative/invalid values (tests sanitization)
- `backward-compat-v2-missing-optional.json`: Missing optional fields (tests defaults)

**Invalid Saves:**
- `invalid-no-version.json`: Missing version field
- `invalid-no-data.json`: Missing data field
- `invalid-bad-types.json`: Wrong types for numeric fields

**Future Compatibility:**
- `future-version.json`: Simple future version (v99)
- `future-v3-with-unknown-fields.json`: Future version with new fields
- `future-v10-minimal.json`: Far future version with minimal data

## Best Practices

### Migration Design

1. **Never delete data**: Migrations should be additive when possible
2. **Provide defaults**: Always provide sensible defaults for new fields
3. **Validate inputs**: Validate data at each migration step
4. **Document changes**: Clearly document what changed and why in the migration description
5. **Test thoroughly**: Create fixtures for edge cases and test migration paths

### Edge Case Handling

When designing migrations, consider these edge cases:

1. **Empty Data**: Saves with no fields should migrate successfully with all defaults
2. **Negative Values**: Handle out-of-range values with validation warnings and sanitization
3. **Missing Optional Fields**: Old saves may be missing fields that became required
4. **Extreme Values**: Very large or small numbers should be preserved if valid
5. **Invalid Types**: Type mismatches should be caught by validation, not migration

### Forward Compatibility

The migration system includes forward compatibility handling:

1. **Future Version Detection**: Warns users when importing saves from newer app versions
2. **Unknown Field Detection**: Identifies and warns about fields not in the current schema
3. **Graceful Degradation**: Sanitization filters unknown fields while preserving known data
4. **User Guidance**: Clear messages encourage users to update the app for full compatibility

Example warning:
```
Save contains unknown fields that may be from a future version: newFeatureInV3, quantumState.
These fields will be ignored. Consider updating the app to preserve all data.
```

### Error Handling

- **Validation errors**: Should be clear and actionable for users
- **Migration failures**: Should indicate which version transition failed
- **Data sanitization**: Clamp values to safe ranges rather than rejecting saves

### Versioning Strategy

- **Increment version** only for breaking changes
- **Zustand persist version** should match `CURRENT_SAVE_VERSION`
- **Backward compatible changes** (adding optional fields) may not require version bump

## Troubleshooting

### Save fails to import

1. Check browser console for specific error messages
2. Validate JSON structure in the save file
3. Verify migration path exists for that version
4. Check validation rules for newly added fields

### Migration regression

1. Run full test suite: `npm test save`
2. Check roundtrip tests for data loss
3. Verify all fixtures still load correctly

### Adding new fields

If adding a new field to `GameState`:

1. Update interface in `src/store.ts`
2. Decide if it requires a version bump (breaking vs. optional)
3. If breaking, create new migration
4. Update validation and sanitization rules
5. Add test fixtures and tests

## Version History

### Version 2 (Current)

- Added `totalBlocks` field to track total mineable blocks
- Ensured all GameState fields have explicit defaults
- Migration: v1 → v2

### Version 1 (Legacy)

- Initial save format
- Missing `totalBlocks` field (was computed)
- Optional field defaults could cause inconsistencies
