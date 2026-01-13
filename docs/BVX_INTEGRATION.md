# BVX-Kit Integration Guide

## Overview

This project now integrates the [bvx-kit library](https://github.com/astrum-forge/bvx-kit) - a generic, renderer-agnostic BitVoxel engine written in TypeScript. The integration provides efficient voxel storage, management, and geometry generation capabilities alongside the existing voxel system.

## What is bvx-kit?

**BitVoxel Engine** is an optimized voxel rendering and data management engine that introduces a unique approach to voxel-based environments by:

- **Separating meta-data from rendering states**: Voxel meta-data (e.g., material type) is decoupled from BitVoxel states
- **Memory efficiency**: Uses only 1 bit per BitVoxel, with flexible meta-data layers (0, 8, 16, or 32 bits per voxel)
- **Pre-computed geometry**: Provides lookup tables for efficient rendering
- **Spatial indexing**: Uses Morton keys for fast chunk lookups

### Key Components

#### VoxelWorld
- Central container for all voxel chunks
- Uses HashGrid with MortonKey for spatial indexing
- Provides O(1) chunk lookup
- Includes built-in VoxelRaycaster for ray-based queries

#### VoxelChunk
- Abstract base class with 4 concrete variants: VoxelChunk0, VoxelChunk8, VoxelChunk16, VoxelChunk32
- Each chunk contains 4×4×4 voxels = 64 voxels
- Each voxel contains 4×4×4 BitVoxels = 64 BitVoxels per voxel
- Total: 16×16×16 BitVoxels per chunk (4096 BitVoxels)

#### BVXLayer
- Manages BitVoxel states using efficient bit arrays
- Stores 4096 BitVoxels (16×16×16) using only 512 bytes
- Provides set, unset, toggle, fill, and empty operations

#### VoxelIndex
- 12-bit key encoding voxel (x,y,z: 0-3) and BitVoxel (u,v,w: 0-3) coordinates
- Enables efficient addressing of specific BitVoxels within a chunk

#### MortonKey
- Z-order curve (Morton code) for spatial hashing
- Maps 3D coordinates to 1D values preserving spatial locality
- Enables fast spatial queries and neighbor lookups

#### BVXGeometry
- Pre-computed vertex, normal, and UV data for BitVoxel rendering
- Lookup table approach for extremely fast geometry generation
- Renderer-agnostic design works with any rendering engine

## Integration Architecture

### File Structure

```
src/shared/
  ├── voxel.ts              # Re-exports from bvxAdapter for compatibility
  ├── bvxAdapter.ts         # Core adapter bridging game logic with bvx-kit
  └── bvxIntegration.ts     # High-level utilities and examples
```

### BVXWorldAdapter

The `BVXWorldAdapter` class provides the main bridge between NanoBotsIdle's coordinate system and bvx-kit's chunk-based system:

```typescript
import { BVXWorldAdapter } from "@/shared/bvxAdapter";

const adapter = new BVXWorldAdapter();

// Set a voxel at world coordinates
adapter.setVoxel(10, 20, 30, MATERIAL_SOLID);

// Get voxel state
const material = adapter.getVoxel(10, 20, 30);

// Check if voxel exists
if (adapter.hasVoxel(10, 20, 30)) {
  console.log("Voxel is solid");
}

// Access underlying VoxelWorld
const world = adapter.getWorld();
```

### bvxIntegration Helpers

The `bvxIntegration` module provides convenient utilities for working with bvx-kit:

```typescript
import {
  createBVXWorld,
  createChunk,
  setVoxelInChunk,
  getVoxelInChunk,
  fillVoxelInChunk,
  getBVXVertices,
  getBVXNormals,
  worldToChunkLocal,
} from "@/shared/bvxIntegration";

// Create a world and chunk
const world = createBVXWorld();
const chunk = createChunk(0, 0, 0);
world.insert(chunk);

// Work with BitVoxels (0-15 coordinates)
setVoxelInChunk(chunk, 8, 8, 8, true);
const isSet = getVoxelInChunk(chunk, 8, 8, 8); // true

// Fill entire voxels (4×4×4 BitVoxels at once)
fillVoxelInChunk(chunk, 2, 2, 2); // Fills voxel at (2,2,2) within chunk

// Convert world coordinates to chunk + local
const { cx, cy, cz, lx, ly, lz } = worldToChunkLocal(100, 200, 300);

// Access pre-computed geometry
const vertices = getBVXVertices(); // Float32Array
const normals = getBVXNormals(); // Float32Array
```

## Coordinate System Mapping

### Understanding the Hierarchy

```
World Space (arbitrary integer coords)
    ↓
Chunk Space (divide by 16)
    ↓
Local BitVoxel Space (0-15 within chunk)
    ↓
Voxel Space (0-3, each voxel is 4×4×4 BitVoxels)
    ↓
Sub-Voxel BitVoxel Space (0-3 within voxel)
```

### Example Coordinate Conversion

World position (100, 200, 300):
- Chunk coords: (6, 12, 18) — floor(100/16), floor(200/16), floor(300/16)
- Local BitVoxel: (4, 8, 12) — 100%16, 200%16, 300%16
- Voxel within chunk: (1, 2, 3) — floor(4/4), floor(8/4), floor(12/4)
- BitVoxel within voxel: (0, 0, 0) — 4%4, 8%4, 12%4

## Usage Examples

### Example 1: Creating a Simple Structure

```typescript
import { createBVXWorld, createChunk, fillVoxelInChunk } from "@/shared/bvxIntegration";

const world = createBVXWorld();
const chunk = createChunk(0, 0, 0);

// Create a 4×4 ground plane
for (let x = 0; x < 4; x++) {
  for (let z = 0; z < 4; z++) {
    fillVoxelInChunk(chunk, x, 0, z);
  }
}

// Add a pillar
for (let y = 1; y < 4; y++) {
  fillVoxelInChunk(chunk, 2, y, 2);
}

world.insert(chunk);
```

### Example 2: World Coordinate Integration

```typescript
import { BVXWorldAdapter } from "@/shared/bvxAdapter";

const adapter = new BVXWorldAdapter();

// Generate terrain
for (let x = -50; x < 50; x++) {
  for (let z = -50; z < 50; z++) {
    const height = Math.floor(Math.sin(x / 10) * 5 + Math.cos(z / 10) * 5);
    for (let y = 0; y <= height; y++) {
      adapter.setVoxel(x, y, z, MATERIAL_SOLID);
    }
  }
}

// Query voxels
const isGround = adapter.hasVoxel(0, 0, 0);
```

### Example 3: Using Pre-Computed Geometry

```typescript
import { getBVXVertices, getBVXNormals, getBVXUV } from "@/shared/bvxIntegration";

// Get pre-computed data for rendering
const vertices = getBVXVertices(); // Float32Array of vertex positions
const normals = getBVXNormals(); // Float32Array of normal vectors
const uv = getBVXUV(); // Float32Array of UV coordinates

// Use with Three.js or any renderer
const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
```

## Testing

Comprehensive test coverage is provided in `tests/bvx-integration.test.ts`:

```bash
# Run bvx-kit integration tests
npm test -- tests/bvx-integration.test.ts

# Run all tests
npm test
```

Tests cover:
- VoxelWorld and chunk creation
- Voxel set/get operations
- Fill/empty operations
- Coordinate conversions
- Pre-computed geometry access
- State consistency across operations

## Performance Considerations

### Memory Efficiency

- **Traditional approach**: 1 byte per voxel minimum = 4096 bytes per 16³ chunk
- **bvx-kit BVXLayer**: 1 bit per BitVoxel = 512 bytes per 16³ chunk
- **Savings**: ~87.5% memory reduction for voxel states

### Spatial Queries

- Morton key hashing provides O(1) chunk lookup
- Spatial locality preserved for efficient neighbor queries
- HashGrid reduces collision overhead

### Geometry Generation

- Pre-computed lookup tables eliminate runtime calculation
- Optimized for face culling and occlusion
- Minimal allocation overhead

## Backward Compatibility

The integration maintains full backward compatibility:

```typescript
// Old code still works
import { MATERIAL_AIR, MATERIAL_SOLID, voxelKey } from "@/shared/voxel";

const key = voxelKey(10, 20, 30); // Still works
```

All existing tests pass (351 tests) with zero breaking changes.

## When to Use bvx-kit vs. Existing System

### Use bvx-kit when:
- Building new features requiring efficient voxel storage
- Need spatial queries with MortonKey indexing
- Want pre-computed geometry for fast rendering
- Memory efficiency is critical

### Use existing system when:
- Working with established game logic (WorldModel, frontier tracking)
- Custom meshing algorithms (greedy mesher) are required
- Integration overhead outweighs benefits

## Future Opportunities

### Potential Enhancements

1. **VoxelRaycaster Integration**: Use bvx-kit's raycaster for player interactions
2. **Geometry Pipeline**: Integrate BVXGeometry into rendering pipeline
3. **World Streaming**: Use VoxelWorld as backend for chunk streaming
4. **Meta-Data Layers**: Utilize VoxelChunk8/16/32 for material properties
5. **Multi-Resolution**: Leverage LOD capabilities for distant chunks

### Extension Points

The adapter pattern allows incremental adoption:
- Start with storage optimization
- Gradually migrate rendering
- Maintain dual systems during transition

## Resources

- [bvx-kit GitHub Repository](https://github.com/astrum-forge/bvx-kit)
- [bvx-kit White Paper](https://github.com/astrum-forge/bvx-kit/blob/main/whitepaper.pdf)
- Project Integration: `src/shared/bvxAdapter.ts` and `src/shared/bvxIntegration.ts`
- Tests: `tests/bvx-integration.test.ts`

## License

bvx-kit is licensed under Apache 2.0. See the [LICENSE](https://github.com/astrum-forge/bvx-kit/blob/main/LICENSE) file in the bvx-kit repository.
