/*
 * OSC Relay for Sonic Claude
 *
 * CORRECT ARCHITECTURE (based on scsynth.org forum research):
 * - Uses Buffer + BufWr for audio data storage
 * - Uses SendReply ONLY to signal when data is ready
 * - Uses Buffer.getn() to retrieve data (NOT loadToFloatArray)
 * - Uses partitioning to avoid read/write conflicts
 *
 * Flow:
 *   scsynth (SendReply signals) → sclang (this script retrieves buffer data) → Python (via OSC)
 *
 * Port allocation:
 *   57110 - scsynth command port (Python → scsynth)
 *   57120 - sclang listening port (scsynth → sclang) - DEFAULT
 *   57121 - Python listening port (sclang → Python)
 */

(
// Connect to existing scsynth server (don't boot a new one)
Server.default = s = Server.remote(\sonicClaude, NetAddr("127.0.0.1", 57110));

"🔗 Connecting to existing scsynth on port 57110...".postln;

// Notify the server (enables status updates)
s.notify;

// Use a Routine to allow waiting
Routine({
    var chunkSize = 1024;
    var numChunks = 8;

    // Give server a moment to connect
    0.5.wait;

    "🔗 OSC Relay starting...".postln;
    "   Server connected, loading SynthDefs...".postln;

    // Allocate buffers
    ~waveformBuffer = Buffer.alloc(s, chunkSize * numChunks, 1);
    ~spectrumBuffer = Buffer.alloc(s, chunkSize * numChunks, 1);

    s.sync;

    "✅ Buffers allocated:".postln;
    "   Waveform: % (ID: %)".format(chunkSize * numChunks, ~waveformBuffer.bufnum).postln;
    "   Spectrum: % (ID: %)".format(chunkSize * numChunks, ~spectrumBuffer.bufnum).postln;

    // Load modular SynthDef files
    "📦 Loading SynthDefs from modular files...".postln;
    (thisProcess.nowExecutingPath.dirname +/+ "synthdefs/monitoring.scd").load;
    s.sync;

    (thisProcess.nowExecutingPath.dirname +/+ "synthdefs/instruments.scd").load;
    s.sync;

    (thisProcess.nowExecutingPath.dirname +/+ "synthdefs/drums.scd").load;
    s.sync;

    (thisProcess.nowExecutingPath.dirname +/+ "synthdefs/melodic.scd").load;
    s.sync;

    (thisProcess.nowExecutingPath.dirname +/+ "synthdefs/playback.scd").load;
    s.sync;


    "✅ All SynthDefs loaded from modular files".postln;
    "BUFFER_IDS: waveform=%, spectrum=%".format(~waveformBuffer.bufnum, ~spectrumBuffer.bufnum).postln;

    // Create NetAddr for Python backend
    ~pythonAddr = NetAddr("127.0.0.1", 57121);

    "📡 Setting up OSC relay...".postln;
    "   sclang listening on port 57120 (receives from scsynth via SendReply)".postln;
    "   Forwarding to Python on 127.0.0.1:57121".postln;

    // Load OSC relay handlers
    (thisProcess.nowExecutingPath.dirname +/+ "osc_handlers.scd").load;

    "✅ OSC Relay ready!".postln;
    "   Waiting for messages from scsynth...".postln;

    // Explicitly open the UDP port
    thisProcess.openUDPPort(57120);
}).play;
)

