/*
 * OSC Relay for Sonic Claude
 *
 * This script runs in sclang and acts as a relay between scsynth and Python.
 *
 * Flow:
 *   scsynth (SendReply on port 57120) → sclang (this script) → Python (127.0.0.1:57121)
 *
 * Why needed:
 *   SendReply/SendTrig UGens can ONLY send to sclang (the language client),
 *   not to arbitrary OSC servers. So we use sclang as a relay.
 *
 * Port allocation:
 *   57110 - scsynth command port (Python → scsynth)
 *   57120 - sclang listening port (scsynth → sclang) - DEFAULT, sclang listens here automatically
 *   57121 - Python listening port (sclang → Python)
 */

(
// Create NetAddr for Python backend (port 57121, NOT 57120!)
~pythonAddr = NetAddr("127.0.0.1", 57121);

"🔗 OSC Relay starting...".postln;
"   sclang listening on port 57120 (receives from scsynth via SendReply)".postln;
"   Forwarding to Python on 127.0.0.1:57121".postln;

// Listen for audio monitor messages from scsynth
OSCdef(\audioMonitorRelay, { |msg|
    // msg format: ['/audio_monitor', nodeID, replyID, ...values]
    // Forward the entire message to Python
    ~pythonAddr.sendMsg(*msg);
    // Debug: print first message
    if(~firstMessage.isNil, {
        "✅ First message received from scsynth: %".format(msg).postln;
        ~firstMessage = true;
    });
}, '/audio_monitor');

"✅ OSC Relay ready!".postln;
"   Waiting for /audio_monitor messages from scsynth...".postln;

// Keep sclang running indefinitely
thisProcess.openUDPPort(57120); // Explicitly open the port
)

