- Completely rename our app, its code base, all references from "Sonic Claude" to "Soniq" or "Soniq Bot" or "Soniq Studio (unsure whats best, but we registered the domain soniq.bot)

- ~~beats per minute adjustment has no effect~~ FIXED: `setTempo` now calls `api.playback.setTempo()` before persisting to composition metadata

- Work on MIDI hardware interface/map keyboard to real time piano roll

...

- Implement "mimic" feature into analysis/ai chain, ability for ai system to listen to a composition, track, clip or audio sample, etc, and mimic it's style, essence, etc.

- The "settings modal" right hand column still not vertically scrollable when it overflows

...

- Since the "chat interface" is so systemic to this DAW, consider creating a "dynamic panel" of which can be "popped" to the right hand side of the screen. This way the chat interface can be used more fluidly (intuitively) across the app. This should be a "systemic refactor" of the "panels system" such that ANY panel can be configured to be "popped" to the right hand side of the screen (fixed position or whatever). When a panel is popped a "placeholder" panel is left in it's place which can be used to "pull" the popped panel back into the layout. Popped panels should be "pinned" to the right hand side of the screen. ... The systemic refactor to the layout that is required, is MUCH like the left hand side "pinned" panel navigation. ... The "pinned" panel navigation is a "list" of panels which have been "popped" to the right hand side of the screen. ... A given "popped" panel can be "minimized" to a "tab" at the top of the right hand side of the screen. ... At the very top of this (right hand side narrow column that is only visible when a panel has been popped to it) is the "settings icon" at the very top (that we currently see in the top right of the screen in the header). ... The "settings" icon is of course just a link to our settings modal still. .... Individual panels will be given an an additional top right icon in their header that represents this pop functionality, different from the maximize/minimize icon. And of course this will all work seamlessly and be integrated within our state/store system and patterns. Plan and execute perfectly.

...

- The ui/ux of the headers "AI Status Indicator" needs to be improved. ... It's a good start but it's not very intuitive or well designed. ... The "AI Status Indicator" should be more of a "notification center" for the entire app. ... It should list all "pending" and "in-progress" AI tasks. ... It should also list the "last 5" or so "completed" and "errored" AI tasks. ... More specifically it the dropdown/menu icon itself should be componetized into a resuable ui component pattern if it hasnt already, and i don't like "AI IDLE" or "AI ACTIVE" as the text, that's not very intuitive. ... I don't know what, but should say and be something else, should be more like an icon, maybe no text at all. And should be better spaced in correlation to the "settings" gear icon to its right and look more cohesive in line with our app wide icon patterns.

...

- I noticed that saving a composition in some instances is being done highly inefficiently. Example, say we open a effect on a track, like 3-band Eq 1 (purely as an example this applies to probably evevrything in the app) and then we move the slider, it is literally sending a request to the backend on EVERY SINGLE POINT OF THE SLIDER! ... Now, we obviously want the updates to send in real time, but its highly inefficient that a history entry and saved composition is happening at every single point along the slider, isnt it?! For UI/UX interactions like this, we obviously need to refactor the system such that it saves history/redo/undo state etc. at meaningful intervals, and probably refactor the way in which our history storage system works as well, to accomodate something that is reasonably efficient and makes sense. Do you understand?

...

- THe ability to resize panels no longer works

...

- Next up I want you to turn your attention to the sequencer...

  For audio samples (sample editor) you implemented a really elegant solution for things like playback of pitch,rate, gain and envelope settings, etc...

  I'm wondering if some or most or all of those features and simlar pattern should also be available for midi tracks? Do research on common DAW practices...

  If so, how can we implement a consistent beautiful/effective ui/ux in the piano roll, considering we have our keyboard structure on the left side. My initial thought
  is, we implement our tab component structure pattern in some way such that while user is in piano roll they can switch between the keyboard and the edditor in that left
  column, but I will leave it up to you to research and make a recommendation

...

- User should be able to adaptively set specific LLM model versions (in settings)