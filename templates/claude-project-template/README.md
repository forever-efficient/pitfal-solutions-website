# Claude Project Template

A standardized project structure for Claude Code-powered development.

**Key Principle:** The STRUCTURE is constant. The CONTENT is researched per project.

## The Two Constants

### 1. Directory Structure (Always Create)
```
your-project/
├── CLAUDE.md                    # Project context for Claude
├── .mcp.json                    # MCP server configuration
├── .claude/
│   ├── settings.json            # Hooks and permissions
│   └── skills/                  # Custom slash commands
└── docs/
    ├── PRD.md                   # Product Requirements Document
    ├── ARCHITECTURE.md          # System Architecture
    └── REQUIREMENTS.md          # Functional Requirements
```

### 2. Planning Process (Always Follow)
1. Create skeleton structure
2. Research MCP servers for this project
3. Research skills needed for this project
4. Research architecture patterns
5. Fill planning documents with findings
6. Configure tooling based on research

## What Gets Researched Per Project

| Component | Research Questions |
|-----------|-------------------|
| **MCP Servers** | What services does this project integrate with? What tools exist? |
| **Skills** | What workflows will be repeated? What commands are complex? |
| **Architecture** | What patterns fit this problem? What scale is needed? |
| **Tech Stack** | What matches requirements and team skills? |

## MCP Server Research

**Where to find MCP servers:**
- https://github.com/modelcontextprotocol/servers (official)
- https://mcp.so/ (community registry)
- Web search: "MCP server for [service]"

**Common servers by domain:**
| Domain | Servers |
|--------|---------|
| Cloud/Infra | `terraform`, `aws-docs`, `aws-pricing`, `cloudflare` |
| Payments | `stripe` |
| Databases | `sqlite`, `postgres`, `supabase`, `mongodb` |
| Source Control | `github`, `gitlab` |
| Communication | `slack`, `discord`, `email` |
| Productivity | `notion`, `linear`, `jira`, `asana` |
| AI/ML | `openai`, `anthropic`, `replicate` |
| Files | `filesystem` (always include) |

**Evaluation criteria:**
- Does it solve a real need?
- Will it be used frequently?
- What's the context window cost? (check with `/context`)

## Skill Research

**Universal skills (most projects):**
- `build` - Compile/bundle
- `test` - Run tests
- `deploy` - Push to production

**Research project-specific skills by asking:**
- What multi-step process will I repeat weekly?
- What commands do I always forget the flags for?
- What workflow is error-prone and needs guardrails?

## Quick Start

1. Run `/new-project` to create structure and begin research
2. Or manually: copy template, then research and fill placeholders
3. Run `/mcp` to verify server connections after setup

## Skill Creation Guidelines

Skills should be:
- **Concise** - Claude is smart; don't over-explain
- **Actionable** - Clear steps, not theory
- **Scoped** - One workflow per skill

See `.claude/skills/deploy/SKILL.md` for example structure.
