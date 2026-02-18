# Panel Attachment System - Implementation Progress

## Overview
Implementing a user-controlled panel attachment system that allows panels to "snap" to edges of other panels (like magnetic window snapping in modern operating systems).

## Vision
- **EffectsPanel** snaps to **MixerPanel's bottom edge**
- 1:1 vertical alignment of track columns
- Synchronized horizontal scrolling
- User-controlled snap/unsnap behavior

---

## ✅ Phase 1: Layout System Enhancement (COMPLETE)

### 1. Extended Type Definitions (`frontend/src/types/grid-layout.ts`)
Added comprehensive type system for panel attachments:

```typescript
// Edge of a panel that can be snapped to
export type PanelEdge = "top" | "bottom" | "left" | "right";

// Snap target configuration
export interface PanelSnapTarget {
    panelId: string;           // ID of panel to snap to
    edges: PanelEdge[];        // Which edges can be snapped to
    snapDistance?: number;     // Pixels to trigger snap zone (default: 20)
}

// Current attachment state
export interface PanelAttachment {
    attachedTo: string;        // Panel ID this panel is attached to
    edge: PanelEdge;           // Which edge it's attached to
    offset?: { x: number; y: number }; // Optional offset from edge
}

// Snap zone detection result
export interface SnapZone {
    targetPanelId: string;     // Panel being snapped to
    edge: PanelEdge;           // Edge being snapped to
    snapPosition: { x: number; y: number }; // Calculated snap position
    distance: number;          // Distance from snap zone
}
```

### 2. Extended PanelConfig Interface (`frontend/src/components/layout/PanelGrid.tsx`)
```typescript
export interface PanelConfig {
    // ... existing props
    snapTargets?: PanelSnapTarget[];      // Which panels this panel can snap to
    attachment?: PanelAttachment | null;  // Current attachment state (persisted)
}
```

### 3. Extended LayoutContext (`frontend/src/contexts/LayoutContext.tsx`)
Added attachment state management:

```typescript
interface LayoutState {
    // ... existing state
    attachments: Record<string, PanelAttachment>; // Panel ID -> attachment state
}

interface LayoutContextValue {
    // ... existing methods
    attachPanel: (panelId: string, attachment: PanelAttachment) => void;
    detachPanel: (panelId: string) => void;
}
```

**Features:**
- Attachments persisted to localStorage
- Attachments broadcast across windows via WindowManager
- Proper state initialization (empty attachments by default)

### 4. Implemented Snap Detection Logic (`frontend/src/components/layout/PanelGrid.tsx`)
Added comprehensive drag handling:

**`detectSnapZone()`** - Detects when dragged panel enters snap zone
- Checks all configured snap targets
- Calculates distance to each edge
- Returns snap zone info if within threshold (1 grid unit)
- Supports all 4 edges: top, bottom, left, right

**`handleDragStart()`** - Tracks drag initiation
**`handleDrag()`** - Detects snap zones during drag
- Identifies which panel is being dragged
- Continuously checks for snap zones
- Updates visual feedback state

**`handleDragStop()`** - Attaches panel if in snap zone
- Creates attachment if snap zone detected
- Updates panel position to snap location
- Persists attachment to LayoutContext
- Clears drag state

---

## 🔄 Phase 2: EffectsPanel Redesign (TODO)

### Requirements:
1. **Horizontal Multi-Track Layout**
   - Change from single-track selector to horizontal strip
   - One column per track (matching MixerPanel)
   - Vertical effects chain within each column

2. **1:1 Alignment with MixerPanel**
   - Same column widths as mixer channels
   - Synchronized horizontal scrolling
   - Shared track data context

3. **Snap Configuration**
   - Add `snapTargets` to EffectsPanel config in `layout.config.ts`:
   ```typescript
   {
       id: "effects",
       snapTargets: [
           {
               panelId: "mixer",
               edges: ["bottom"],
               snapDistance: 20
           }
       ]
   }
   ```

---

## ⏳ Phase 3: Visual Polish & UX (TODO)

### Features to Add:
1. **Snap Zone Indicators**
   - Highlight target panel edge when in snap zone
   - Ghost preview of snapped position during drag
   - Smooth snap animation

2. **Attachment Indicators**
   - 🔗 icon in attached panel header
   - Visual connection line between panels
   - Border highlight on both panels

3. **Unsnap Mechanisms**
   - 🔓 button in attached panel header
   - Drag-away gesture to detach
   - Smooth detach animation

4. **Attachment Enforcement**
   - When parent panel moves → child panel moves
   - When parent panel resizes → child panel resizes (width for bottom/top, height for left/right)
   - Synchronized scrolling

---

## ⏳ Phase 4: Testing & Integration (TODO)

### Test Cases:
- [ ] Snap detection (drag near edge triggers snap zone)
- [ ] Attachment (drop in snap zone attaches panel)
- [ ] Attachment enforcement (parent moves → child moves)
- [ ] Unsnap via drag-away
- [ ] Unsnap via button
- [ ] Persistence (attachments saved/restored from localStorage)
- [ ] Multiple attachments (mixer could have effects below AND sends above)
- [ ] Edge cases (detach while dragging, resize while attached, etc.)

---

## Architecture Decisions

### Snap Distance
- Using **1 grid unit** for snap detection (not pixels)
- Provides consistent snap behavior across different screen sizes
- Can be made configurable per snap target

### Attachment Storage
- Stored in LayoutContext state
- Persisted to localStorage
- Broadcast across windows
- Separate from layout positions (allows independent movement when detached)

### Drag Detection
- Using react-grid-layout's `onDrag` callback
- Detecting dragged panel by comparing layout changes
- Tracking drag state in component state

---

## Next Immediate Steps

1. **Test Current Implementation**
   - Verify snap detection works
   - Test attachment creation
   - Check localStorage persistence

2. **Add Visual Feedback**
   - Snap zone highlights
   - Attachment indicators

3. **Implement Attachment Enforcement**
   - Parent move → child move
   - Parent resize → child resize

4. **Redesign EffectsPanel**
   - Horizontal multi-track layout
   - 1:1 alignment with MixerPanel

