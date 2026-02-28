"""
SynthDef Registry - Complete list of available synthesizers

This registry matches the SynthDefs defined in:
- backend/supercollider/synthdefs/instruments.scd
- backend/supercollider/synthdefs/drums.scd
- backend/supercollider/synthdefs/melodic.scd
"""

# Parameter families
_MELODIC_PARAMS  = ["freq", "amp", "gate", "attack", "release"]
_GM_PARAMS       = ["freq", "amp", "gate", "velocity"]
_DRUM_PARAMS     = ["amp", "decay"]

# Complete list of available SynthDefs with metadata
SYNTHDEF_REGISTRY = [
    # Basic Waveforms (instruments.scd)
    {"name": "sine",     "display_name": "Sine Wave",     "category": "Basic", "description": "Pure sine wave oscillator",     "parameters": _MELODIC_PARAMS},
    {"name": "saw",      "display_name": "Sawtooth",      "category": "Basic", "description": "Sawtooth wave oscillator",      "parameters": _MELODIC_PARAMS},
    {"name": "square",   "display_name": "Square Wave",   "category": "Basic", "description": "Square wave oscillator",        "parameters": _MELODIC_PARAMS},
    {"name": "triangle", "display_name": "Triangle Wave", "category": "Basic", "description": "Triangle wave oscillator",      "parameters": _MELODIC_PARAMS},

    # Advanced Synths (from instruments.scd)
    {"name": "fm",    "display_name": "FM Synth",   "category": "Synth", "description": "Frequency modulation synthesizer",      "parameters": ["freq", "amp", "gate", "attack", "release", "modIndex", "modRatio"]},
    {"name": "pad",   "display_name": "Pad Synth",  "category": "Synth", "description": "Warm pad synthesizer",                  "parameters": ["freq", "amp", "gate", "attack", "release", "detune"]},
    {"name": "bass",  "display_name": "Bass Synth", "category": "Bass",  "description": "Deep bass synthesizer",                 "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff"]},
    {"name": "lead",  "display_name": "Lead Synth", "category": "Lead",  "description": "Bright lead synthesizer",               "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff"]},
    {"name": "pluck", "display_name": "Pluck Synth","category": "Synth", "description": "Plucked string synthesizer",            "parameters": ["freq", "amp", "gate", "attack", "release", "decay"]},
    {"name": "bell",  "display_name": "Bell",       "category": "Synth", "description": "Bell-like synthesizer",                 "parameters": ["freq", "amp", "gate", "attack", "release"]},
    {"name": "organ", "display_name": "Organ",      "category": "Keys",  "description": "Hammond-style organ",                   "parameters": ["freq", "amp", "gate", "attack", "release", "drawbar1", "drawbar2"]},

    # Drums (from drums.scd)
    {"name": "kick808",       "display_name": "808 Kick",          "category": "Drums", "description": "Classic 808 kick drum",    "parameters": ["amp", "decay", "freq", "pitch"]},
    {"name": "kick909",       "display_name": "909 Kick",          "category": "Drums", "description": "Classic 909 kick drum",    "parameters": ["amp", "decay", "freq", "punch"]},
    {"name": "kickAcoustic",  "display_name": "Acoustic Kick",     "category": "Drums", "description": "Acoustic kick drum",       "parameters": _DRUM_PARAMS},
    {"name": "snare808",      "display_name": "808 Snare",         "category": "Drums", "description": "Classic 808 snare",        "parameters": ["amp", "decay", "tone", "noise"]},
    {"name": "snare909",      "display_name": "909 Snare",         "category": "Drums", "description": "Classic 909 snare",        "parameters": ["amp", "decay", "tone", "noise"]},
    {"name": "snareAcoustic", "display_name": "Acoustic Snare",    "category": "Drums", "description": "Acoustic snare drum",      "parameters": _DRUM_PARAMS},
    {"name": "hihatClosed808","display_name": "808 Closed Hi-Hat", "category": "Drums", "description": "808 closed hi-hat",        "parameters": ["amp", "decay"]},
    {"name": "hihatOpen808",  "display_name": "808 Open Hi-Hat",   "category": "Drums", "description": "808 open hi-hat",          "parameters": ["amp", "decay"]},
    {"name": "hihatClosed909","display_name": "909 Closed Hi-Hat", "category": "Drums", "description": "909 closed hi-hat",        "parameters": ["amp", "decay"]},
    {"name": "hihatOpen909",  "display_name": "909 Open Hi-Hat",   "category": "Drums", "description": "909 open hi-hat",          "parameters": ["amp", "decay"]},
    {"name": "tomLow808",     "display_name": "808 Low Tom",       "category": "Drums", "description": "808 low tom",              "parameters": ["amp", "decay", "freq"]},
    {"name": "tomMid808",     "display_name": "808 Mid Tom",       "category": "Drums", "description": "808 mid tom",              "parameters": ["amp", "decay", "freq"]},
    {"name": "tomHigh808",    "display_name": "808 High Tom",      "category": "Drums", "description": "808 high tom",             "parameters": ["amp", "decay", "freq"]},
    {"name": "cymbalCrash",   "display_name": "Crash Cymbal",      "category": "Drums", "description": "Crash cymbal",             "parameters": ["amp", "decay"]},
    {"name": "cymbalRide",    "display_name": "Ride Cymbal",       "category": "Drums", "description": "Ride cymbal",              "parameters": ["amp", "decay"]},
    {"name": "cymbalSplash",  "display_name": "Splash Cymbal",     "category": "Drums", "description": "Splash cymbal",            "parameters": ["amp", "decay"]},
    {"name": "clap808",       "display_name": "808 Clap",          "category": "Drums", "description": "808 hand clap",            "parameters": ["amp", "decay", "spread"]},
    {"name": "cowbell808",    "display_name": "808 Cowbell",       "category": "Drums", "description": "808 cowbell",              "parameters": ["amp", "decay", "freq"]},
    {"name": "rimshot808",    "display_name": "808 Rimshot",       "category": "Drums", "description": "808 rimshot",              "parameters": _DRUM_PARAMS},

    # Latin Percussion
    {"name": "congaHigh",   "display_name": "High Conga",   "category": "Percussion", "description": "High conga drum",   "parameters": _DRUM_PARAMS},
    {"name": "congaLow",    "display_name": "Low Conga",    "category": "Percussion", "description": "Low conga drum",    "parameters": _DRUM_PARAMS},
    {"name": "bongoHigh",   "display_name": "High Bongo",   "category": "Percussion", "description": "High bongo drum",   "parameters": _DRUM_PARAMS},
    {"name": "bongoLow",    "display_name": "Low Bongo",    "category": "Percussion", "description": "Low bongo drum",    "parameters": _DRUM_PARAMS},
    {"name": "timbaleHigh", "display_name": "High Timbale", "category": "Percussion", "description": "High timbale",      "parameters": _DRUM_PARAMS},
    {"name": "timbaleLow",  "display_name": "Low Timbale",  "category": "Percussion", "description": "Low timbale",       "parameters": _DRUM_PARAMS},

    # World Percussion
    {"name": "tambourine",  "display_name": "Tambourine",   "category": "Percussion", "description": "Tambourine",        "parameters": _DRUM_PARAMS},
    {"name": "shaker",      "display_name": "Shaker",       "category": "Percussion", "description": "Shaker",            "parameters": _DRUM_PARAMS},
    {"name": "claves",      "display_name": "Claves",       "category": "Percussion", "description": "Claves",            "parameters": _DRUM_PARAMS},
    {"name": "woodblock",   "display_name": "Woodblock",    "category": "Percussion", "description": "Woodblock",         "parameters": _DRUM_PARAMS},
    {"name": "agogoHigh",   "display_name": "High Agogo",   "category": "Percussion", "description": "High agogo bell",   "parameters": _DRUM_PARAMS},
    {"name": "agogoLow",    "display_name": "Low Agogo",    "category": "Percussion", "description": "Low agogo bell",    "parameters": _DRUM_PARAMS},

    # Piano (GM 1-8)
    {"name": "acousticGrandPiano",  "display_name": "Acoustic Grand Piano",  "category": "Piano", "description": "Rich, full-bodied piano",         "parameters": _GM_PARAMS},
    {"name": "brightAcousticPiano", "display_name": "Bright Acoustic Piano", "category": "Piano", "description": "Brighter piano with more attack",  "parameters": _GM_PARAMS},
    {"name": "electricGrandPiano",  "display_name": "Electric Grand Piano",  "category": "Piano", "description": "Yamaha CP-70 style",              "parameters": _GM_PARAMS},
    {"name": "honkyTonkPiano",      "display_name": "Honky-tonk Piano",      "category": "Piano", "description": "Detuned saloon piano",             "parameters": _GM_PARAMS},
    {"name": "electricPiano1",      "display_name": "Electric Piano 1",      "category": "Piano", "description": "Rhodes/Wurlitzer style",           "parameters": _GM_PARAMS},
    {"name": "electricPiano2",      "display_name": "Electric Piano 2",      "category": "Piano", "description": "DX7-style FM electric piano",      "parameters": _GM_PARAMS},
    {"name": "harpsichord",         "display_name": "Harpsichord",           "category": "Piano", "description": "Baroque harpsichord",              "parameters": _GM_PARAMS},
    {"name": "clavinet",            "display_name": "Clavinet",              "category": "Piano", "description": "Funky clavinet",                   "parameters": _GM_PARAMS},

    # Chromatic Percussion (GM 9-16)
    {"name": "celesta",      "display_name": "Celesta",      "category": "Chromatic Percussion", "description": "Delicate bell-like sound",       "parameters": _GM_PARAMS},
    {"name": "glockenspiel", "display_name": "Glockenspiel", "category": "Chromatic Percussion", "description": "Bright metallic bells",          "parameters": _GM_PARAMS},
    {"name": "musicBox",     "display_name": "Music Box",    "category": "Chromatic Percussion", "description": "Toy music box",                  "parameters": _GM_PARAMS},
    {"name": "vibraphone",   "display_name": "Vibraphone",   "category": "Chromatic Percussion", "description": "Jazz vibraphone with vibrato",   "parameters": _GM_PARAMS},
    {"name": "marimba",      "display_name": "Marimba",      "category": "Chromatic Percussion", "description": "Wooden marimba",                 "parameters": _GM_PARAMS},
    {"name": "xylophone",    "display_name": "Xylophone",    "category": "Chromatic Percussion", "description": "Bright xylophone",               "parameters": _GM_PARAMS},
    {"name": "tubularBells", "display_name": "Tubular Bells","category": "Chromatic Percussion", "description": "Church tubular bells",           "parameters": _GM_PARAMS},
    {"name": "dulcimer",     "display_name": "Dulcimer",     "category": "Chromatic Percussion", "description": "Hammered dulcimer",              "parameters": _GM_PARAMS},

    # Organ (GM 17-24)
    {"name": "drawbarOrgan",    "display_name": "Drawbar Organ",    "category": "Organ", "description": "Hammond B3 style",      "parameters": _GM_PARAMS},
    {"name": "percussiveOrgan", "display_name": "Percussive Organ", "category": "Organ", "description": "Percussive organ",      "parameters": _GM_PARAMS},
    {"name": "rockOrgan",       "display_name": "Rock Organ",       "category": "Organ", "description": "Rock organ",            "parameters": _GM_PARAMS},
    {"name": "churchOrgan",     "display_name": "Church Organ",     "category": "Organ", "description": "Pipe organ",            "parameters": _GM_PARAMS},
    {"name": "reedOrgan",       "display_name": "Reed Organ",       "category": "Organ", "description": "Reed organ",            "parameters": _GM_PARAMS},
    {"name": "accordion",       "display_name": "Accordion",        "category": "Organ", "description": "Accordion",             "parameters": _GM_PARAMS},
    {"name": "harmonica",       "display_name": "Harmonica",        "category": "Organ", "description": "Harmonica",             "parameters": _GM_PARAMS},
    {"name": "bandoneon",       "display_name": "Bandoneon",        "category": "Organ", "description": "Tango bandoneon",       "parameters": _GM_PARAMS},

    # Guitar (GM 25-32)
    {"name": "acousticGuitarNylon",  "display_name": "Acoustic Guitar (Nylon)", "category": "Guitar", "description": "Classical nylon guitar",    "parameters": _GM_PARAMS},
    {"name": "acousticGuitarSteel",  "display_name": "Acoustic Guitar (Steel)", "category": "Guitar", "description": "Steel string acoustic",     "parameters": _GM_PARAMS},
    {"name": "electricGuitarJazz",   "display_name": "Electric Guitar (Jazz)",  "category": "Guitar", "description": "Jazz guitar",              "parameters": _GM_PARAMS},
    {"name": "electricGuitarClean",  "display_name": "Electric Guitar (Clean)", "category": "Guitar", "description": "Clean electric guitar",     "parameters": _GM_PARAMS},
    {"name": "electricGuitarMuted",  "display_name": "Electric Guitar (Muted)", "category": "Guitar", "description": "Muted electric guitar",     "parameters": _GM_PARAMS},
    {"name": "overdrivenGuitar",     "display_name": "Overdriven Guitar",       "category": "Guitar", "description": "Overdriven guitar",         "parameters": _GM_PARAMS},
    {"name": "distortionGuitar",     "display_name": "Distortion Guitar",       "category": "Guitar", "description": "Distorted guitar",          "parameters": _GM_PARAMS},
    {"name": "guitarHarmonics",      "display_name": "Guitar Harmonics",        "category": "Guitar", "description": "Guitar harmonics",          "parameters": _GM_PARAMS},

    # Bass (GM 33-40)
    {"name": "acousticBass",      "display_name": "Acoustic Bass",        "category": "Bass", "description": "Upright acoustic bass",     "parameters": _GM_PARAMS},
    {"name": "electricBassFinger","display_name": "Electric Bass (Finger)","category": "Bass", "description": "Fingered electric bass",    "parameters": _GM_PARAMS},
    {"name": "electricBassPick",  "display_name": "Electric Bass (Pick)", "category": "Bass", "description": "Picked electric bass",      "parameters": _GM_PARAMS},
    {"name": "fretlessBass",      "display_name": "Fretless Bass",        "category": "Bass", "description": "Fretless bass",             "parameters": _GM_PARAMS},
    {"name": "slapBass1",         "display_name": "Slap Bass 1",          "category": "Bass", "description": "Slap bass",                 "parameters": _GM_PARAMS},
    {"name": "slapBass2",         "display_name": "Slap Bass 2",          "category": "Bass", "description": "Slap bass 2",               "parameters": _GM_PARAMS},
    {"name": "synthBass1",        "display_name": "Synth Bass 1",         "category": "Bass", "description": "Synth bass",                "parameters": _MELODIC_PARAMS},
    {"name": "synthBass2",        "display_name": "Synth Bass 2",         "category": "Bass", "description": "Synth bass 2",              "parameters": _MELODIC_PARAMS},

    # Strings (GM 41-48)
    {"name": "violin",            "display_name": "Violin",            "category": "Strings", "description": "Violin",            "parameters": _GM_PARAMS},
    {"name": "viola",             "display_name": "Viola",             "category": "Strings", "description": "Viola",             "parameters": _GM_PARAMS},
    {"name": "cello",             "display_name": "Cello",             "category": "Strings", "description": "Cello",             "parameters": _GM_PARAMS},
    {"name": "contrabass",        "display_name": "Contrabass",        "category": "Strings", "description": "Double bass",       "parameters": _GM_PARAMS},
    {"name": "tremoloStrings",    "display_name": "Tremolo Strings",   "category": "Strings", "description": "Tremolo strings",   "parameters": _GM_PARAMS},
    {"name": "pizzicatoStrings",  "display_name": "Pizzicato Strings", "category": "Strings", "description": "Pizzicato strings", "parameters": _GM_PARAMS},
    {"name": "orchestralHarp",    "display_name": "Orchestral Harp",   "category": "Strings", "description": "Concert harp",      "parameters": _GM_PARAMS},
    {"name": "timpani",           "display_name": "Timpani",           "category": "Strings", "description": "Orchestral timpani","parameters": _GM_PARAMS},

    # Ensemble (GM 49-56)
    {"name": "stringEnsemble1",  "display_name": "String Ensemble 1", "category": "Ensemble", "description": "String ensemble",       "parameters": _GM_PARAMS},
    {"name": "stringEnsemble2",  "display_name": "String Ensemble 2", "category": "Ensemble", "description": "Slow string ensemble",  "parameters": _GM_PARAMS},
    {"name": "synthStrings1",    "display_name": "Synth Strings 1",   "category": "Ensemble", "description": "Synth strings",         "parameters": _MELODIC_PARAMS},
    {"name": "synthStrings2",    "display_name": "Synth Strings 2",   "category": "Ensemble", "description": "Synth strings 2",       "parameters": _MELODIC_PARAMS},
    {"name": "choirAahs",        "display_name": "Choir Aahs",        "category": "Ensemble", "description": "Choir aahs",            "parameters": _GM_PARAMS},
    {"name": "voiceOohs",        "display_name": "Voice Oohs",        "category": "Ensemble", "description": "Voice oohs",            "parameters": _GM_PARAMS},
    {"name": "synthVoice",       "display_name": "Synth Voice",       "category": "Ensemble", "description": "Synth voice",           "parameters": _MELODIC_PARAMS},
    {"name": "orchestraHit",     "display_name": "Orchestra Hit",     "category": "Ensemble", "description": "Orchestra hit",         "parameters": _GM_PARAMS},

    # Brass (GM 57-64)
    {"name": "trumpet",     "display_name": "Trumpet",      "category": "Brass", "description": "Trumpet",        "parameters": _GM_PARAMS},
    {"name": "trombone",    "display_name": "Trombone",     "category": "Brass", "description": "Trombone",       "parameters": _GM_PARAMS},
    {"name": "tuba",        "display_name": "Tuba",         "category": "Brass", "description": "Tuba",           "parameters": _GM_PARAMS},
    {"name": "mutedTrumpet","display_name": "Muted Trumpet","category": "Brass", "description": "Muted trumpet",  "parameters": _GM_PARAMS},
    {"name": "frenchHorn",  "display_name": "French Horn",  "category": "Brass", "description": "French horn",    "parameters": _GM_PARAMS},
    {"name": "brassSection","display_name": "Brass Section","category": "Brass", "description": "Brass section",  "parameters": _GM_PARAMS},
    {"name": "synthBrass1", "display_name": "Synth Brass 1","category": "Brass", "description": "Synth brass",    "parameters": _MELODIC_PARAMS},
    {"name": "synthBrass2", "display_name": "Synth Brass 2","category": "Brass", "description": "Synth brass 2",  "parameters": _MELODIC_PARAMS},
]


def get_all_synthdefs():
    """Get complete list of available SynthDefs"""
    return SYNTHDEF_REGISTRY


def get_synthdefs_by_category(category: str):
    """Get SynthDefs filtered by category"""
    return [s for s in SYNTHDEF_REGISTRY if s["category"] == category]


def get_categories():
    """Get list of all categories"""
    categories = set(s["category"] for s in SYNTHDEF_REGISTRY)
    return sorted(categories)
