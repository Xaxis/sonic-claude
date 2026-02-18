/*
 * OSC Relay Handlers
 * 
 * OSC message handlers that relay data from scsynth -> sclang -> Python
 * Requires ~pythonAddr to be set before loading this file
 */

(
// Listen for waveform buffer ready messages
// This is sent when a buffer partition is ready to be read
OSCdef(\bufferReadyRelay, { |msg|
    // msg format: ['/buffer_ready', nodeID, replyID, partition, bufferID, chunkSize, numChunks]
    var partition = msg[3].asInteger;
    var bufferID = msg[4].asInteger;
    var chunkSize = msg[5].asInteger;
    var numChunks = msg[6].asInteger;

    // Read from the PREVIOUS partition (the one that just finished writing)
    var readPartition = (partition - 1) % numChunks;
    var startIndex = readPartition * chunkSize;

    // Use the existing buffer (don't create a new one!)
    ~waveformBuffer.getn(startIndex, chunkSize, { |data|
        // Forward the audio data to Python
        // Format: ['/waveform', ...samples]
        ~pythonAddr.sendMsg('/waveform', *(data.as(Array)));

        // Debug: print first waveform send
        if(~firstWaveformSent.isNil, {
            "✅ First waveform data sent to Python (% samples)".format(data.size).postln;
            ~firstWaveformSent = true;
        });
    });

    // Debug: print first message
    if(~firstBufferMessage.isNil, {
        "✅ First buffer_ready message received from scsynth".postln;
        "   Partition: %, Buffer: %, ChunkSize: %, NumChunks: %".format(partition, bufferID, chunkSize, numChunks).postln;
        ~firstBufferMessage = true;
    });
}, '/buffer_ready');

// Listen for spectrum_ready messages (for FFT data)
OSCdef(\spectrumReadyRelay, { |msg|
    // msg format: ['/spectrum_ready', nodeID, replyID, partition, bufferID, chunkSize, numChunks]
    var partition = msg[3].asInteger;
    var bufferID = msg[4].asInteger;
    var chunkSize = msg[5].asInteger;
    var numChunks = msg[6].asInteger;

    var readPartition = (partition - 1) % numChunks;
    var startIndex = readPartition * chunkSize;

    // Use the existing buffer (don't create a new one!)
    ~spectrumBuffer.getn(startIndex, chunkSize, { |data|
        ~pythonAddr.sendMsg('/spectrum', *(data.as(Array)));
    });

    if(~firstSpectrumMessage.isNil, {
        "✅ First spectrum_ready message received from scsynth".postln;
        ~firstSpectrumMessage = true;
    });
}, '/spectrum_ready');

// Listen for INPUT audio waveform
OSCdef(\inputBufferReadyRelay, { |msg|
    var partition = msg[3].asInteger;
    var bufferID = msg[4].asInteger;
    var chunkSize = msg[5].asInteger;
    var numChunks = msg[6].asInteger;

    var readPartition = (partition - 1) % numChunks;
    var startIndex = readPartition * chunkSize;

    ~waveformBuffer.getn(startIndex, chunkSize, { |data|
        ~pythonAddr.sendMsg('/input_waveform', *(data.as(Array)));
    });

    if(~firstInputWaveformMessage.isNil, {
        "✅ First input waveform message received".postln;
        ~firstInputWaveformMessage = true;
    });
}, '/input_buffer_ready');

// Listen for INPUT audio spectrum
OSCdef(\inputSpectrumReadyRelay, { |msg|
    var partition = msg[3].asInteger;
    var bufferID = msg[4].asInteger;
    var chunkSize = msg[5].asInteger;
    var numChunks = msg[6].asInteger;

    var readPartition = (partition - 1) % numChunks;
    var startIndex = readPartition * chunkSize;

    ~spectrumBuffer.getn(startIndex, chunkSize, { |data|
        ~pythonAddr.sendMsg('/input_spectrum', *(data.as(Array)));
    });

    if(~firstInputSpectrumMessage.isNil, {
        "✅ First input spectrum message received".postln;
        ~firstInputSpectrumMessage = true;
    });
}, '/input_spectrum_ready');

// Listen for meter data (master output meters)
OSCdef(\meterRelay, { |msg|
    // msg format: ['/meter', nodeID, replyID, peakL, peakR, rmsL, rmsR]
    ~pythonAddr.sendMsg(*msg);

    if(~firstMeterMessage.isNil, {
        "✅ First meter message received from scsynth".postln;
        ~firstMeterMessage = true;
    });
}, '/meter');

// Listen for per-track meter data from trackMixer synths
OSCdef(\trackMeterRelay, { |msg|
    // msg format: ['/track_meter', nodeID, replyID, trackId, peakL, peakR, rmsL, rmsR]
    // Extract track ID and meter values
    var trackId = msg[3].asInteger;
    var peakL = msg[4];
    var peakR = msg[5];
    var rmsL = msg[6];
    var rmsR = msg[7];
    
    // Forward to Python with track ID
    // Python expects: ['/track_meter', trackId, peakL, peakR, rmsL, rmsR]
    ~pythonAddr.sendMsg('/track_meter', trackId, peakL, peakR, rmsL, rmsR);

    if(~firstTrackMeterMessage.isNil, {
        "✅ First track meter message received from scsynth".postln;
        "   Track ID: %, Peak L/R: % / %, RMS L/R: % / %".format(trackId, peakL, peakR, rmsL, rmsR).postln;
        ~firstTrackMeterMessage = true;
    });
}, '/track_meter');

// Listen for audio input meter data
OSCdef(\inputMeterRelay, { |msg|
    // msg format: ['/input_meter', nodeID, replyID, peakL, peakR, rmsL, rmsR]
    ~pythonAddr.sendMsg(*msg);

    if(~firstInputMeterMessage.isNil, {
        "✅ First input meter message received from scsynth".postln;
        ~firstInputMeterMessage = true;
    });
}, '/input_meter');

"✅ OSC relay handlers registered".postln;
"   Waveform: /buffer_ready, /input_buffer_ready".postln;
"   Spectrum: /spectrum_ready, /input_spectrum_ready".postln;
"   Meters: /meter, /track_meter, /input_meter".postln;
)

