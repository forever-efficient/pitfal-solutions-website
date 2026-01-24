# CLAUDE.md - {{PROJECT_NAME}}

## Project Overview

**Name:** {{PROJECT_NAME}}
**Domain:** {{DOMAIN_URL}}
**Description:** {{ONE_LINE_DESCRIPTION}}

### Goals
- {{GOAL_1}}
- {{GOAL_2}}
- {{GOAL_3}}

---

## Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Frontend** | {{FRONTEND_FRAMEWORK}} | {{FRONTEND_NOTES}} |
| **Styling** | {{CSS_FRAMEWORK}} | {{STYLING_NOTES}} |
| **Backend** | {{BACKEND_TECH}} | {{BACKEND_NOTES}} |
| **Database** | {{DATABASE}} | {{DB_NOTES}} |
| **Hosting** | {{HOSTING}} | {{HOSTING_NOTES}} |
| **IaC** | {{IAC_TOOL}} | {{IAC_NOTES}} |

---

## Project Structure

```
{{PROJECT_NAME}}/
├── CLAUDE.md
├── .mcp.json
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   └── REQUIREMENTS.md
├── .claude/
│   ├── settings.json
│   └── skills/
│       └── {{SKILL_NAME}}/SKILL.md
├── src/
│   └── ...
└── {{OTHER_DIRS}}
```

---

## MCP Server Configuration

| Server | Purpose |
|--------|---------|
| `{{MCP_SERVER_1}}` | {{MCP_PURPOSE_1}} |
| `{{MCP_SERVER_2}}` | {{MCP_PURPOSE_2}} |

Run `/mcp` to check server status.

---

## Custom Skills

| Skill | Command | Purpose |
|-------|---------|---------|
| **{{SKILL_1}}** | `/{{skill-1}}` | {{SKILL_1_PURPOSE}} |
| **{{SKILL_2}}** | `/{{skill-2}}` | {{SKILL_2_PURPOSE}} |

---

## Development Commands

```bash
# Start development
{{DEV_COMMAND}}

# Build for production
{{BUILD_COMMAND}}

# Run tests
{{TEST_COMMAND}}

# Deploy
{{DEPLOY_COMMAND}}
```

---

## Environment Variables

Create `.env.local`:

```bash
{{ENV_VAR_1}}={{ENV_VALUE_1}}
{{ENV_VAR_2}}={{ENV_VALUE_2}}
```

---

## Code Standards

- {{STANDARD_1}}
- {{STANDARD_2}}
- {{STANDARD_3}}

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| `docs/PRD.md` | Product requirements and user personas |
| `docs/ARCHITECTURE.md` | System design and data models |
| `docs/REQUIREMENTS.md` | Detailed functional requirements |
