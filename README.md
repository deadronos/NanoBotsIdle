# NanoFactory Evolution

A bio-inspired nanofactory idle game where you manage swarms of drones, optimize production chains, and push your factory to its limits.

## Overview

You control a growing bio-nanofactory with autonomous drones that harvest resources, craft components, and maintain your operation. The game features:

- **Emergent Swarm Behavior**: Watch drones pathfind, avoid congestion, and optimize their routes
- **Heat Management**: Balance production throughput against rising heat levels
- **Three-Phase Progression**:
  1. **Bootstrap** (0-15min): Build initial production chains
  2. **Networked Logistics** (15-25min): Unlock power systems and optimize routing
  3. **Overclock** (25-45min): Push to critical heat levels for maximum output

## Game Mechanics

### Production Chain
- **Extractors** harvest raw Carbon from resource nodes
- **Assemblers** convert Carbon into Components
- **Fabricators** build DroneFrames from Components
- Drones autonomously haul resources between buildings

### Prestige System
- **Recompile Core**: Reset your run to gain Compile Shards
- Shards earned based on:
  - Peak throughput achieved
  - Logistics cohesion (how smoothly drones operated)
  - Time survived under stress (overclock mode)

### Meta Upgrades
Three persistent upgrade trees:
- **Swarm Cognition**: Smarter drones, better pathfinding, predictive hauling
- **Bio-Structure Templates**: Start runs with better buildings and more resources
- **Compiler Optimization**: Increase shard yields and overclock efficiency

## Development

Built with:
- React + TypeScript
- Zustand for state management
- ECS (Entity Component System) architecture
- Tailwind CSS for styling

### Running the Game

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Design Philosophy

The game emphasizes:
- Visual satisfaction from watching emergent swarm behavior
- Low cognitive overhead (good for idle gameplay)
- Clear progression through prestige mechanics
- Data-driven design (upgrades defined in JSON)

## Future Enhancements

- Fork Process (mid-run mini-prestige)
- More building types (Coolers, Power Veins, Storage)
- Advanced pathfinding with congestion avoidance
- Ghost building placement
- Specialized drone roles (Maintainers)
- Save/load system
- Sound effects and animations

## Development Planning

Comprehensive milestone planning and roadmap documentation:

- **[MILESTONES.md](MILESTONES.md)**: Complete roadmap with 21 milestones across 5 development phases
- **[GITHUB_ISSUES.md](GITHUB_ISSUES.md)**: Ready-to-use templates for creating GitHub issues
- **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)**: Quick reference for developers
- **[MILESTONE_SUMMARY.md](MILESTONE_SUMMARY.md)**: Executive summary and next steps
- **[QUICK_START.md](QUICK_START.md)**: Step-by-step guide for creating GitHub issues

**MVP Timeline**: 10-12 weeks (10 milestones covering Phases 0-2 + visual polish)

## Credits

Game design based on the comprehensive design documents in the `01-*.md` files.
