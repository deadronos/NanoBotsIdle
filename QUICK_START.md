# Quick Start: Creating GitHub Issues

This is a step-by-step guide for creating the GitHub milestones and issues for NanoFactory Evolution.

## Prerequisites

- You need **write access** to the repository
- Access to GitHub web interface at https://github.com/deadronos/NanoBotsIdle

## Step 1: Create Milestones (5 minutes)

1. Navigate to: https://github.com/deadronos/NanoBotsIdle/milestones
2. Click "**New milestone**" button
3. Create each milestone with these details:

### Milestone 1: Phase 0 - Foundation
- **Title**: Phase 0 - Foundation  
- **Due date**: (Optional, e.g., 3 weeks from start)
- **Description**: Core systems, UI, and save/load functionality. Required for MVP.

### Milestone 2: Phase 1 - Progression
- **Title**: Phase 1 - Progression
- **Due date**: (Optional, e.g., 6 weeks from start)
- **Description**: Three-phase gameplay loop (Bootstrap → Networked → Overclock). Required for MVP.

### Milestone 3: Phase 2 - Meta Progression
- **Title**: Phase 2 - Meta Progression
- **Due date**: (Optional, e.g., 10 weeks from start)
- **Description**: Prestige system with Compile Shards and meta upgrade trees. Required for MVP.

### Milestone 4: Phase 3 - Fork Process
- **Title**: Phase 3 - Fork Process
- **Due date**: (Optional, post-1.0)
- **Description**: Mid-run mini-prestige with behavior modules. Post-MVP feature.

### Milestone 5: Phase 4 - Polish
- **Title**: Phase 4 - Polish
- **Due date**: (Optional, spans development)
- **Description**: Visual effects, audio, and additional content.

### Milestone 6: Phase 5 - Endgame
- **Title**: Phase 5 - Endgame
- **Due date**: (Optional, post-1.0)
- **Description**: Extended progression and challenge modes for long-term play.

## Step 2: Create Labels (5 minutes)

Navigate to: https://github.com/deadronos/NanoBotsIdle/labels

Create these labels if they don't exist:

| Label | Color | Description |
|-------|-------|-------------|
| `MVP` | #d73a4a | Required for minimum viable product |
| `Phase-0` | #0075ca | Phase 0 - Foundation |
| `Phase-1` | #0075ca | Phase 1 - Progression |
| `Phase-2` | #0075ca | Phase 2 - Meta Progression |
| `Phase-3` | #0075ca | Phase 3 - Fork Process |
| `Phase-4` | #0075ca | Phase 4 - Polish |
| `Phase-5` | #0075ca | Phase 5 - Endgame |
| `core-systems` | #d876e3 | Core game systems |
| `ui` | #d876e3 | User interface |
| `game-design` | #d876e3 | Game design and balance |
| `prestige` | #d876e3 | Prestige/meta progression |
| `fork-system` | #d876e3 | Fork Process features |
| `content` | #d876e3 | New content and features |
| `polish` | #d876e3 | Visual/audio polish |
| `optimization` | #d876e3 | Performance improvements |
| `endgame` | #d876e3 | Late-game content |
| `enhancement` | #a2eeef | Feature additions |
| `P0-Critical` | #b60205 | Must-have, blocking |
| `P1-High` | #d93f0b | Core features for release |
| `P2-Medium` | #fbca04 | Important but deferrable |
| `P3-Low` | #0e8a16 | Nice-to-have |

## Step 3: Create Issues (30-45 minutes)

For each issue in `GITHUB_ISSUES.md`:

### Quick Method (Recommended)
1. Open `GITHUB_ISSUES.md` in your editor
2. Navigate to: https://github.com/deadronos/NanoBotsIdle/issues/new
3. For each issue:
   - Copy the title
   - Copy the entire description section
   - Add labels as specified
   - Select the milestone
   - Click "Submit new issue"

### Example: Creating Issue #1

1. Go to: https://github.com/deadronos/NanoBotsIdle/issues/new
2. **Title**: `Core Production Chain (Milestone 0.1)`
3. **Description**: Copy from GITHUB_ISSUES.md starting with "Complete the basic production chain..."
4. **Labels**: Select: `enhancement`, `core-systems`, `Phase-0`, `MVP`, `P0-Critical`
5. **Milestone**: Select "Phase 0 - Foundation"
6. **Assignees**: (Optional) Assign to yourself or team member
7. Click "**Submit new issue**"

## Step 4: Link Dependencies (10 minutes)

After creating all issues:

1. Open each issue that has dependencies
2. In the description, update dependency references from "#1" to actual issue numbers
3. GitHub will auto-link them

Example: If Issue #2 says "Dependencies: #1", and Issue #1 is created as issue number 5, update it to "Dependencies: #5"

## Step 5: Set Up Project Board (Optional, 15 minutes)

If using GitHub Projects:

1. Navigate to: https://github.com/deadronos/NanoBotsIdle/projects
2. Click "**New project**"
3. Choose "**Board**" template
4. Name it "NanoFactory Evolution Development"
5. Create columns:
   - 📋 Backlog
   - 🚀 Ready to Start
   - 🔨 In Progress
   - 👀 In Review
   - ✅ Done
6. Add all issues to the board
7. Drag MVP issues to "Ready to Start"

## Priority Order for Issue Creation

If you want to create issues incrementally, do them in this order:

### First (Must-Have for MVP):
1. Issue #1-4 (Phase 0)
2. Issue #5-7 (Phase 1)
3. Issue #8-10 (Phase 2)
4. Issue #15 (Visual Polish)

### Second (High Priority Post-MVP):
1. Issue #11-13 (Phase 3 - Fork Process)
2. Issue #14 (Advanced Pathfinding)
3. Issue #16 (Audio)

### Third (Additional Content):
1. Issue #17-18 (Buildings and Drones)
2. Issue #19-21 (Endgame)

## Batch Creation Script (Advanced)

If you're comfortable with GitHub CLI (`gh`):

```bash
# Install GitHub CLI first: https://cli.github.com/

# Example for creating Issue #1
gh issue create \
  --title "Core Production Chain (Milestone 0.1)" \
  --body-file issue-templates/issue-01.md \
  --label "enhancement,core-systems,Phase-0,MVP,P0-Critical" \
  --milestone "Phase 0 - Foundation"
```

You'd need to split `GITHUB_ISSUES.md` into separate files first.

## Verification Checklist

After creating all issues, verify:

- [ ] All 21 issues created
- [ ] All issues have correct labels
- [ ] All issues assigned to correct milestone
- [ ] Dependencies linked correctly
- [ ] MVP issues marked with `MVP` label
- [ ] Priority labels applied (`P0-Critical`, `P1-High`, etc.)

## Troubleshooting

**Q: Can I create issues via API?**  
A: Yes, but you need a GitHub Personal Access Token. The manual method above is simpler for one-time setup.

**Q: Can I bulk import issues?**  
A: GitHub doesn't have official bulk import, but you can use GitHub CLI or third-party tools.

**Q: Should I create all 21 issues at once?**  
A: It's fine to start with Phase 0-2 issues (the MVP) and add others as you progress.

**Q: What if I want to modify the milestones?**  
A: Edit `MILESTONES.md` and `GITHUB_ISSUES.md` first, then update GitHub to match.

## Time Estimates

- **Milestones**: 5 minutes
- **Labels**: 5 minutes  
- **All 21 Issues**: 30-45 minutes
- **Dependencies & Linking**: 10 minutes
- **Project Board** (optional): 15 minutes

**Total**: ~1 hour for complete setup

## Next Steps After Creation

1. **Start with Issue #1**: Core Production Chain
2. **Create a development branch**: `git checkout -b feature/core-production-chain`
3. **Reference the issue**: Include "Closes #1" in commit messages
4. **Track progress**: Update issue with checkboxes as you complete tasks
5. **Link PRs**: GitHub will auto-link PRs that reference issues

## Need Help?

If you encounter issues during setup:
1. Check GitHub documentation: https://docs.github.com/en/issues
2. The milestone planning is flexible - adjust as needed
3. You can always refine issues later based on actual development

---

**Ready to start?** Open `GITHUB_ISSUES.md` and begin with the milestones!
