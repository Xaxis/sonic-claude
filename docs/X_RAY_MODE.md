# X-Ray Mode Feature

## Overview

X-Ray Mode is an innovative UI feature that allows users to transparently see through the active tab to view another tab in the background. This enables simultaneous monitoring of multiple workspaces without switching tabs.

## Features

### Core Functionality
- **Transparent Overlay**: View a background tab through the active tab with adjustable opacity
- **Smart Tab Selection**: Automatically selects the most recently used tab or allows manual selection
- **Real-time Synchronization**: Both tabs remain fully interactive and synchronized
- **Smooth Animations**: Elegant fade-in/fade-out transitions for a polished UX

### UI Controls
- **Toggle Button**: Scan icon in the tab bar to enable/disable x-ray mode
- **Opacity Slider**: Adjust background tab visibility from 0-100%
- **Tab Selector**: Choose which tab to view in the background (when 3+ tabs exist)
- **Visual Indicator**: Floating badge showing x-ray mode status and target tab

### Keyboard Shortcuts
- **⌘X / Ctrl+X**: Toggle x-ray mode on/off

## Architecture

### State Management
X-ray state is managed through the `LayoutContext` with the following properties:

```typescript
interface LayoutState {
    xrayEnabled: boolean;      // Whether x-ray mode is active
    xraySourceTab: string | null;  // Current active tab
    xrayTargetTab: string | null;  // Background tab being viewed
    xrayOpacity: number;       // Opacity of background tab (0-1)
}
```

### Methods
- `enableXray(targetTabId: string)`: Enable x-ray mode for a specific tab
- `disableXray()`: Disable x-ray mode
- `setXrayOpacity(opacity: number)`: Adjust background tab opacity

### Persistence
X-ray state is automatically persisted to localStorage through the existing `LayoutContext` persistence mechanism. State is restored on page reload.

### Rendering
The x-ray mode uses a layered rendering approach:

1. **Background Layer** (z-index: 0): Target tab panels with configurable opacity
2. **Foreground Layer** (z-index: 1): Active tab panels with slight opacity reduction
3. **Indicator Layer** (z-index: 50): Visual status indicator

Both layers use `pointer-events-none` on the background to ensure only the active tab is interactive.

## Usage

### Enabling X-Ray Mode
1. Click the Scan icon in the tab bar
2. Or press ⌘X / Ctrl+X
3. The first available non-active tab will be shown in the background

### Adjusting Opacity
- Use the opacity slider that appears when x-ray mode is enabled
- Range: 0% (invisible) to 100% (fully visible)
- Default: 50%

### Changing Target Tab
- Use the dropdown selector (appears when 3+ tabs exist)
- Select any non-active, non-popped-out tab

### Disabling X-Ray Mode
1. Click the Scan icon again
2. Or press ⌘X / Ctrl+X

## Use Cases

### Music Production Workflow
- **Compose + Interact**: View the sequencer while monitoring the loop visualizer
- **Mixer + Effects**: Adjust effects while watching mixer levels
- **AI + Sequencer**: Monitor AI suggestions while composing

### General Benefits
- Reduce context switching
- Monitor multiple workspaces simultaneously
- Maintain awareness of background processes
- Improve workflow efficiency

## Technical Details

### Performance
- Uses CSS transitions for smooth animations (300ms duration)
- Absolute positioning prevents layout recalculation
- Pointer events optimization ensures only active tab is interactive

### Compatibility
- Works with all tab configurations
- Disabled when active tab is popped out
- Requires at least 2 tabs to be available
- Syncs across windows via BroadcastChannel

### Edge Cases Handled
- Cannot x-ray the active tab (validation in `enableXray`)
- Automatically disables when switching to a popped-out tab
- Gracefully handles tab deletion while x-ray is active
- Persists state across page reloads

## Future Enhancements

Potential improvements for future iterations:
- Multiple simultaneous x-ray targets
- Picture-in-picture mode for specific panels
- Customizable keyboard shortcuts
- X-ray mode presets/favorites
- Gesture-based opacity control

