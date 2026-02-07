# ═══════════════════════════════════════════════════════════════════════════════
# "Neon Drive" - Driving Melodic House
# ═══════════════════════════════════════════════════════════════════════════════
# An energetic melodic house track with progressive builds
# Inspired by Two Lanes, Rufus Du Sol, Lane 8
# Copy this entire file into Sonic Pi and press Run
# ═══════════════════════════════════════════════════════════════════════════════

use_bpm 124

# ─────────────────────────────────────────────────────────────────────────────
# DRIVING KICK - Four on the floor foundation
# ─────────────────────────────────────────────────────────────────────────────
live_loop :kick do
  with_fx :lpf, cutoff: 115 do
    sample :bd_haus, amp: 0.85, rate: 0.98
    sleep 1
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# OFFBEAT BASS - Pumping sidechain feel
# ─────────────────────────────────────────────────────────────────────────────
live_loop :bass_pump do
  sync :kick
  sleep 0.5
  
  use_synth :tb303
  with_fx :lpf, cutoff: 75 do
    play :A1, release: 0.3, amp: 0.6, cutoff: 70
    sleep 0.5
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# HI-HATS - Crisp rhythm
# ─────────────────────────────────────────────────────────────────────────────
live_loop :hats do
  sync :kick
  
  with_fx :hpf, cutoff: 110 do
    with_fx :reverb, room: 0.3, mix: 0.2 do
      sleep 0.5
      sample :drum_cymbal_closed, amp: rrand(0.2, 0.35), rate: rrand(1.9, 2.1)
      sleep 0.5
    end
  end
end

live_loop :open_hat do
  sync :kick
  sleep 3.5
  with_fx :reverb, room: 0.5, mix: 0.4 do
    sample :drum_cymbal_open, amp: 0.15, rate: 2, finish: 0.15
  end
  sleep 0.5
end

# ─────────────────────────────────────────────────────────────────────────────
# CLAP - On the 2 and 4
# ─────────────────────────────────────────────────────────────────────────────
live_loop :clap do
  sync :kick
  sleep 1
  with_fx :reverb, room: 0.6, mix: 0.35 do
    sample :sn_dub, amp: 0.4, rate: 1.1
  end
  sleep 1
end

# ─────────────────────────────────────────────────────────────────────────────
# MAIN SYNTH RIFF - Catchy melodic hook
# ─────────────────────────────────────────────────────────────────────────────
live_loop :main_riff do
  sync :kick
  
  with_fx :reverb, room: 0.7, mix: 0.4 do
    with_fx :echo, phase: 0.375, decay: 4, mix: 0.25 do
      use_synth :dsaw
      
      riff = (ring :A4, :E4, :A4, :C5, :A4, :E4, :G4, :E4)
      
      8.times do
        play riff.tick, amp: 0.25, attack: 0.02, release: 0.3, 
             cutoff: rrand(85, 105), detune: 0.1
        sleep 0.5
      end
    end
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# PAD LAYER - Warm harmonic bed
# ─────────────────────────────────────────────────────────────────────────────
live_loop :warm_pad do
  sync :kick
  
  with_fx :reverb, room: 0.85, mix: 0.6 do
    with_fx :lpf, cutoff: 90, cutoff_slide: 8 do |f|
      use_synth :prophet
      
      chords = (ring 
        chord(:A3, :minor),
        chord(:F3, :major),
        chord(:C3, :major),
        chord(:G3, :major)
      )
      
      control f, cutoff: rrand(80, 100)
      play chords.tick, attack: 2, sustain: 4, release: 2, amp: 0.2
      sleep 8
    end
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# PLUCK ARPS - Sparkling top layer
# ─────────────────────────────────────────────────────────────────────────────
live_loop :pluck_arp do
  sync :kick
  sleep 0.25
  
  with_fx :reverb, room: 0.7, mix: 0.5 do
    with_fx :echo, phase: 0.25, decay: 3, mix: 0.3 do
      use_synth :pluck
      
      notes = scale(:A4, :minor_pentatonic, num_octaves: 2)
      
      if one_in(2)
        play notes.choose, amp: rrand(0.15, 0.25), release: rrand(0.5, 1.5)
      end
      sleep 0.75
    end
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# RISING FILTER SWEEP - Build tension
# ─────────────────────────────────────────────────────────────────────────────
live_loop :filter_sweep do
  sync :kick
  sleep 28
  
  with_fx :reverb, room: 0.8, mix: 0.5 do
    with_fx :lpf, cutoff: 50, cutoff_slide: 4 do |f|
      use_synth :saw
      control f, cutoff: 120
      play :A2, attack: 0.5, sustain: 3, release: 0.5, amp: 0.3
      sleep 4
    end
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# PERC FILLS - Organic texture
# ─────────────────────────────────────────────────────────────────────────────
live_loop :perc_fills do
  sync :kick
  
  with_fx :reverb, room: 0.5, mix: 0.4 do
    sleep rrand(0.25, 0.75)
    if one_in(4)
      sample :perc_snap, amp: 0.2, rate: rrand(0.9, 1.2)
    end
    if one_in(6)
      sample :elec_blip, amp: 0.1, rate: rrand(1.2, 2)
    end
    sleep rrand(0.25, 0.75)
  end
end

