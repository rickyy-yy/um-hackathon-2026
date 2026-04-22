# .claude/ — Claude Code project configuration

This directory ships Claude Code skills, slash commands, and subagents with the repo. Claude Code auto-discovers these paths for everyone who clones the project.

## Contents

### `skills/`
Auto-invoked skills. Claude triggers them based on the `description` frontmatter in each `SKILL.md`.

| Source | Skills |
| --- | --- |
| [obra/superpowers](https://github.com/obra/superpowers) | `brainstorming`, `dispatching-parallel-agents`, `executing-plans`, `finishing-a-development-branch`, `receiving-code-review`, `requesting-code-review`, `subagent-driven-development`, `systematic-debugging`, `test-driven-development`, `using-git-worktrees`, `using-superpowers`, `verification-before-completion`, `writing-plans`, `writing-skills` |
| [anthropics/claude-code · frontend-design](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design) | `frontend-design` |

### `commands/`
Slash commands from superpowers: `/brainstorm`, `/write-plan`, `/execute-plan`.

### `agents/`
Subagents from superpowers: `code-reviewer`.

## Context7 MCP

`../.mcp.json` registers the [Context7](https://context7.com) MCP server, which provides up-to-date, version-specific documentation (including Z.ai GLM) to Claude on demand.

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "env": { "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}" }
    }
  }
}
```

Set `CONTEXT7_API_KEY` in your `.env` (optional — get a free key at <https://context7.com/dashboard> for higher rate limits). Without a key Context7 still works, just rate-limited.

## Updating

These are vendored copies. To pull upstream changes:

```bash
# Superpowers
git clone --depth=1 https://github.com/obra/superpowers.git /tmp/sp
cp -r /tmp/sp/skills/. .claude/skills/
cp /tmp/sp/commands/*.md .claude/commands/
cp /tmp/sp/agents/*.md  .claude/agents/

# Frontend design
git clone --depth=1 --filter=blob:none --sparse https://github.com/anthropics/claude-code.git /tmp/cc
(cd /tmp/cc && git sparse-checkout set plugins/frontend-design)
cp -r /tmp/cc/plugins/frontend-design/skills/frontend-design .claude/skills/
```
