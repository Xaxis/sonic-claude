# Augment Configuration

This directory contains configuration for Augment Agent and Chat following the official Augment specification.

## Structure

```
.augment/
├── rules/          # Always-on instructions (type: always, auto, manual)
│   ├── general.md
│   └── architecture.md
└── skills/         # Domain knowledge packages (agentskills.io spec)
    ├── backend-api/SKILL.md
    ├── frontend-components/SKILL.md
    ├── frontend-module/SKILL.md
    ├── zustand-actions/SKILL.md
    └── api-client/SKILL.md
```

## Rules (`rules/`)

Rules are markdown files with YAML frontmatter that provide general guidelines to Augment.

**Types:**
- `type: always` - Automatically included in every prompt
- `type: auto` - Agent decides when to include based on description field
- `type: manual` - Must be manually referenced with @ mention

**Example:**
```markdown
---
type: always
---

# My Rule

Content here...
```

## Skills (`skills/`)

Skills follow the [agentskills.io specification](https://agentskills.io/specification) and provide specialized domain knowledge.

**Structure:**
- Each skill is a subdirectory containing a `SKILL.md` file
- Directory name must match the `name` field in frontmatter
- Names: lowercase, hyphens only, 1-64 characters

**Example:**
```markdown
---
name: my-skill
description: What this skill does and when to use it
---

# My Skill

Detailed guidance, examples, and resources...
```

## Verification

Use `/skills` command in Augment to view all loaded skills.

## References

- [Augment Rules & Guidelines](https://docs.augmentcode.com/setup-augment/guidelines)
- [Augment Skills](https://docs.augmentcode.com/cli/skills)
- [agentskills.io Specification](https://agentskills.io/specification)

