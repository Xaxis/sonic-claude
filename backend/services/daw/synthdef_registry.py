"""
SynthDef Registry - Complete list of available synthesizers

This registry matches the SynthDefs defined in:
- backend/supercollider/synthdefs/instruments.scd
- backend/supercollider/synthdefs/drums.scd  
- backend/supercollider/synthdefs/melodic.scd
"""

# Complete list of available SynthDefs with metadata
SYNTHDEF_REGISTRY = [
    # Basic Waveforms
    {"name": "sine", "display_name": "Sine Wave", "category": "Basic", "description": "Pure sine wave oscillator"},
    {"name": "saw", "display_name": "Sawtooth", "category": "Basic", "description": "Sawtooth wave oscillator"},
    {"name": "square", "display_name": "Square Wave", "category": "Basic", "description": "Square wave oscillator"},
    {"name": "triangle", "display_name": "Triangle Wave", "category": "Basic", "description": "Triangle wave oscillator"},
    
    # Advanced Synths (from instruments.scd)
    {"name": "fm", "display_name": "FM Synth", "category": "Synth", "description": "Frequency modulation synthesizer"},
    {"name": "pad", "display_name": "Pad Synth", "category": "Synth", "description": "Warm pad synthesizer"},
    {"name": "bass", "display_name": "Bass Synth", "category": "Bass", "description": "Deep bass synthesizer"},
    {"name": "lead", "display_name": "Lead Synth", "category": "Lead", "description": "Bright lead synthesizer"},
    {"name": "pluck", "display_name": "Pluck Synth", "category": "Synth", "description": "Plucked string synthesizer"},
    {"name": "bell", "display_name": "Bell", "category": "Synth", "description": "Bell-like synthesizer"},
    {"name": "organ", "display_name": "Organ", "category": "Keys", "description": "Hammond-style organ"},
    
    # Drums (from drums.scd)
    {"name": "kick808", "display_name": "808 Kick", "category": "Drums", "description": "Classic 808 kick drum"},
    {"name": "kick909", "display_name": "909 Kick", "category": "Drums", "description": "Classic 909 kick drum"},
    {"name": "kickAcoustic", "display_name": "Acoustic Kick", "category": "Drums", "description": "Acoustic kick drum"},
    {"name": "snare808", "display_name": "808 Snare", "category": "Drums", "description": "Classic 808 snare"},
    {"name": "snare909", "display_name": "909 Snare", "category": "Drums", "description": "Classic 909 snare"},
    {"name": "snareAcoustic", "display_name": "Acoustic Snare", "category": "Drums", "description": "Acoustic snare drum"},
    {"name": "hihatClosed808", "display_name": "808 Closed Hi-Hat", "category": "Drums", "description": "808 closed hi-hat"},
    {"name": "hihatOpen808", "display_name": "808 Open Hi-Hat", "category": "Drums", "description": "808 open hi-hat"},
    {"name": "hihatClosed909", "display_name": "909 Closed Hi-Hat", "category": "Drums", "description": "909 closed hi-hat"},
    {"name": "hihatOpen909", "display_name": "909 Open Hi-Hat", "category": "Drums", "description": "909 open hi-hat"},
    {"name": "tomLow808", "display_name": "808 Low Tom", "category": "Drums", "description": "808 low tom"},
    {"name": "tomMid808", "display_name": "808 Mid Tom", "category": "Drums", "description": "808 mid tom"},
    {"name": "tomHigh808", "display_name": "808 High Tom", "category": "Drums", "description": "808 high tom"},
    {"name": "cymbalCrash", "display_name": "Crash Cymbal", "category": "Drums", "description": "Crash cymbal"},
    {"name": "cymbalRide", "display_name": "Ride Cymbal", "category": "Drums", "description": "Ride cymbal"},
    {"name": "cymbalSplash", "display_name": "Splash Cymbal", "category": "Drums", "description": "Splash cymbal"},
    {"name": "clap808", "display_name": "808 Clap", "category": "Drums", "description": "808 hand clap"},
    {"name": "cowbell808", "display_name": "808 Cowbell", "category": "Drums", "description": "808 cowbell"},
    {"name": "rimshot808", "display_name": "808 Rimshot", "category": "Drums", "description": "808 rimshot"},
    
    # Latin Percussion
    {"name": "congaHigh", "display_name": "High Conga", "category": "Percussion", "description": "High conga drum"},
    {"name": "congaLow", "display_name": "Low Conga", "category": "Percussion", "description": "Low conga drum"},
    {"name": "bongoHigh", "display_name": "High Bongo", "category": "Percussion", "description": "High bongo drum"},
    {"name": "bongoLow", "display_name": "Low Bongo", "category": "Percussion", "description": "Low bongo drum"},
    {"name": "timbaleHigh", "display_name": "High Timbale", "category": "Percussion", "description": "High timbale"},
    {"name": "timbaleLow", "display_name": "Low Timbale", "category": "Percussion", "description": "Low timbale"},
    
    # World Percussion
    {"name": "tambourine", "display_name": "Tambourine", "category": "Percussion", "description": "Tambourine"},
    {"name": "shaker", "display_name": "Shaker", "category": "Percussion", "description": "Shaker"},
    {"name": "claves", "display_name": "Claves", "category": "Percussion", "description": "Claves"},
    {"name": "woodblock", "display_name": "Woodblock", "category": "Percussion", "description": "Woodblock"},
    {"name": "agogoHigh", "display_name": "High Agogo", "category": "Percussion", "description": "High agogo bell"},
    {"name": "agogoLow", "display_name": "Low Agogo", "category": "Percussion", "description": "Low agogo bell"},

    # Piano (GM 1-8)
    {"name": "acousticGrandPiano", "display_name": "Acoustic Grand Piano", "category": "Piano", "description": "Rich, full-bodied piano"},
    {"name": "brightAcousticPiano", "display_name": "Bright Acoustic Piano", "category": "Piano", "description": "Brighter piano with more attack"},
    {"name": "electricGrandPiano", "display_name": "Electric Grand Piano", "category": "Piano", "description": "Yamaha CP-70 style"},
    {"name": "honkyTonkPiano", "display_name": "Honky-tonk Piano", "category": "Piano", "description": "Detuned saloon piano"},
    {"name": "electricPiano1", "display_name": "Electric Piano 1", "category": "Piano", "description": "Rhodes/Wurlitzer style"},
    {"name": "electricPiano2", "display_name": "Electric Piano 2", "category": "Piano", "description": "DX7-style FM electric piano"},
    {"name": "harpsichord", "display_name": "Harpsichord", "category": "Piano", "description": "Baroque harpsichord"},
    {"name": "clavinet", "display_name": "Clavinet", "category": "Piano", "description": "Funky clavinet"},

    # Chromatic Percussion (GM 9-16)
    {"name": "celesta", "display_name": "Celesta", "category": "Chromatic Percussion", "description": "Delicate bell-like sound"},
    {"name": "glockenspiel", "display_name": "Glockenspiel", "category": "Chromatic Percussion", "description": "Bright metallic bells"},
    {"name": "musicBox", "display_name": "Music Box", "category": "Chromatic Percussion", "description": "Toy music box"},
    {"name": "vibraphone", "display_name": "Vibraphone", "category": "Chromatic Percussion", "description": "Jazz vibraphone with vibrato"},
    {"name": "marimba", "display_name": "Marimba", "category": "Chromatic Percussion", "description": "Wooden marimba"},
    {"name": "xylophone", "display_name": "Xylophone", "category": "Chromatic Percussion", "description": "Bright xylophone"},
    {"name": "tubularBells", "display_name": "Tubular Bells", "category": "Chromatic Percussion", "description": "Church tubular bells"},
    {"name": "dulcimer", "display_name": "Dulcimer", "category": "Chromatic Percussion", "description": "Hammered dulcimer"},

    # Organ (GM 17-24)
    {"name": "drawbarOrgan", "display_name": "Drawbar Organ", "category": "Organ", "description": "Hammond B3 style"},
    {"name": "percussiveOrgan", "display_name": "Percussive Organ", "category": "Organ", "description": "Percussive organ"},
    {"name": "rockOrgan", "display_name": "Rock Organ", "category": "Organ", "description": "Rock organ"},
    {"name": "churchOrgan", "display_name": "Church Organ", "category": "Organ", "description": "Pipe organ"},
    {"name": "reedOrgan", "display_name": "Reed Organ", "category": "Organ", "description": "Reed organ"},
    {"name": "accordion", "display_name": "Accordion", "category": "Organ", "description": "Accordion"},
    {"name": "harmonica", "display_name": "Harmonica", "category": "Organ", "description": "Harmonica"},
    {"name": "bandoneon", "display_name": "Bandoneon", "category": "Organ", "description": "Tango bandoneon"},

    # Guitar (GM 25-32)
    {"name": "acousticGuitarNylon", "display_name": "Acoustic Guitar (Nylon)", "category": "Guitar", "description": "Classical nylon guitar"},
    {"name": "acousticGuitarSteel", "display_name": "Acoustic Guitar (Steel)", "category": "Guitar", "description": "Steel string acoustic"},
    {"name": "electricGuitarJazz", "display_name": "Electric Guitar (Jazz)", "category": "Guitar", "description": "Jazz guitar"},
    {"name": "electricGuitarClean", "display_name": "Electric Guitar (Clean)", "category": "Guitar", "description": "Clean electric guitar"},
    {"name": "electricGuitarMuted", "display_name": "Electric Guitar (Muted)", "category": "Guitar", "description": "Muted electric guitar"},
    {"name": "overdrivenGuitar", "display_name": "Overdriven Guitar", "category": "Guitar", "description": "Overdriven guitar"},
    {"name": "distortionGuitar", "display_name": "Distortion Guitar", "category": "Guitar", "description": "Distorted guitar"},
    {"name": "guitarHarmonics", "display_name": "Guitar Harmonics", "category": "Guitar", "description": "Guitar harmonics"},

    # Bass (GM 33-40)
    {"name": "acousticBass", "display_name": "Acoustic Bass", "category": "Bass", "description": "Upright acoustic bass"},
    {"name": "electricBassFinger", "display_name": "Electric Bass (Finger)", "category": "Bass", "description": "Fingered electric bass"},
    {"name": "electricBassPick", "display_name": "Electric Bass (Pick)", "category": "Bass", "description": "Picked electric bass"},
    {"name": "fretlessBass", "display_name": "Fretless Bass", "category": "Bass", "description": "Fretless bass"},
    {"name": "slapBass1", "display_name": "Slap Bass 1", "category": "Bass", "description": "Slap bass"},
    {"name": "slapBass2", "display_name": "Slap Bass 2", "category": "Bass", "description": "Slap bass 2"},
    {"name": "synthBass1", "display_name": "Synth Bass 1", "category": "Bass", "description": "Synth bass"},
    {"name": "synthBass2", "display_name": "Synth Bass 2", "category": "Bass", "description": "Synth bass 2"},

    # Strings (GM 41-48)
    {"name": "violin", "display_name": "Violin", "category": "Strings", "description": "Violin"},
    {"name": "viola", "display_name": "Viola", "category": "Strings", "description": "Viola"},
    {"name": "cello", "display_name": "Cello", "category": "Strings", "description": "Cello"},
    {"name": "contrabass", "display_name": "Contrabass", "category": "Strings", "description": "Double bass"},
    {"name": "tremoloStrings", "display_name": "Tremolo Strings", "category": "Strings", "description": "Tremolo strings"},
    {"name": "pizzicatoStrings", "display_name": "Pizzicato Strings", "category": "Strings", "description": "Pizzicato strings"},
    {"name": "orchestralHarp", "display_name": "Orchestral Harp", "category": "Strings", "description": "Concert harp"},
    {"name": "timpani", "display_name": "Timpani", "category": "Strings", "description": "Orchestral timpani"},

    # Ensemble (GM 49-56)
    {"name": "stringEnsemble1", "display_name": "String Ensemble 1", "category": "Ensemble", "description": "String ensemble"},
    {"name": "stringEnsemble2", "display_name": "String Ensemble 2", "category": "Ensemble", "description": "Slow string ensemble"},
    {"name": "synthStrings1", "display_name": "Synth Strings 1", "category": "Ensemble", "description": "Synth strings"},
    {"name": "synthStrings2", "display_name": "Synth Strings 2", "category": "Ensemble", "description": "Synth strings 2"},
    {"name": "choirAahs", "display_name": "Choir Aahs", "category": "Ensemble", "description": "Choir aahs"},
    {"name": "voiceOohs", "display_name": "Voice Oohs", "category": "Ensemble", "description": "Voice oohs"},
    {"name": "synthVoice", "display_name": "Synth Voice", "category": "Ensemble", "description": "Synth voice"},
    {"name": "orchestraHit", "display_name": "Orchestra Hit", "category": "Ensemble", "description": "Orchestra hit"},

    # Brass (GM 57-64)
    {"name": "trumpet", "display_name": "Trumpet", "category": "Brass", "description": "Trumpet"},
    {"name": "trombone", "display_name": "Trombone", "category": "Brass", "description": "Trombone"},
    {"name": "tuba", "display_name": "Tuba", "category": "Brass", "description": "Tuba"},
    {"name": "mutedTrumpet", "display_name": "Muted Trumpet", "category": "Brass", "description": "Muted trumpet"},
    {"name": "frenchHorn", "display_name": "French Horn", "category": "Brass", "description": "French horn"},
    {"name": "brassSection", "display_name": "Brass Section", "category": "Brass", "description": "Brass section"},
    {"name": "synthBrass1", "display_name": "Synth Brass 1", "category": "Brass", "description": "Synth brass"},
    {"name": "synthBrass2", "display_name": "Synth Brass 2", "category": "Brass", "description": "Synth brass 2"},
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

