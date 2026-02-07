# ═══════════════════════════════════════════════════════════════════════════════
# "RESONANCE EVOLVED" - Intelligent Web-Reactive EDM Masterpiece
# ═══════════════════════════════════════════════════════════════════════════════
# Advanced Features:
# • Harmonic progression system with chord theory (I-IV-V-vi)
# • Intelligent arrangement engine (intro/build/drop/breakdown/outro)
# • Multiple synth layers with professional mixing
# • Dynamic filter automation with LFO-driven modulation
# • Probability-based variation system
# • Key/scale modulation between sections
# • Sophisticated drum patterns with fills
# • Sidechain compression simulation
# • Musical AI that responds intelligently to web controls
# ═══════════════════════════════════════════════════════════════════════════════

use_bpm 128

# ═══ GLOBAL STATE ═══
set :web_bpm, 128
set :web_intensity, 5          # 0-10: Controls arrangement sections
set :web_cutoff, 100           # 50-130: Master filter cutoff
set :web_reverb, 0.5           # 0-1: Reverb mix
set :web_echo, 0.3             # 0-1: Echo mix
set :web_key, :a               # Root key
set :web_scale, :minor         # Scale type
set :evolution, 0              # 0-127: Evolution counter
set :section, :intro           # :intro, :build, :drop, :breakdown, :outro
set :bar_count, 0              # Bar counter for arrangement
set :kick_trigger, 0           # For sidechain simulation
set :playing, false            # Transport state (play/stop) - STARTS STOPPED, controlled by web
set :master_volume, 1.0        # Master volume control

puts "🎵 Sonic Claude - Web-Controlled EDM System"
puts "📡 Listening for OSC on port 4560"
puts "🌐 Open http://localhost:8000 and click PLAY to start!"
puts "⏸️  Currently STOPPED - waiting for web control..."
puts "✅ Transport control ENABLED - All loops will respect play/stop state"

# ═══ OSC LISTENERS ═══
live_loop :osc_bpm do
  use_real_time
  b = sync "/osc*/bpm"
  set :web_bpm, b[0]
end

live_loop :osc_intensity do
  use_real_time
  i = sync "/osc*/intensity"
  set :web_intensity, i[0]
  # Intensity controls arrangement intelligence
  intensity = i[0]
  if intensity <= 2
    set :section, :intro
  elsif intensity <= 4
    set :section, :build
  elsif intensity <= 7
    set :section, :drop
  elsif intensity <= 9
    set :section, :breakdown
  else
    set :section, :outro
  end
end

live_loop :osc_cutoff do
  use_real_time
  c = sync "/osc*/cutoff"
  set :web_cutoff, c[0]
end

live_loop :osc_reverb do
  use_real_time
  r = sync "/osc*/reverb"
  set :web_reverb, r[0]
end

live_loop :osc_echo do
  use_real_time
  e = sync "/osc*/echo"
  set :web_echo, e[0]
end

live_loop :osc_transport do
  use_real_time
  t = sync "/osc*/transport"
  command = t[0].to_s.strip.downcase
  puts "🔍 DEBUG: Raw OSC value: #{t.inspect}"
  puts "🔍 DEBUG: Parsed command: '#{command}'"
  puts "🔍 DEBUG: Current playing state: #{get[:playing]}"

  if command == "play"
    set :playing, true
    puts "▶️  PLAYING - Music should start now!"
  elsif command == "stop"
    set :playing, false
    puts "⏸️  STOPPED - Music should stop now!"
  else
    puts "⚠️  WARNING: Unknown command: '#{command}'"
  end

  puts "🔍 DEBUG: New playing state: #{get[:playing]}"
end

live_loop :osc_trigger_sample do
  use_real_time
  s = sync "/osc*/trigger_sample"
  sample_name = s[0].to_sym
  puts "Triggering sample: #{sample_name}"
  sample sample_name, amp: 1.5
end

live_loop :osc_trigger_synth do
  use_real_time
  s = sync "/osc*/trigger_synth"
  synth_name = s[0].to_sym
  puts "Triggering synth: #{synth_name}"
  use_synth synth_name
  play 60, release: 1, amp: 0.8
end

live_loop :osc_key do
  use_real_time
  k = sync "/osc*/key"
  key_name = k[0].to_s.downcase.to_sym
  set :web_key, key_name
  puts "Key changed to: #{key_name}"
end

live_loop :osc_scale do
  use_real_time
  s = sync "/osc*/scale"
  scale_name = s[0].to_s.downcase.to_sym
  set :web_scale, scale_name
  puts "Scale changed to: #{scale_name}"
end

# ═══ INTELLIGENT ARRANGEMENT ENGINE ═══
live_loop :arrangement_brain do
  use_bpm get[:web_bpm]
  set :evolution, (get[:evolution] + 1) % 128
  set :bar_count, (get[:bar_count] + 1) % 64

  # Auto-modulate key every 32 bars for musical interest
  if get[:bar_count] % 32 == 0 and one_in(3)
    keys = [:a, :c, :d, :e, :f, :g].ring
    set :web_key, keys.choose
  end

  sleep 4
end

# ═══ HARMONIC PROGRESSION SYSTEM ═══
# Returns chord progression based on key and section
define :get_chord_progression do |root_key, scale_type, section|
  root = note(root_key)

  # I-IV-V-vi progression (classic EDM)
  if section == :intro or section == :breakdown
    # Simpler progression for intro/breakdown
    [
      chord(root, :minor7),
      chord(root + 5, :major7),  # IV
      chord(root, :minor7),
      chord(root + 7, :major)    # V
    ].ring
  elsif section == :drop
    # Powerful progression for drop
    [
      chord(root, :minor),
      chord(root + 5, :major),   # IV
      chord(root + 7, :major),   # V
      chord(root + 9, :minor)    # vi
    ].ring
  else
    # Build section - tension building
    [
      chord(root, :minor7),
      chord(root + 3, :major7),
      chord(root + 7, :major7),
      chord(root + 10, :minor7)
    ].ring
  end
end

# ═══ KICK DRUM WITH SIDECHAIN TRIGGER ═══
live_loop :kick_master do
  use_bpm get[:web_bpm]

  if get[:playing]  # Only play if transport is active
    section = get[:section]
    intensity = get[:web_intensity]

    # Kick pattern varies by section
    if section == :intro
      pattern = [1,0,0,0].ring
    elsif section == :build
      pattern = [1,0,1,0].ring
    elsif section == :drop
      pattern = [1,0,0,0].ring  # Four on floor
    elsif section == :breakdown
      pattern = [1,0,0,0,0,0,0,0].ring  # Sparse
    else
      pattern = [1,0,1,0].ring
    end

    if pattern.tick == 1
      set :kick_trigger, 1  # Trigger sidechain
      with_fx :compressor, threshold: 0.3 do
        with_fx :distortion, distort: 0.1 do
          sample :bd_haus, amp: 1.0 + (intensity * 0.05), cutoff: get[:web_cutoff] + 30
        end
      end
    end

    sleep 0.25
    set :kick_trigger, 0
  else
    # When stopped, check frequently for play command
    sleep 0.1
  end
end

# ═══ SUB BASS WITH HARMONIC PROGRESSION ═══
live_loop :sub_bass do
  sync :arrangement_brain
  use_bpm get[:web_bpm]
  use_synth :sine

  next unless get[:playing]  # Only play if transport is active
  section = get[:section]
  next if section == :intro  # No bass in intro

  progression = get_chord_progression(get[:web_key], get[:web_scale], section)

  # Bass follows root of chord progression
  progression.each do |chord_notes|
    root_note = chord_notes[0] - 24  # Two octaves down

    # Sidechain simulation: duck bass on kick
    sidechain_amp = get[:kick_trigger] == 1 ? 0.3 : 0.7

    with_fx :lpf, cutoff: 70 do
      play root_note, attack: 0.05, sustain: 3.5, release: 0.5, amp: sidechain_amp
    end
    sleep 4
  end
end

# ═══ TB-303 ACID BASSLINE ═══
live_loop :acid_bass do
  sync :arrangement_brain
  use_bpm get[:web_bpm]
  use_synth :tb303

  next unless get[:playing]  # Only play if transport is active
  section = get[:section]
  next if section == :intro or section == :breakdown

  key = get[:web_key]
  scale_type = get[:web_scale]
  notes = (scale key, scale_type, num_octaves: 2)

  # Acid pattern with probability-based variation
  pattern = [0, 0, 3, 3, 5, 5, 7, 3].ring

  # Sidechain ducking
  sidechain_amp = get[:kick_trigger] == 1 ? 0.2 : 0.5

  with_fx :reverb, mix: get[:web_reverb] * 0.3 do
    with_fx :lpf, cutoff: get[:web_cutoff] do
      4.times do
        cutoff_val = one_in(3) ? rrand(70, 100) : rrand(50, 70)
        play notes[pattern.tick], release: 0.6, cutoff: cutoff_val,
             res: 0.7, amp: sidechain_amp
        sleep 0.5
      end
    end
  end
end

# ═══ LUSH PAD LAYERS ═══
live_loop :pad_foundation do
  sync :arrangement_brain
  use_bpm get[:web_bpm]
  use_synth :hollow

  next unless get[:playing]  # Only play if transport is active
  section = get[:section]
  progression = get_chord_progression(get[:web_key], get[:web_scale], section)
  evolution = get[:evolution]

  # LFO-driven filter automation
  lfo_cutoff = 60 + (30 * Math.sin(evolution * 0.1))

  # Sidechain ducking
  sidechain_amp = get[:kick_trigger] == 1 ? 0.15 : 0.3

  with_fx :reverb, room: 0.9, mix: get[:web_reverb] do
    with_fx :lpf, cutoff: lfo_cutoff do
      progression.each do |chord_notes|
        play_chord chord_notes, attack: 2, sustain: 2, release: 2,
                   amp: sidechain_amp, cutoff: get[:web_cutoff]
        sleep 4
      end
    end
  end
end

# ═══ PROPHET CHORD PROGRESSION ═══
live_loop :prophet_chords do
  sync :arrangement_brain
  use_bpm get[:web_bpm]
  use_synth :prophet

  next unless get[:playing]  # Only play if transport is active
  section = get[:section]
  intensity = get[:web_intensity]

  next if intensity < 3 or section == :intro

  progression = get_chord_progression(get[:web_key], get[:web_scale], section)

  # Sidechain ducking
  sidechain_amp = get[:kick_trigger] == 1 ? 0.15 : 0.35

  with_fx :reverb, mix: get[:web_reverb] do
    with_fx :echo, mix: get[:web_echo], phase: 0.75 do
      progression.each do |chord_notes|
        play_chord chord_notes, release: 3.5, cutoff: get[:web_cutoff],
                   amp: sidechain_amp, attack: 0.1
        sleep 4
      end
    end
  end
end

# ═══ MELODIC LEAD SYNTH ═══
live_loop :melodic_lead do
  sync :arrangement_brain
  use_bpm get[:web_bpm]
  use_synth :saw

  next unless get[:playing]  # Only play if transport is active
  section = get[:section]
  intensity = get[:web_intensity]
  evolution = get[:evolution]

  next if intensity < 5
  next if section == :intro or section == :breakdown

  key = get[:web_key]
  scale_type = get[:web_scale]
  notes = (scale key, scale_type, num_octaves: 3)

  # Musical phrases that evolve based on section
  phrase = if section == :drop
    [12, 14, 15, 14, 12, 10, 12, 14].ring
  elsif section == :build
    [7, 9, 10, 9, 7, 5, 7, 9].ring
  else
    [10, 12, 14, 12, 10, 9, 10, 12].ring
  end

  with_fx :reverb, mix: get[:web_reverb] do
    with_fx :echo, mix: get[:web_echo] * 1.5, phase: 0.375 do
      with_fx :lpf, cutoff: get[:web_cutoff] + 20 do
        8.times do
          # Probability-based note selection
          note_idx = one_in(4) ? phrase.tick + [0, 2, -2].choose : phrase.look
          play notes[note_idx], release: 0.4, amp: 0.45, detune: 0.1
          sleep [0.5, 0.5, 0.25, 0.25].ring.look
        end
      end
    end
  end
end

# ═══ PLUCK SYNTH LAYER ═══
live_loop :pluck_texture do
  sync :arrangement_brain
  use_bpm get[:web_bpm]
  use_synth :pluck

  next unless get[:playing]  # Only play if transport is active
  section = get[:section]
  intensity = get[:web_intensity]

  next if intensity < 4

  key = get[:web_key]
  scale_type = get[:web_scale]
  notes = (scale key, scale_type, num_octaves: 3)

  with_fx :reverb, mix: get[:web_reverb] * 0.6 do
    16.times do
      if one_in(2)
        play notes.choose, release: 0.3, amp: 0.2
      end
      sleep 0.25
    end
  end
end

# ═══ BLADE ARPEGGIOS ═══
live_loop :blade_arps do
  sync :arrangement_brain
  use_bpm get[:web_bpm]
  use_synth :blade

  next unless get[:playing]  # Only play if transport is active
  section = get[:section]
  intensity = get[:web_intensity]

  next if intensity < 4

  key = get[:web_key]
  scale_type = get[:web_scale]
  notes = (scale key, scale_type, num_octaves: 4)
  pattern = [0, 4, 7, 9, 12, 9, 7, 4].ring

  with_fx :echo, mix: get[:web_echo] * 0.8, phase: 0.25 do
    with_fx :hpf, cutoff: 80 do
      16.times do
        # Probability-based note selection
        note_idx = one_in(3) ? pattern.tick + [0, 2, -2].choose : pattern.look
        play notes[note_idx + 12], release: 0.2, amp: 0.25
        sleep 0.25
      end
    end
  end
end

# ═══ SNARE DRUM WITH FILLS ═══
live_loop :snare_master do
  sync :arrangement_brain
  use_bpm get[:web_bpm]

  next unless get[:playing]  # Only play if transport is active
  section = get[:section]
  intensity = get[:web_intensity]
  bar_count = get[:bar_count]

  # Section-aware snare patterns
  pattern = if section == :intro
    [0,0,0,0].ring
  elsif section == :build
    [0,0,1,0].ring
  elsif section == :drop
    [0,0,1,0].ring  # Classic backbeat
  elsif section == :breakdown
    [0,0,0,0,0,0,1,0].ring  # Sparse
  else
    [0,0,1,0].ring
  end

  # Drum fill on section changes (every 16 bars)
  if bar_count % 16 == 15
    4.times do |i|
      sample :sn_dolf, amp: 0.6 + (i * 0.1), rate: 1 + (i * 0.05)
      sleep 0.25
    end
  else
    if pattern.tick == 1
      with_fx :reverb, mix: get[:web_reverb] * 0.4 do
        sample :sn_dolf, amp: 0.7, cutoff: get[:web_cutoff]
      end
    end
    sleep 0.25
  end
end

# ═══ CLAP LAYER ═══
live_loop :clap_layer do
  sync :arrangement_brain
  use_bpm get[:web_bpm]

  next unless get[:playing]  # Only play if transport is active
  section = get[:section]
  intensity = get[:web_intensity]

  next if intensity < 3
  next if section == :intro or section == :breakdown

  pattern = [0,0,1,0].ring

  if pattern.tick == 1
    with_fx :reverb, mix: get[:web_reverb] * 0.5 do
      sample :perc_snap, amp: 0.4
    end
  end
  sleep 0.25
end

# ═══ HI-HAT GROOVE ═══
live_loop :hihat_groove do
  sync :arrangement_brain
  use_bpm get[:web_bpm]

  next unless get[:playing]  # Only play if transport is active
  section = get[:section]
  intensity = get[:web_intensity]

  next if section == :intro

  # Groove pattern with probability
  8.times do
    if one_in(8)
      # Occasional skip for groove
      sleep 0.125
    else
      amp_val = one_in(2) ? 0.3 : 0.2  # Velocity variation
      sample :drum_cymbal_closed, amp: amp_val, rate: 1.1
      sleep 0.125
    end
  end
end

# ═══ OPEN HI-HAT ACCENTS ═══
live_loop :open_hat do
  sync :arrangement_brain
  use_bpm get[:web_bpm]

  next unless get[:playing]  # Only play if transport is active
  section = get[:section]
  intensity = get[:web_intensity]

  next if intensity < 4
  next if section == :intro

  pattern = [0,0,0,0,0,0,1,0].ring

  if pattern.tick == 1
    sample :drum_cymbal_open, amp: 0.35, rate: 1.0, sustain: 0.3, release: 0.3
  end
  sleep 0.25
end

# ═══ CRASH CYMBALS ═══
live_loop :crash_transitions do
  sync :arrangement_brain
  use_bpm get[:web_bpm]

  next unless get[:playing]  # Only play if transport is active
  bar_count = get[:bar_count]
  section = get[:section]

  # Crash on section changes (every 16 bars)
  if bar_count % 16 == 0 and section != :intro
    with_fx :reverb, room: 0.8, mix: 0.6 do
      sample :drum_splash_hard, amp: 0.6, rate: 0.9
    end
  end

  sleep 4
end

# ═══ FX SWEEPS AND RISERS ═══
live_loop :fx_sweeps do
  sync :arrangement_brain
  use_bpm get[:web_bpm]

  next unless get[:playing]  # Only play if transport is active
  section = get[:section]
  bar_count = get[:bar_count]
  intensity = get[:web_intensity]

  # Riser before drops (bars 14-16 of each section)
  if (bar_count % 16) >= 14 and section == :build
    use_synth :noise
    with_fx :hpf, cutoff: 60, cutoff_slide: 8 do |fx|
      with_fx :reverb, mix: 0.7 do
        n = play 60, amp: 0, amp_slide: 8, sustain: 8, release: 0
        control n, amp: 0.4
        control fx, cutoff: 120
      end
    end
    sleep 8
  elsif intensity > 6 and one_in(4)
    # Occasional sweep
    use_synth :prophet
    with_fx :lpf, cutoff: 50, cutoff_slide: 2 do |fx|
      with_fx :echo, mix: get[:web_echo] do
        play 36, amp: 0.3, sustain: 2, release: 0
        control fx, cutoff: 110
      end
    end
    sleep 2
  else
    sleep 4
  end
end

# ═══ AMBIENT TEXTURE LAYER ═══
live_loop :ambient_texture do
  sync :arrangement_brain
  use_bpm get[:web_bpm]
  use_synth :dark_ambience

  next unless get[:playing]  # Only play if transport is active
  section = get[:section]
  intensity = get[:web_intensity]
  evolution = get[:evolution]

  next if intensity > 8  # Less ambient during high intensity

  key = get[:web_key]
  scale_type = get[:web_scale]
  notes = (scale key, scale_type, num_octaves: 2)

  # Slow evolving ambient notes
  with_fx :reverb, room: 1.0, mix: 0.9 do
    with_fx :echo, mix: get[:web_echo] * 0.5, phase: 1.5 do
      play notes.choose, attack: 4, sustain: 8, release: 4, amp: 0.15
      sleep 16
    end
  end
end

# ═══ ATMOSPHERIC PAD SWELLS ═══
live_loop :pad_swells do
  sync :arrangement_brain
  use_bpm get[:web_bpm]
  use_synth :blade

  next unless get[:playing]  # Only play if transport is active
  section = get[:section]

  next if section == :drop  # No swells during drop

  key = get[:web_key]
  chord_notes = chord(note(key), :minor7)

  with_fx :reverb, room: 0.95, mix: 0.8 do
    with_fx :lpf, cutoff: get[:web_cutoff] - 20 do
      play_chord chord_notes, attack: 6, sustain: 4, release: 6, amp: 0.2
      sleep 16
    end
  end
end



