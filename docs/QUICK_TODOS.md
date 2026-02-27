- Find a better name than "Sonic Claude" and completely rename the project/references/copy/everything

- ~~beats per minute adjustment has no effect~~ FIXED: `setTempo` now calls `api.playback.setTempo()` before persisting to composition metadata

- ~~Update the dropdown component in the tracker head~~ FIXED: `SequencerInstrumentSelector` now uses `SearchableDropdown` component with full search/filter

- Future feature: sequencer "inline sample editing" track. Add a track, record a clip directly to that track, save/edit/the sample inline

- Work on MIDI hardware interface/map keyboard to real time piano roll

- ~~Toasts dont work/arent visible~~ FIXED: Added Sonner `<Toaster>` to `main.tsx`; all `toast.*` calls from store/hooks now render correctly

...

- Implement "mimic" feature into analysis/ai chain, ability for ai system to listen to a composition, track, clip or audio sample, etc, and mimic it's style, essence, etc.

- The "settings modal" right hand column still not vertically scrollable when it overflows

- Since the "chat interface" is so systemic to this DAW, consider creating a "dynamic panel" of which can be "popped" to the right hand side of the screen. This way the chat interface can be used more fluidly (intuitively) across the app. This should be a "systemic refactor" of the "panels system" such that ANY panel can be configured to be "popped" to the right hand side of the screen (fixed position or whatever). When a panel is popped a "placeholder" panel is left in it's place which can be used to "pull" the popped panel back into the layout. Popped panels should be "pinned" to the right hand side of the screen. ... The systemic refactor to the layout that is required, is MUCH like the left hand side "pinned" panel navigation. ... The "pinned" panel navigation is a "list" of panels which have been "popped" to the right hand side of the screen. ... A given "popped" panel can be "minimized" to a "tab" at the top of the right hand side of the screen. ... At the very top of this (right hand side narrow column that is only visible when a panel has been popped to it) is the "settings icon" at the very top (that we currently see in the top right of the screen in the header). ... The "settings" icon is of course just a link to our settings modal still. .... Individual panels will be given an an additional top right icon in their header that represents this pop functionality, different from the maximize/minimize icon. And of course this will all work seamlessly and be integrated within our state/store system and patterns. Plan and execute perfectly.

- The ui/ux of the headers "AI Status Indicator" needs to be improved. ... It's a good start but it's not very intuitive or well designed. ... The "AI Status Indicator" should be more of a "notification center" for the entire app. ... It should list all "pending" and "in-progress" AI tasks. ... It should also list the "last 5" or so "completed" and "errored" AI tasks. ... More specifically it the dropdown/menu icon itself should be componetized into a resuable ui component pattern if it hasnt already, and i don't like "AI IDLE" or "AI ACTIVE" as the text, that's not very intuitive. ... I don't know what, but should say and be something else, should be more like an icon, maybe no text at all. And should be better spaced in correlation to the "settings" gear icon to its right and look more cohesive in line with our app wide icon patterns.