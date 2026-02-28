- Completely rename our app, its code base, all references from "Sonic Claude" to "Soniq" or "Soniq Bot" or "Soniq Studio (unsure whats best, but we registered the domain soniq.bot)

- ~~beats per minute adjustment has no effect~~ FIXED: `setTempo` now calls `api.playback.setTempo()` before persisting to composition metadata

- Work on MIDI hardware interface/map keyboard to real time piano roll

...

- Implement "mimic" feature into analysis/ai chain, ability for ai system to listen to a composition, track, clip or audio sample, etc, and mimic it's style, essence, etc.

- The "settings modal" right hand column still not vertically scrollable when it overflows

...

- Since the "chat interface" is so systemic to this DAW, consider creating a "dynamic panel" of which can be "popped" to the right hand side of the screen. This way the chat interface can be used more fluidly (intuitively) across the app. This should be a "systemic refactor" of the "panels system" such that ANY panel can be configured to be "popped" to the right hand side of the screen (fixed position or whatever). When a panel is popped a "placeholder" panel is left in it's place which can be used to "pull" the popped panel back into the layout. Popped panels should be "pinned" to the right hand side of the screen. ... The systemic refactor to the layout that is required, is MUCH like the left hand side "pinned" panel navigation. ... The "pinned" panel navigation is a "list" of panels which have been "popped" to the right hand side of the screen. ... A given "popped" panel can be "minimized" to a "tab" at the top of the right hand side of the screen. ... At the very top of this (right hand side narrow column that is only visible when a panel has been popped to it) is the "settings icon" at the very top (that we currently see in the top right of the screen in the header). ... The "settings" icon is of course just a link to our settings modal still. .... Individual panels will be given an an additional top right icon in their header that represents this pop functionality, different from the maximize/minimize icon. And of course this will all work seamlessly and be integrated within our state/store system and patterns. Plan and execute perfectly.

...

- I noticed that saving a composition in some instances is being done highly inefficiently. Example, say we open a effect on a track, like 3-band Eq 1 (purely as an example this applies to probably evevrything in the app) and then we move the slider, it is literally sending a request to the backend on EVERY SINGLE POINT OF THE SLIDER! ... Now, we obviously want the updates to send in real time, but its highly inefficient that a history entry and saved composition is happening at every single point along the slider, isnt it?! For UI/UX interactions like this, we obviously need to refactor the system such that it saves history/redo/undo state etc. at meaningful intervals, and probably refactor the way in which our history storage system works as well, to accomodate something that is reasonably efficient and makes sense. Do you understand?

...

- THe ability to resize panels no longer works

...

- User should be able to adaptively set specific LLM model versions (in settings)

...

- Critically research, I have Ableton Live installed on this computer (macbook)... It has a range of "collections" (sounds, drums, audio...). They appear to be .adg and .adv files... Would it make sense and would it be practical to implement those files/sounds as part of our own refactored "instruments" system which would then become a similar "collections" system and work with supercollider and everything else, in addition to our custom instruments. Does that make sense. What do you think?

...

DAWs are highly detail oriented apps in terms of UI/UX, which usually means smaller fonts, icons, ui/ux.. Research critically and add a setting in which user can dynamically scale the size of the UI/UX, including font sizes, etc (downwards) specifically. We really want to rebuild our interface structures so they are visually more compact but why were at it we might as well enable dynamic adjustment so the user can (and us) can determine what works.

...

Maybe "mimic" feature should be implemented by attaching a file or clip to the chat interface? DO research, both in terms of how this should work, etc... Is it even possible to feed in sound and have our LLM system to appropriately mimic whatever the clip may be to a reasonable degree of accuracy and fidelity?

...

Rebuild our meager "instruments" dropdown into a complete "collections" library system, because we need to actually build out every possible sound (Sounds, Drums, Instruments, etc.) that a user would ever need. I am thinking possibly this needs to be its own panel for starters, what do you think? Which features to you envision?