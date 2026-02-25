# Inline AI Editing - Universal Pattern

## Overview

The inline AI editing system provides a **consistent, universal pattern** for AI-powered editing across all entities in the DAW (tracks, clips, effects, mixer channels, etc.).

## User Interaction

### Trigger Methods (Universal)
- **Right-click**: Opens AI prompt immediately
- **Long-press (mouse)**: Hold left-click for 500ms
- **Long-press (touch)**: Touch and hold for 500ms

### Visual Feedback
- **Highlight animation**: Entities being modified by AI show a pulsing cyan glow
- **Floating popover**: AI prompt appears at cursor/touch position
- **Auto-positioning**: Popover adjusts to stay within viewport bounds

## Implementation Pattern

### Step 1: Import Required Hooks and Components

```tsx
import { useInlineAI } from "@/hooks/useInlineAI";
import { useEntityHighlight } from "@/hooks/useEntityHighlight";
import { InlineAIPromptPopover } from "@/components/ai/InlineAIPromptPopover";
```

### Step 2: Initialize Hooks

```tsx
const { 
    handlers: aiHandlers, 
    showPrompt: showAIPrompt, 
    position: aiPosition, 
    closePrompt: closeAIPrompt 
} = useInlineAI({
    entityType: "track", // or "clip", "effect", "mixer_channel", "composition"
    entityId: track.id,
    disabled: isEditing, // Disable when entity is in edit mode
});

const { highlightClass } = useEntityHighlight(track.id);
```

### Step 3: Apply to Interactive Element

```tsx
<div
    className={cn("your-classes", highlightClass)}
    {...aiHandlers}
>
    {/* Your content */}
</div>
```

### Step 4: Render Popover

```tsx
{showAIPrompt && aiPosition && (
    <InlineAIPromptPopover
        entityType="track"
        entityId={track.id}
        position={aiPosition}
        onClose={closeAIPrompt}
    />
)}
```

## Complete Example: Track Header

```tsx
export function TrackHeader({ trackId }: { trackId: string }) {
    // 1. Initialize inline AI
    const { handlers: aiHandlers, showPrompt, position, closePrompt } = useInlineAI({
        entityType: "track",
        entityId: trackId,
    });
    const { highlightClass } = useEntityHighlight(trackId);

    return (
        <>
            {/* 2. Apply to interactive element */}
            <div
                className={cn("track-header", highlightClass)}
                {...aiHandlers}
            >
                <span>Track Name</span>
            </div>

            {/* 3. Render popover */}
            {showPrompt && position && (
                <InlineAIPromptPopover
                    entityType="track"
                    entityId={trackId}
                    position={position}
                    onClose={closePrompt}
                />
            )}
        </>
    );
}
```

## Entity Types

- `"track"` - Audio/MIDI tracks
- `"clip"` - Audio/MIDI clips
- `"effect"` - Effect instances
- `"mixer_channel"` - Mixer channel strips
- `"composition"` - Global composition settings

## Styling

The highlight animation is defined in `frontend/src/styles/globals.css`:

```css
@keyframes ai-highlight-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.4),
                0 0 20px 0 rgba(34, 211, 238, 0.2);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.1),
                0 0 30px 5px rgba(34, 211, 238, 0.3);
  }
}

.animate-ai-highlight {
  animation: ai-highlight-pulse 2s ease-in-out infinite;
}
```

## Backend Integration

The frontend calls `api.assistant.contextualChat()` which sends:
- `message`: User's natural language request
- `entity_type`: Type of entity being edited
- `entity_id`: ID of the specific entity
- `composition_id`: Current composition ID

The backend responds with:
- `response`: AI's explanation of changes
- `actions_executed`: List of actions performed
- `affected_entities`: List of entities modified (for highlighting)

## Accessibility

- **Keyboard**: Escape key closes the popover
- **Touch**: Long-press works on touch devices
- **Screen readers**: Popover has proper ARIA labels
- **Focus management**: Input auto-focuses on open

## Future Integrations

To add inline AI to a new entity type:
1. Follow the 4-step pattern above
2. Ensure entity has a unique ID
3. Add entity type to backend `ContextBuilderService`
4. Test right-click, long-press, and touch interactions

