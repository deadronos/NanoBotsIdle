# NanoFactory Evolution - Copilot Instructions

## Repository Overview

NanoFactory Evolution is a bio-inspired nanofactory idle game built with React 19, TypeScript, and an Entity Component System (ECS) architecture. Players manage swarms of autonomous drones, optimize production chains, and balance heat management while pushing their factory to its limits.

### Tech Stack
- **Frontend**: React 19 with functional components and hooks
- **Language**: TypeScript (strict mode)
- **State Management**: Zustand
- **Styling**: Tailwind CSS v4
- **Build Tool**: Vite
- **Architecture**: ECS (Entity Component System) - separates data (components) from logic (systems) for scalable game architecture

## Development Commands

### Setup
```bash
npm install
```

### Development
```bash
npm run dev        # Start development server with hot reload
```

### Build
```bash
npm run build      # TypeScript compilation + Vite production build
```

### Preview
```bash
npm run preview    # Preview production build locally
```

## Project Structure

```
src/
├── ecs/           # Entity Component System (components, systems)
├── sim/           # Simulation logic (game loop, balance)
├── state/         # Zustand state management
├── types/         # TypeScript type definitions
└── ui/            # React components
    ├── panels/    # UI panels (BuildPanel, TopBar, etc.)
    └── simview/   # Canvas rendering components
```

## Code Style & Best Practices

### React Development
- Use functional components with hooks (React 19 features)
- Follow component composition patterns
- Implement proper TypeScript types for all props and state
- See `.github/instructions/reactjs.instructions.md` for detailed guidelines

### TypeScript
- Use strict mode (configured in `tsconfig.json`)
- Define interfaces for all data structures
- Leverage type inference where appropriate
- Avoid `any` types

### State Management
- Use Zustand for global state
- Keep component state local when possible
- Follow immutable update patterns

### ECS Architecture
- Components are pure data containers (no logic)
- Systems operate on entities with specific component combinations
- Maintain separation between simulation and UI layers

### Styling
- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Maintain consistent spacing and color schemes

## Testing

**Note**: This repository currently does not have a test framework configured. When adding tests:
- Consider using Vitest (aligns well with Vite build tool) or React Testing Library
- Test both simulation logic and UI components
- Ensure tests are focused and maintainable
- Add test scripts to `package.json`

## Important Files

### Configuration
- `vite.config.ts` - Vite build configuration
- `tsconfig.json` - TypeScript compiler options
- `tailwind.config.js` - Tailwind CSS configuration
- `package.json` - Dependencies and scripts

### Game Design Documents
- `01-*.md` files contain comprehensive game design documentation
- Reference these for understanding game mechanics and intended behavior

## Detailed Instructions

This repository includes comprehensive instruction files in `.github/instructions/`:

- **reactjs.instructions.md** - React development standards
- **spec-driven-workflow-v1.instructions.md** - Development workflow
- **memory-bank.instructions.md** - Project context management
- **self-explanatory-code-commenting.instructions.md** - Code documentation standards
- **nodejs-javascript-vitest.instructions.md** - Node.js best practices
- **playwright-typescript.instructions.md** - Testing with Playwright
- **markdown.instructions.md** - Documentation standards
- **powershell.instructions.md** - PowerShell scripting

Refer to these files for detailed guidance on specific aspects of development.

## Pull Request Guidelines

When creating pull requests:

1. **Clear Description**: Explain what changes were made and why
2. **Reference Issues**: Link to related GitHub issues
3. **Build Verification**: Ensure `npm run build` succeeds
4. **Code Quality**: Follow TypeScript and React best practices
5. **Minimal Changes**: Make focused, surgical changes to address specific issues
6. **Documentation**: Update relevant documentation if needed

## Game Context

Understanding the game helps make better decisions:

- **Three-Phase Progression**: Bootstrap → Networked Logistics → Overclock
- **Production Chain**: Extractors → Assemblers → Fabricators → Drones
- **Prestige System**: "Recompile Core" resets runs for Compile Shards
- **Heat Management**: Balance production throughput against rising heat
- **Emergent Behavior**: Drones autonomously pathfind, avoid congestion, optimize routes

## Common Tasks

### Adding New Buildings
1. Define type in `src/types/buildings.ts`
2. Add ECS components as needed
3. Update building logic in relevant systems
4. Add UI elements in `src/ui/panels/BuildPanel.tsx`

### Modifying Game Balance
- Edit `src/sim/balance.ts`
- Reference design documents for intended balance
- Test changes with `npm run dev`

### UI Changes
- Components are in `src/ui/`
- Use Tailwind utility classes
- Maintain responsive design
- Follow React 19 best practices

## Notes for AI Agents

- This is an active game development project with detailed design docs
- ECS architecture means logic is spread across systems, not components
- The codebase uses modern React patterns (no class components)
- Game state is managed through Zustand stores
- Simulation runs independently from React render cycles
- Always preserve existing game mechanics unless explicitly asked to change them
