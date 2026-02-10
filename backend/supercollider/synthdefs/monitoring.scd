// Audio Monitoring SynthDefs
// Real-time audio analysis and monitoring

/*
 * AudioMonitor - Taps the master output bus and sends audio data to Python via OSC
 * 
 * This SynthDef reads from the master output bus (bus 0) and sends stereo audio samples
 * to the Python backend for real-time FFT analysis and visualization.
 * 
 * Parameters:
 *   - targetBus: The audio bus to monitor (default: 0 = master output)
 *   - sendRate: How many times per second to send audio data (default: 60 Hz)
 *   - bufferSize: Number of samples to send per message (default: 512)
 *   - pythonPort: OSC port where Python is listening (default: 57120)
 *   - pythonHost: IP address of Python backend (default: "127.0.0.1")
 */
SynthDef(\audioMonitor, { |targetBus=0, sendRate=60, bufferSize=512|
    var sig, left, right, trig;
    
    // Read stereo signal from target bus (non-destructive tap)
    sig = In.ar(targetBus, 2);
    left = sig[0];
    right = sig[1];
    
    // Create trigger for sending data at specified rate
    trig = Impulse.kr(sendRate);
    
    // Send audio samples to Python via OSC
    // Format: /audio_monitor [left_samples...] [right_samples...]
    SendReply.kr(
        trig,
        '/audio_monitor',
        [left, right],
        replyID: 1000
    );
    
    // Pass through the signal unchanged (monitoring is non-destructive)
    // This ensures the audio still goes to the speakers
    Out.ar(targetBus, sig);
}).add;

/*
 * PeakMonitor - Sends peak and RMS levels for metering
 * 
 * Lightweight monitoring for level meters without sending full audio buffers.
 * 
 * Parameters:
 *   - targetBus: The audio bus to monitor (default: 0 = master output)
 *   - sendRate: How many times per second to send levels (default: 30 Hz)
 */
SynthDef(\peakMonitor, { |targetBus=0, sendRate=30|
    var sig, left, right, peakLeft, peakRight, rmsLeft, rmsRight, trig;
    
    // Read stereo signal from target bus
    sig = In.ar(targetBus, 2);
    left = sig[0];
    right = sig[1];
    
    // Calculate peak levels (absolute max over a short window)
    peakLeft = Peak.ar(left.abs, Impulse.kr(sendRate)).lag(0.01);
    peakRight = Peak.ar(right.abs, Impulse.kr(sendRate)).lag(0.01);
    
    // Calculate RMS levels (root mean square for average power)
    rmsLeft = RunningSum.ar(left.squared, (SampleRate.ir / sendRate).asInteger).sqrt;
    rmsRight = RunningSum.ar(right.squared, (SampleRate.ir / sendRate).asInteger).sqrt;
    
    // Create trigger for sending data
    trig = Impulse.kr(sendRate);
    
    // Send levels to Python via OSC
    // Format: /peak_monitor [peakLeft, peakRight, rmsLeft, rmsRight]
    SendReply.kr(
        trig,
        '/peak_monitor',
        [peakLeft, peakRight, rmsLeft, rmsRight],
        replyID: 1001
    );
}).add;

"✅ Monitoring SynthDefs loaded successfully".postln;

