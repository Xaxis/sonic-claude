# 🎯 Project Rename: Sonic Claude → Soniq

**New Brand Identity**: **Soniq** (soniq.bot)  
**Rationale**: Sonic (sound) + IQ (intelligence) = AI-powered DAW

---

## 📋 Complete Rename Checklist

### ✅ **1. Backend Core** (`backend/`)

#### `backend/core/config.py`
- [ ] **Line 32**: Comment `"Anthropic API key for Claude"` → `"Anthropic API key for AI assistant"`
- [ ] **Line 33**: Comment about model → Remove "claude-3-5-sonnet" reference in description
- [ ] **Line 142**: `app_name: str = Field(default="Sonic Claude Backend")` → `"Soniq Backend"`

#### `backend/core/exceptions.py`
- [ ] **Line 2**: Docstring `"Custom Exception Hierarchy for Sonic Claude Backend"` → `"Soniq Backend"`
- [ ] **Line 9**: Class name `SonicClaudeException` → `SoniqException`
- [ ] **Line 10**: Docstring `"Base exception for all Sonic Claude errors"` → `"Soniq errors"`
- [ ] **Lines 22, 99, 148**: Update all child classes: `ResourceNotFoundError(SoniqException)`, `ValidationError(SoniqException)`, `ServiceError(SoniqException)`

#### `backend/main.py`
- [ ] **Line 2**: Docstring `"Sonic Claude Backend - FastAPI Application"` → `"Soniq Backend - FastAPI Application"`
- [ ] **Line 24**: Import `SonicClaudeException` → `SoniqException`
- [ ] **Line 52**: Log `"🚀 Starting Sonic Claude Backend..."` → `"🚀 Starting Soniq Backend..."`
- [ ] **Line 97**: Log `"✅ Sonic Claude Backend READY"` → `"✅ Soniq Backend READY"`
- [ ] **Line 112**: Log `"✅ Sonic Claude Backend shut down"` → `"✅ Soniq shut down"`
- [ ] **Line 185**: Exception handler name `sonic_claude_exception_handler` → `soniq_exception_handler`
- [ ] **Line 186**: Parameter type `SonicClaudeException` → `SoniqException`
- [ ] **Line 188**: Log message `"Unhandled Sonic Claude exception"` → `"Unhandled Soniq exception"`

#### `backend/__init__.py`
- [ ] **Line 2**: `"Sonic Claude Backend"` → `"Soniq Backend"`
- [ ] **Line 3**: Description → `"AI-powered DAW with real-time audio synthesis"`

---

### ✅ **2. Frontend Core** (`frontend/`)

#### `frontend/package.json`
- [ ] **Line 2**: `"name": "sonic-claude-frontend"` → `"soniq-frontend"`

#### `frontend/index.html`
- [ ] **Line 7**: `<title>SONIC CLAUDE - AI Performance System</title>` → `<title>SONIQ - AI Performance System</title>`

#### `frontend/src/stores/dawStore.ts`
- [ ] **Line 3014**: `name: 'sonic-claude-daw'` → `name: 'soniq-daw'`

#### `frontend/src/stores/settingsStore.ts`
- [ ] **Line 12**: Comment `'sonic-claude-settings'` → `'soniq-settings'`
- [ ] **Line 60**: Comment `"Claude model used for executing AI requests"` → `"AI model used for executing AI requests"`
- [ ] **Line 230**: `name: "sonic-claude-settings"` → `name: "soniq-settings"`

#### `frontend/src/stores/layoutStore.ts`
- [ ] **Line 22**: `const LAYOUT_STORAGE_KEY = 'sonic-claude-layout'` → `'soniq-layout'`

#### `frontend/src/components/layout/NavSidebar.tsx`
- [ ] **Line 10**: Comment `"SONIC CLAUDE"` → `"SONIQ"`
- [ ] **Line 258**: Display text `SONIC CLAUDE` → `SONIQ`

---

### ✅ **3. SuperCollider** (`backend/supercollider/`)

#### `backend/supercollider/osc_relay.scd`
- [ ] **Line 2**: Comment `"OSC Relay for Sonic Claude"` → `"OSC Relay for Soniq"`
- [ ] **Line 21**: `Server.remote(\sonicClaude, NetAddr(...))` → `Server.remote(\soniq, NetAddr(...))`

---

### ✅ **4. Environment & Config Files**

#### `backend/.env.example`
- [ ] **Line 1**: `"# Sonic Claude Backend Configuration"` → `"# Soniq Backend Configuration"`
- [ ] **Line 47**: Comment `"# Anthropic API key for Claude (REQUIRED...)"` → `"# Anthropic API key (REQUIRED for AI features)"`
- [ ] **Line 61**: `APP_NAME=Sonic Claude Backend` → `APP_NAME=Soniq Backend`

#### `frontend/.env.example`
- [ ] **Line 1**: `"# Sonic Claude Frontend Environment Variables"` → `"# Soniq Frontend Environment Variables"`

---

### ✅ **5. Scripts & Startup**

#### `start.sh`
- [ ] **Line 3**: `"# Sonic Claude - Startup Script"` → `"# Soniq - Startup Script"`
- [ ] **Line 8**: `echo "🎵 Sonic Claude - Starting..."` → `echo "🎵 Soniq - Starting..."`

---

### ✅ **6. Tests** (`tests/`)

#### `tests/conftest.py`
- [ ] **Line 2**: `"Pytest configuration and fixtures for Sonic Claude tests"` → `"Soniq tests"`

#### `tests/__init__.py`
- [ ] **Line 2**: `"Tests for Sonic Claude Backend"` → `"Tests for Soniq Backend"`

---

### ✅ **7. Documentation** (`docs/`, `.augment/`)

#### `docs/QUICK_TODOS.md`
- [ ] **Line 1**: ~~Delete line about finding better name~~ (task complete!)

#### `.augment/rules/general.md`
- [ ] **Line 5**: `"# Sonic Claude Development Rules"` → `"# Soniq Development Rules"`

#### `.augment/skills/backend-api/SKILL.md`
- [ ] Search and replace any "Sonic Claude" references → "Soniq"

#### `.augment/skills/frontend-components/SKILL.md`
- [ ] Search and replace any "Sonic Claude" references → "Soniq"

#### `.augment/skills/frontend-module/SKILL.md`
- [ ] Search and replace any "Sonic Claude" references → "Soniq"

---

### ✅ **8. Project Root Files**

#### `sonic-claude.iml`
- [ ] **Rename file** to `soniq.iml`

#### `README.md`
- [ ] Add project description with "Soniq" branding
- [ ] Include tagline: "Soniq - Where Sound Meets Intelligence"
- [ ] Mention domain: soniq.bot

---

## ⚠️ **BREAKING CHANGES**

### LocalStorage Keys (Will Reset User Settings)
Changing these keys will clear user preferences on first load:
- `sonic-claude-daw` → `soniq-daw` (DAW state)
- `sonic-claude-settings` → `soniq-settings` (User preferences)
- `sonic-claude-layout` → `soniq-layout` (Panel layouts)

**Decision**: Clean break (acceptable for early development)

---

## 📊 **Summary**

| Category | Files | Changes |
|----------|-------|---------|
| Backend Core | 4 | ~15 |
| Frontend Core | 6 | ~10 |
| SuperCollider | 1 | 2 |
| Environment | 2 | 4 |
| Scripts | 1 | 2 |
| Tests | 2 | 2 |
| Documentation | 4+ | ~5 |
| Root | 2 | 2 |
| **TOTAL** | **~22** | **~42** |

---

## 🚀 **Execution Order**

1. Backend exceptions (`SoniqException` base class first - breaks imports)
2. Backend config & main (app name, logs)
3. Frontend stores (localStorage keys)
4. Frontend UI components (branding)
5. SuperCollider files (server name)
6. Environment files (.env.example)
7. Scripts & tests
8. Documentation & .augment rules
9. Root files (rename .iml, update README)

---

## ✅ **Post-Rename Verification**

```bash
# Search for any remaining "sonic claude" references (case-insensitive)
grep -ri "sonic.claude\|sonic-claude\|sonic_claude" . \
  --exclude-dir=node_modules \
  --exclude-dir=.venv \
  --exclude-dir=.git \
  --exclude-dir=dist \
  --exclude-dir=build

# Should return: docs/RENAME_TO_SONIQ.md (this file only)
```

---

**Brand Identity**: Soniq (soniq.bot) - AI-powered DAW combining SuperCollider synthesis with Claude AI

