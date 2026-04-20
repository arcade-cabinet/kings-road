---
title: Contributing
updated: 2026-04-20
status: current
domain: ops
---

# Contributing to King's Road

Thank you for contributing! This guide covers development workflow, commit conventions, and how to respond to code reviews.

## Getting Started

1. Clone the repository and read [README.md](./README.md)
2. Install dependencies: `pnpm install`
3. Start the dev server: `pnpm dev` (http://localhost:5173)
4. Run tests: `pnpm test` (unit) or `pnpm test:browser` (WebGL smoke)
5. Read [STANDARDS.md](./STANDARDS.md) for code quality, design, and testing rules

## Task Lifecycle

### 1. Start a New Task

**Always work in an isolated git worktree:**

```bash
git worktree add .claude/worktrees/<slug> -b <branch-name> origin/main
cd .claude/worktrees/<slug>
```

Replace `<slug>` with a short task identifier (e.g., `feat-npc-dialogue`, `fix-save-bug`). Worktrees are gitignored — changes land in the branch, not the main tree.

**Stay in the worktree while you work on the task.** Use absolute paths if you need to reference files outside. Once the PR is merged, switch back to the main worktree (repo root) before running cleanup commands.

### 2. Commit Rules

Use **Conventional Commits**:

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation
- `refactor:` — code restructuring
- `test:` — test additions/fixes
- `chore:` — dependencies, build, CI
- `perf:` — performance improvement

Example:

```bash
git commit -m "feat(npc): add wandering behavior to guards"
git commit -m "fix(save): restore inventory state on load"
```

**Always commit locally before pushing.** Never use `--no-verify` to skip hooks.

### 3. Opening a PR

- **Title**: follow Conventional Commits format (< 70 characters)
- **Body**:
  - Summary (1–3 bullet points)
  - Test plan (checklist of what you verified)
  - If agent-authored: "Generated with Claude Code" footer
- **Link issue** (if applicable): `Closes #123`

Example:

```
feat(dialogue): add choice menu to NPC conversations

- Adds DialogueChoice component with visual feedback
- Persists choice history to save state
- Tested on mobile & desktop viewports

Test plan:
- [ ] Start game, approach NPC, verify choices render
- [ ] Select choice, verify state updates
- [ ] Reload save, verify choice history is intact
```

### 4. Respond to Code Reviews

**Address ALL feedback from bots and reviewers:**

- **CodeRabbit**, **Copilot**, **Gemini** — respond to every comment; don't dismiss
- **Push new commits** for fixes (never amend or force-push unless explicitly authorized)
- **Reply with evidence** if a bot is wrong: cite file:line number and quote the actual code
- **Resolve threads** via GitHub UI or `gh` CLI once addressed

Example of a justified pushback:

```
CodeRabbit suggested refactoring X. However, line 42 already implements this pattern.
See: src/ecs/world.ts:42–48
```

### 5. Merging

When CI is green and all reviews are addressed:

```bash
gh pr merge <PR-number> --squash --delete-branch
```

- **Always squash-merge** for a clean main history
- **Never use `--admin`** or `--no-verify`
- **Don't force-merge around red checks** — fix the issue or revert

### 6. Cleanup

After merge, run cleanup from the **main worktree** (repo root) — not from inside the worktree you're removing:

```bash
# 1. Switch to the main worktree first
cd /path/to/kings-road   # repo root, not the worktree

# 2. Remove the worktree and local branch
git worktree remove .claude/worktrees/<slug> --force
git branch -D <branch-name>

# 3. Sync main with the remote
git pull --ff-only origin main
```

> **Sync after a squash-merge**: `git pull --ff-only` will fail if your local `main` has diverged (this happens when the PR was squash-merged and git sees the commits as different). In that case only, use:
> `git fetch origin && git reset --hard origin/main`
> ⚠️ Run from the main worktree ONLY — this is destructive. If you have unmerged local changes, commit or stash them first.

## Code & Design Standards

See [STANDARDS.md](./STANDARDS.md) for:

- Code quality and LOC guidance (max 300 per file)
- Visual design rules (palette, typography, HUD spec)
- Testing strategy and coverage expectations
- Git conventions for commit messages and PRs

## Questions?

Open an issue or ask in the team chat. See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for system design and [DESIGN.md](./docs/DESIGN.md) for creative direction.
