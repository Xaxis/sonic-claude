"""
SynthDef Routes - Information about available synthesizer definitions
"""
import logging
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)


class SynthDefInfo(BaseModel):
    """SynthDef information"""
    name: str
    display_name: str
    category: str
    description: str
    parameters: list[str]


# Module-level registry of all available SynthDefs
# This is a static list based on what's loaded in load_synthdefs.scd
SYNTHDEF_REGISTRY = [
        # Basic Synths
        SynthDefInfo(
            name="sine",
            display_name="Sine Wave",
            category="Basic",
            description="Simple sine wave oscillator",
            parameters=["attack", "release"]
        ),
        SynthDefInfo(
            name="saw",
            display_name="Saw Wave",
            category="Basic",
            description="Sawtooth wave with low-pass filter",
            parameters=["attack", "release", "cutoff"]
        ),
        SynthDefInfo(
            name="square",
            display_name="Square Wave",
            category="Basic",
            description="Square/pulse wave with variable width",
            parameters=["attack", "release", "width"]
        ),

        # Professional Instruments
        SynthDefInfo(
            name="fm",
            display_name="FM Synth",
            category="Synth",
            description="Frequency modulation synthesis",
            parameters=["attack", "decay", "sustain", "release", "modRatio", "modIndex"]
        ),
        SynthDefInfo(
            name="subtractive",
            display_name="Subtractive Synth",
            category="Synth",
            description="Analog-style subtractive synthesis",
            parameters=["attack", "decay", "sustain", "release", "cutoff", "resonance", "filterEnv"]
        ),
        SynthDefInfo(
            name="pad",
            display_name="Pad Synth",
            category="Synth",
            description="Lush, detuned pad sound",
            parameters=["attack", "decay", "sustain", "release", "detune", "cutoff"]
        ),
        SynthDefInfo(
            name="bass",
            display_name="Bass Synth",
            category="Bass",
            description="Deep, punchy bass sound",
            parameters=["attack", "decay", "sustain", "release", "cutoff", "resonance", "drive"]
        ),
        SynthDefInfo(
            name="lead",
            display_name="Lead Synth",
            category="Lead",
            description="Bright, cutting lead sound",
            parameters=["attack", "decay", "sustain", "release", "cutoff", "resonance", "detune"]
        ),
        SynthDefInfo(
            name="pluck",
            display_name="Plucked String",
            category="Acoustic",
            description="Karplus-Strong plucked string",
            parameters=["attack", "release", "coef"]
        ),
        SynthDefInfo(
            name="bell",
            display_name="Bell",
            category="Acoustic",
            description="Metallic bell/mallet sound",
            parameters=["attack", "release", "brightness"]
        ),
        SynthDefInfo(
            name="organ",
            display_name="Organ",
            category="Keys",
            description="Tonewheel organ sound",
            parameters=["attack", "release", "drawbar1", "drawbar2", "drawbar3"]
        ),

        # ====================================================================
        # PIANO FAMILY (GM 1-8)
        # ====================================================================

        SynthDefInfo(
            name="acousticGrandPiano",
            display_name="Acoustic Grand Piano",
            category="Piano",
            description="Rich, full-bodied grand piano",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="brightAcousticPiano",
            display_name="Bright Acoustic Piano",
            category="Piano",
            description="Brighter piano with more attack",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="electricGrandPiano",
            display_name="Electric Grand Piano",
            category="Piano",
            description="Yamaha CP-70 style electric grand",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="honkyTonkPiano",
            display_name="Honky-tonk Piano",
            category="Piano",
            description="Detuned saloon piano",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="electricPiano1",
            display_name="Electric Piano 1 (Rhodes)",
            category="Piano",
            description="Rhodes/Wurlitzer electric piano",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="electricPiano2",
            display_name="Electric Piano 2 (DX7)",
            category="Piano",
            description="FM electric piano with chorus",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="harpsichord",
            display_name="Harpsichord",
            category="Piano",
            description="Baroque plucked keyboard",
            parameters=[]
        ),
        SynthDefInfo(
            name="clavinet",
            display_name="Clavinet",
            category="Piano",
            description="Funky electric clavichord",
            parameters=["velocity"]
        ),

        # ====================================================================
        # CHROMATIC PERCUSSION (GM 9-16)
        # ====================================================================

        SynthDefInfo(
            name="celesta",
            display_name="Celesta",
            category="Chromatic Percussion",
            description="Delicate bell-like keyboard",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="glockenspiel",
            display_name="Glockenspiel",
            category="Chromatic Percussion",
            description="Bright metallic bells",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="musicBox",
            display_name="Music Box",
            category="Chromatic Percussion",
            description="Delicate plucked bell sound",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="vibraphone",
            display_name="Vibraphone",
            category="Chromatic Percussion",
            description="Mallet percussion with vibrato",
            parameters=["velocity", "vibratoRate"]
        ),
        SynthDefInfo(
            name="marimba",
            display_name="Marimba",
            category="Chromatic Percussion",
            description="Wooden mallet percussion",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="xylophone",
            display_name="Xylophone",
            category="Chromatic Percussion",
            description="Bright wooden percussion",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="tubularBells",
            display_name="Tubular Bells",
            category="Chromatic Percussion",
            description="Large resonant bells",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="dulcimer",
            display_name="Dulcimer",
            category="Chromatic Percussion",
            description="Hammered string instrument",
            parameters=["velocity"]
        ),

        # ====================================================================
        # ORGAN (GM 17-24)
        # ====================================================================

        SynthDefInfo(
            name="drawbarOrgan",
            display_name="Drawbar Organ (Hammond B3)",
            category="Organ",
            description="Classic Hammond B3 tonewheel organ",
            parameters=["drawbar1", "drawbar2", "drawbar3"]
        ),
        SynthDefInfo(
            name="percussiveOrgan",
            display_name="Percussive Organ",
            category="Organ",
            description="Organ with percussive attack click",
            parameters=[]
        ),
        SynthDefInfo(
            name="rockOrgan",
            display_name="Rock Organ",
            category="Organ",
            description="Bright overdriven organ",
            parameters=[]
        ),
        SynthDefInfo(
            name="churchOrgan",
            display_name="Church Organ",
            category="Organ",
            description="Pipe organ sound",
            parameters=[]
        ),
        SynthDefInfo(
            name="reedOrgan",
            display_name="Reed Organ (Harmonium)",
            category="Organ",
            description="Harmonium-style reed organ",
            parameters=[]
        ),
        SynthDefInfo(
            name="accordion",
            display_name="Accordion",
            category="Organ",
            description="Accordion with musette tuning",
            parameters=[]
        ),
        SynthDefInfo(
            name="harmonica",
            display_name="Harmonica",
            category="Organ",
            description="Blues harmonica",
            parameters=[]
        ),
        SynthDefInfo(
            name="bandoneon",
            display_name="Bandoneon",
            category="Organ",
            description="Tango accordion",
            parameters=[]
        ),

        # ====================================================================
        # GUITAR (GM 25-32)
        # ====================================================================

        SynthDefInfo(
            name="acousticGuitarNylon",
            display_name="Acoustic Guitar (Nylon)",
            category="Guitar",
            description="Classical nylon-string guitar",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="acousticGuitarSteel",
            display_name="Acoustic Guitar (Steel)",
            category="Guitar",
            description="Steel-string acoustic guitar",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="electricGuitarJazz",
            display_name="Electric Guitar (Jazz)",
            category="Guitar",
            description="Warm jazz guitar tone",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="electricGuitarClean",
            display_name="Electric Guitar (Clean)",
            category="Guitar",
            description="Clean Stratocaster with chorus",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="electricGuitarMuted",
            display_name="Electric Guitar (Muted)",
            category="Guitar",
            description="Palm-muted electric guitar",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="overdrivenGuitar",
            display_name="Overdriven Guitar",
            category="Guitar",
            description="Tube amp overdrive",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="distortionGuitar",
            display_name="Distortion Guitar",
            category="Guitar",
            description="Heavy distortion guitar",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="guitarHarmonics",
            display_name="Guitar Harmonics",
            category="Guitar",
            description="Natural and artificial harmonics",
            parameters=["velocity"]
        ),

        # ====================================================================
        # BASS (GM 33-40)
        # ====================================================================

        SynthDefInfo(
            name="acousticBass",
            display_name="Acoustic Bass",
            category="Bass",
            description="Upright double bass",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="electricBassFinger",
            display_name="Electric Bass (Finger)",
            category="Bass",
            description="Fingerstyle electric bass",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="electricBassPick",
            display_name="Electric Bass (Pick)",
            category="Bass",
            description="Picked electric bass",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="fretlessBass",
            display_name="Fretless Bass",
            category="Bass",
            description="Smooth fretless bass",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="slapBass1",
            display_name="Slap Bass 1",
            category="Bass",
            description="Aggressive slap bass",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="slapBass2",
            display_name="Slap Bass 2",
            category="Bass",
            description="Funkier slap bass",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="synthBass1",
            display_name="Synth Bass 1",
            category="Bass",
            description="Analog synth bass",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="synthBass2",
            display_name="Synth Bass 2",
            category="Bass",
            description="Resonant synth bass",
            parameters=["velocity"]
        ),

        # ====================================================================
        # STRINGS (GM 41-48)
        # ====================================================================

        SynthDefInfo(
            name="violin",
            display_name="Violin",
            category="Strings",
            description="Bowed violin with vibrato",
            parameters=["velocity", "vibrato"]
        ),
        SynthDefInfo(
            name="viola",
            display_name="Viola",
            category="Strings",
            description="Deeper than violin",
            parameters=["velocity", "vibrato"]
        ),
        SynthDefInfo(
            name="cello",
            display_name="Cello",
            category="Strings",
            description="Rich, warm low strings",
            parameters=["velocity", "vibrato"]
        ),
        SynthDefInfo(
            name="contrabass",
            display_name="Contrabass",
            category="Strings",
            description="Deep double bass",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="tremoloStrings",
            display_name="Tremolo Strings",
            category="Strings",
            description="Rapid bowing tremolo",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="pizzicatoStrings",
            display_name="Pizzicato Strings",
            category="Strings",
            description="Plucked strings",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="orchestralHarp",
            display_name="Orchestral Harp",
            category="Strings",
            description="Concert harp",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="timpani",
            display_name="Timpani",
            category="Strings",
            description="Orchestral kettle drums",
            parameters=["velocity"]
        ),

        # ====================================================================
        # ENSEMBLE (GM 49-56)
        # ====================================================================

        SynthDefInfo(
            name="stringEnsemble1",
            display_name="String Ensemble 1",
            category="Ensemble",
            description="Slow strings ensemble",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="stringEnsemble2",
            display_name="String Ensemble 2",
            category="Ensemble",
            description="Faster strings ensemble",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="synthStrings1",
            display_name="Synth Strings 1",
            category="Ensemble",
            description="Analog string synth",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="synthStrings2",
            display_name="Synth Strings 2",
            category="Ensemble",
            description="Brighter synth strings",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="choirAahs",
            display_name="Choir Aahs",
            category="Ensemble",
            description="Vocal choir (ah vowel)",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="voiceOohs",
            display_name="Voice Oohs",
            category="Ensemble",
            description="Vocal choir (oo vowel)",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="synthVoice",
            display_name="Synth Voice",
            category="Ensemble",
            description="Synthesized vocal",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="orchestraHit",
            display_name="Orchestra Hit",
            category="Ensemble",
            description="Orchestral stab",
            parameters=["velocity"]
        ),

        # ====================================================================
        # BRASS (GM 57-64)
        # ====================================================================

        SynthDefInfo(
            name="trumpet",
            display_name="Trumpet",
            category="Brass",
            description="Bright brass trumpet",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="trombone",
            display_name="Trombone",
            category="Brass",
            description="Deeper brass trombone",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="tuba",
            display_name="Tuba",
            category="Brass",
            description="Deep bass brass",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="mutedTrumpet",
            display_name="Muted Trumpet",
            category="Brass",
            description="Trumpet with mute",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="frenchHorn",
            display_name="French Horn",
            category="Brass",
            description="Warm, mellow brass",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="brassSection",
            display_name="Brass Section",
            category="Brass",
            description="Full brass ensemble",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="synthBrass1",
            display_name="Synth Brass 1",
            category="Brass",
            description="Analog brass synth",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="synthBrass2",
            display_name="Synth Brass 2",
            category="Brass",
            description="Brighter synth brass",
            parameters=["velocity"]
        ),

        # ====================================================================
        # REED (GM 65-72)
        # ====================================================================

        SynthDefInfo(
            name="sopranoSax",
            display_name="Soprano Sax",
            category="Reed",
            description="High saxophone",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="altoSax",
            display_name="Alto Sax",
            category="Reed",
            description="Mid-range saxophone",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="tenorSax",
            display_name="Tenor Sax",
            category="Reed",
            description="Lower saxophone",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="baritoneSax",
            display_name="Baritone Sax",
            category="Reed",
            description="Deep saxophone",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="oboe",
            display_name="Oboe",
            category="Reed",
            description="Double reed woodwind",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="englishHorn",
            display_name="English Horn",
            category="Reed",
            description="Alto oboe",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="bassoon",
            display_name="Bassoon",
            category="Reed",
            description="Deep double reed",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="clarinet",
            display_name="Clarinet",
            category="Reed",
            description="Single reed woodwind",
            parameters=["velocity"]
        ),

        # ====================================================================
        # PIPE (GM 73-80)
        # ====================================================================

        SynthDefInfo(
            name="piccolo",
            display_name="Piccolo",
            category="Pipe",
            description="High flute",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="flute",
            display_name="Flute",
            category="Pipe",
            description="Concert flute",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="recorder",
            display_name="Recorder",
            category="Pipe",
            description="Wooden flute",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="panFlute",
            display_name="Pan Flute",
            category="Pipe",
            description="Breathy pan pipes",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="blownBottle",
            display_name="Blown Bottle",
            category="Pipe",
            description="Bottle resonance",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="shakuhachi",
            display_name="Shakuhachi",
            category="Pipe",
            description="Japanese bamboo flute",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="whistle",
            display_name="Whistle",
            category="Pipe",
            description="Simple whistle",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="ocarina",
            display_name="Ocarina",
            category="Pipe",
            description="Clay flute",
            parameters=["velocity"]
        ),

        # ====================================================================
        # SYNTH LEAD (GM 81-88)
        # ====================================================================

        SynthDefInfo(
            name="lead1Square",
            display_name="Lead 1 (Square)",
            category="Synth Lead",
            description="Square wave lead",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="lead2Sawtooth",
            display_name="Lead 2 (Sawtooth)",
            category="Synth Lead",
            description="Sawtooth lead",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="lead3Calliope",
            display_name="Lead 3 (Calliope)",
            category="Synth Lead",
            description="Steam organ lead",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="lead4Chiff",
            display_name="Lead 4 (Chiff)",
            category="Synth Lead",
            description="Synth lead with attack",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="lead5Charang",
            display_name="Lead 5 (Charang)",
            category="Synth Lead",
            description="Distorted lead",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="lead6Voice",
            display_name="Lead 6 (Voice)",
            category="Synth Lead",
            description="Vocal-like lead",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="lead7Fifths",
            display_name="Lead 7 (Fifths)",
            category="Synth Lead",
            description="Lead with fifth harmony",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="lead8BassLead",
            display_name="Lead 8 (Bass + Lead)",
            category="Synth Lead",
            description="Fat bass and lead",
            parameters=["velocity"]
        ),

        # ====================================================================
        # SYNTH PAD (GM 89-96)
        # ====================================================================

        SynthDefInfo(
            name="pad1NewAge",
            display_name="Pad 1 (New Age)",
            category="Synth Pad",
            description="Warm, ethereal pad",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="pad2Warm",
            display_name="Pad 2 (Warm)",
            category="Synth Pad",
            description="Soft, warm pad",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="pad3Polysynth",
            display_name="Pad 3 (Polysynth)",
            category="Synth Pad",
            description="Bright poly pad",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="pad4Choir",
            display_name="Pad 4 (Choir)",
            category="Synth Pad",
            description="Vocal pad",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="pad5Bowed",
            display_name="Pad 5 (Bowed)",
            category="Synth Pad",
            description="Bowed glass pad",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="pad6Metallic",
            display_name="Pad 6 (Metallic)",
            category="Synth Pad",
            description="Metallic pad",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="pad7Halo",
            display_name="Pad 7 (Halo)",
            category="Synth Pad",
            description="Bright halo pad",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="pad8Sweep",
            display_name="Pad 8 (Sweep)",
            category="Synth Pad",
            description="Sweeping pad",
            parameters=["velocity"]
        ),

        # ====================================================================
        # SYNTH FX (GM 97-104)
        # ====================================================================

        SynthDefInfo(
            name="fx1Rain",
            display_name="FX 1 (Rain)",
            category="Synth FX",
            description="Rain effect",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="fx2Soundtrack",
            display_name="FX 2 (Soundtrack)",
            category="Synth FX",
            description="Cinematic pad",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="fx3Crystal",
            display_name="FX 3 (Crystal)",
            category="Synth FX",
            description="Crystalline sound",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="fx4Atmosphere",
            display_name="FX 4 (Atmosphere)",
            category="Synth FX",
            description="Atmospheric pad",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="fx5Brightness",
            display_name="FX 5 (Brightness)",
            category="Synth FX",
            description="Bright sparkle",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="fx6Goblins",
            display_name="FX 6 (Goblins)",
            category="Synth FX",
            description="Eerie, modulated sound",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="fx7Echoes",
            display_name="FX 7 (Echoes)",
            category="Synth FX",
            description="Echo pad",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="fx8SciFi",
            display_name="FX 8 (Sci-Fi)",
            category="Synth FX",
            description="Science fiction sound",
            parameters=["velocity"]
        ),

        # ====================================================================
        # ETHNIC (GM 105-112)
        # ====================================================================

        SynthDefInfo(
            name="sitar",
            display_name="Sitar",
            category="Ethnic",
            description="Indian plucked string",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="banjo",
            display_name="Banjo",
            category="Ethnic",
            description="American plucked string",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="shamisen",
            display_name="Shamisen",
            category="Ethnic",
            description="Japanese plucked string",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="koto",
            display_name="Koto",
            category="Ethnic",
            description="Japanese zither",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="kalimba",
            display_name="Kalimba",
            category="Ethnic",
            description="African thumb piano",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="bagpipe",
            display_name="Bagpipe",
            category="Ethnic",
            description="Scottish bagpipe",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="fiddle",
            display_name="Fiddle",
            category="Ethnic",
            description="Folk violin",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="shanai",
            display_name="Shanai",
            category="Ethnic",
            description="Indian oboe",
            parameters=["velocity"]
        ),

        # ====================================================================
        # PERCUSSIVE (GM 113-120)
        # ====================================================================

        SynthDefInfo(
            name="tinkleBell",
            display_name="Tinkle Bell",
            category="Percussive",
            description="Small bell",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="agogo",
            display_name="Agogo",
            category="Percussive",
            description="Metal percussion",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="steelDrums",
            display_name="Steel Drums",
            category="Percussive",
            description="Caribbean steel pan",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="woodblockMelodic",
            display_name="Woodblock",
            category="Percussive",
            description="Wooden percussion",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="taikoDrum",
            display_name="Taiko Drum",
            category="Percussive",
            description="Japanese drum",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="melodicTom",
            display_name="Melodic Tom",
            category="Percussive",
            description="Tuned tom drum",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="synthDrum",
            display_name="Synth Drum",
            category="Percussive",
            description="Electronic drum",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="reverseCymbal",
            display_name="Reverse Cymbal",
            category="Percussive",
            description="Reversed cymbal effect",
            parameters=["velocity"]
        ),

        # ====================================================================
        # SOUND FX (GM 121-128)
        # ====================================================================

        SynthDefInfo(
            name="guitarFretNoise",
            display_name="Guitar Fret Noise",
            category="Sound FX",
            description="Fret slide sound",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="breathNoise",
            display_name="Breath Noise",
            category="Sound FX",
            description="Breath sound",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="seashore",
            display_name="Seashore",
            category="Sound FX",
            description="Ocean waves",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="birdTweet",
            display_name="Bird Tweet",
            category="Sound FX",
            description="Bird chirping",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="telephoneRing",
            display_name="Telephone Ring",
            category="Sound FX",
            description="Phone ringing",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="helicopter",
            display_name="Helicopter",
            category="Sound FX",
            description="Helicopter sound",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="applause",
            display_name="Applause",
            category="Sound FX",
            description="Crowd applause",
            parameters=["velocity"]
        ),
        SynthDefInfo(
            name="gunshot",
            display_name="Gunshot",
            category="Sound FX",
            description="Gun firing",
            parameters=["velocity"]
        ),

        # ====================================================================
        # DRUMS & PERCUSSION
        # ====================================================================

        # Kick Drums
        SynthDefInfo(
            name="kick808",
            display_name="TR-808 Kick",
            category="Drums",
            description="Classic TR-808 analog kick drum",
            parameters=["amp", "freq", "decay", "pitchRatio"]
        ),
        SynthDefInfo(
            name="kick909",
            display_name="TR-909 Kick",
            category="Drums",
            description="Punchy TR-909 kick with click",
            parameters=["amp", "freq", "decay", "pitchRatio", "click"]
        ),
        SynthDefInfo(
            name="kickAcoustic",
            display_name="Acoustic Kick",
            category="Drums",
            description="Natural acoustic kick drum",
            parameters=["amp", "freq", "decay", "tone"]
        ),

        # Snare Drums
        SynthDefInfo(
            name="snare808",
            display_name="TR-808 Snare",
            category="Drums",
            description="Classic TR-808 snare with tone and noise",
            parameters=["amp", "freq", "decay", "noiseDecay", "tone"]
        ),
        SynthDefInfo(
            name="snare909",
            display_name="TR-909 Snare",
            category="Drums",
            description="Bright TR-909 snare with snap",
            parameters=["amp", "freq", "decay", "noiseDecay", "snap"]
        ),
        SynthDefInfo(
            name="snareAcoustic",
            display_name="Acoustic Snare",
            category="Drums",
            description="Natural acoustic snare drum",
            parameters=["amp", "freq", "decay", "noiseDecay", "snares"]
        ),

        # Hi-Hats
        SynthDefInfo(
            name="hihatClosed808",
            display_name="TR-808 Closed Hi-Hat",
            category="Drums",
            description="Classic TR-808 closed hi-hat",
            parameters=["amp", "decay", "tone"]
        ),
        SynthDefInfo(
            name="hihatOpen808",
            display_name="TR-808 Open Hi-Hat",
            category="Drums",
            description="Classic TR-808 open hi-hat",
            parameters=["amp", "decay", "tone"]
        ),
        SynthDefInfo(
            name="hihatClosed909",
            display_name="TR-909 Closed Hi-Hat",
            category="Drums",
            description="Bright TR-909 closed hi-hat",
            parameters=["amp", "decay", "tone"]
        ),
        SynthDefInfo(
            name="hihatOpen909",
            display_name="TR-909 Open Hi-Hat",
            category="Drums",
            description="Bright TR-909 open hi-hat",
            parameters=["amp", "decay", "tone"]
        ),

        # Toms
        SynthDefInfo(
            name="tomLow808",
            display_name="TR-808 Low Tom",
            category="Drums",
            description="TR-808 low tom with pitch sweep",
            parameters=["amp", "freq", "decay"]
        ),
        SynthDefInfo(
            name="tomMid808",
            display_name="TR-808 Mid Tom",
            category="Drums",
            description="TR-808 mid tom with pitch sweep",
            parameters=["amp", "freq", "decay"]
        ),
        SynthDefInfo(
            name="tomHigh808",
            display_name="TR-808 High Tom",
            category="Drums",
            description="TR-808 high tom with pitch sweep",
            parameters=["amp", "freq", "decay"]
        ),

        # Cymbals
        SynthDefInfo(
            name="cymbalCrash",
            display_name="Crash Cymbal",
            category="Drums",
            description="Bright crash cymbal",
            parameters=["amp", "decay", "tone"]
        ),
        SynthDefInfo(
            name="cymbalRide",
            display_name="Ride Cymbal",
            category="Drums",
            description="Ride cymbal with bell tone",
            parameters=["amp", "decay", "tone"]
        ),
        SynthDefInfo(
            name="cymbalSplash",
            display_name="Splash Cymbal",
            category="Drums",
            description="Bright splash cymbal",
            parameters=["amp", "decay", "tone"]
        ),

        # Percussion
        SynthDefInfo(
            name="clap808",
            display_name="TR-808 Hand Clap",
            category="Percussion",
            description="Classic TR-808 hand clap",
            parameters=["amp", "decay"]
        ),
        SynthDefInfo(
            name="cowbell808",
            display_name="TR-808 Cowbell",
            category="Percussion",
            description="Classic TR-808 cowbell",
            parameters=["amp", "freq", "decay"]
        ),
        SynthDefInfo(
            name="rimshot808",
            display_name="TR-808 Rimshot",
            category="Percussion",
            description="Classic TR-808 rimshot",
            parameters=["amp", "freq", "decay"]
        ),

        # Latin Percussion
        SynthDefInfo(
            name="congaHigh",
            display_name="High Conga",
            category="Latin Percussion",
            description="High-pitched conga drum",
            parameters=["amp", "freq", "decay", "tone"]
        ),
        SynthDefInfo(
            name="congaLow",
            display_name="Low Conga",
            category="Latin Percussion",
            description="Low-pitched conga drum",
            parameters=["amp", "freq", "decay", "tone"]
        ),
        SynthDefInfo(
            name="bongoHigh",
            display_name="High Bongo",
            category="Latin Percussion",
            description="High-pitched bongo drum",
            parameters=["amp", "freq", "decay"]
        ),
        SynthDefInfo(
            name="bongoLow",
            display_name="Low Bongo",
            category="Latin Percussion",
            description="Low-pitched bongo drum",
            parameters=["amp", "freq", "decay"]
        ),
        SynthDefInfo(
            name="timbaleHigh",
            display_name="High Timbale",
            category="Latin Percussion",
            description="High-pitched timbale with metallic ring",
            parameters=["amp", "freq", "decay", "ring"]
        ),
        SynthDefInfo(
            name="timbaleLow",
            display_name="Low Timbale",
            category="Latin Percussion",
            description="Low-pitched timbale with metallic ring",
            parameters=["amp", "freq", "decay", "ring"]
        ),

        # World Percussion
        SynthDefInfo(
            name="tambourine",
            display_name="Tambourine",
            category="World Percussion",
            description="Jingle tambourine",
            parameters=["amp", "decay", "tone"]
        ),
        SynthDefInfo(
            name="shaker",
            display_name="Shaker/Maracas",
            category="World Percussion",
            description="Shaker or maracas sound",
            parameters=["amp", "decay"]
        ),
        SynthDefInfo(
            name="claves",
            display_name="Claves",
            category="World Percussion",
            description="Wooden claves click",
            parameters=["amp", "freq", "decay"]
        ),
        SynthDefInfo(
            name="woodblock",
            display_name="Woodblock",
            category="World Percussion",
            description="Wooden percussion block",
            parameters=["amp", "freq", "decay"]
        ),
        SynthDefInfo(
            name="triangle",
            display_name="Triangle",
            category="World Percussion",
            description="Metallic triangle with ring",
            parameters=["amp", "freq", "decay"]
        ),
        SynthDefInfo(
            name="agogoHigh",
            display_name="High Agogô",
            category="World Percussion",
            description="High-pitched agogô bell",
            parameters=["amp", "freq", "decay"]
        ),
        SynthDefInfo(
            name="agogoLow",
            display_name="Low Agogô",
            category="World Percussion",
            description="Low-pitched agogô bell",
            parameters=["amp", "freq", "decay"]
        ),
]


@router.get("/synthdefs", response_model=list[SynthDefInfo])
async def get_synthdefs():
    """Get list of available SynthDefs for MIDI tracks"""
    return SYNTHDEF_REGISTRY

