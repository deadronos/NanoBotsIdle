# TASK001 - Core Production Chain

**Status:** Not Started
**Added:** 2025-11-01
**Updated:** 2025-11-01

## Original Request
Complete the basic production chain with extractors → assemblers → fabricators pipeline working correctly.

## Thought Process
Implement production calculations in the ECS production system using existing balance helpers and wire outputs into inventories. Keep tick ordering deterministic so transfers and production are consistent.

## Implementation Plan
- [ ] Step 1: implement `productionSystem` skeleton and wire to tickWorld
- [ ] Step 2: unit tests for `getProducerOutputPerSec()` and end-to-end production tick
- [ ] Step 3: integration test with UI snapshot to verify visible resource flow
- [ ] Step 4: documentation / memory updates

## Progress Log

## Acceptance Criteria
- Buildings produce resources at expected rates
- Heat affects throughput visibly
- Resource flow visible in UI
