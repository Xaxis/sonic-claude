# ═══════════════════════════════════════════════════════════════════════════════
# "Midnight Horizons" - A Two Lanes Inspired Melodic Electronic Piece
# ═══════════════════════════════════════════════════════════════════════════════
# Inspired by the atmospheric, emotional sound of Two Lanes
# Features: Lush pads, piano melodies, minimal beats, evolving textures
# Copy this entire file into Sonic Pi and press Run
# ═══════════════════════════════════════════════════════════════════════════════

use_bpm 118

# Key: D minor - emotional and atmospheric
root = :D3
scale_type = :minor

# ─────────────────────────────────────────────────────────────────────────────
# ATMOSPHERIC PAD - The foundation, warm and evolving
# ─────────────────────────────────────────────────────────────────────────────
live_loop :atmosphere do
  with_fx :reverb, room: 0.9, mix: 0.7 do
    with_fx :lpf, cutoff: 85, cutoff_slide: 4 do |lpf|
      control lpf, cutoff: rrand(70, 95)
      use_synth :hollow
      play chord(root, :minor7), attack: 4, sustain: 6, release: 6, amp: 0.4
      sleep 16
    end
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# DEEP SUB BASS - Warm, subtle low end
# ─────────────────────────────────────────────────────────────────────────────
live_loop :sub_bass do
  sync :atmosphere
  use_synth :sine
  with_fx :lpf, cutoff: 60 do
    bass_notes = (ring :D2, :D2, :A1, :F2)
    play bass_notes.tick, attack: 0.5, sustain: 3, release: 0.5, amp: 0.6
    sleep 4
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# PIANO MELODY - Emotional, sparse, Two Lanes signature
# ─────────────────────────────────────────────────────────────────────────────
live_loop :piano_melody do
  sync :atmosphere
  sleep 8  # Let atmosphere breathe first
  
  with_fx :reverb, room: 0.8, mix: 0.5 do
    with_fx :echo, phase: 0.375, decay: 4, mix: 0.3 do
      use_synth :piano
      
      # Emotional melodic phrases
      melody = (ring
        [:D5, :F5, :A5],
        [:C5, :E5, :G5],
        [:Bb4, :D5, :F5],
        [:A4, :C5, :E5]
      )
      
      4.times do
        notes = melody.tick
        notes.each do |n|
          play n, amp: rrand(0.3, 0.5), attack: 0.01, sustain: rrand(0.3, 0.6), release: rrand(1, 2)
          sleep [0.5, 0.25, 0.75].choose
        end
        sleep rrand(1, 2)
      end
    end
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# ARPEGGIATED SYNTH - Shimmering, evolving texture
# ─────────────────────────────────────────────────────────────────────────────
live_loop :arp_shimmer do
  sync :atmosphere
  sleep 16  # Enter after buildup
  
  with_fx :reverb, room: 0.85, mix: 0.6 do
    with_fx :echo, phase: 0.25, decay: 6, mix: 0.4 do
      use_synth :blade
      
      arp_notes = scale(:D4, :minor_pentatonic, num_octaves: 2)
      
      32.times do
        play arp_notes.choose, amp: rrand(0.1, 0.25), attack: 0.02, release: rrand(0.3, 0.8),
             cutoff: rrand(70, 100)
        sleep [0.25, 0.5, 0.125].choose
      end
    end
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# MINIMAL BEAT - Soft, driving, not overpowering
# ─────────────────────────────────────────────────────────────────────────────
live_loop :beat do
  sync :atmosphere
  sleep 32  # Drums enter later for buildup
  
  with_fx :reverb, room: 0.3, mix: 0.2 do
    with_fx :lpf, cutoff: 110 do
      # Kick pattern - four on the floor but soft
      sample :bd_haus, amp: 0.7, rate: 0.95
      sleep 1
    end
  end
end

live_loop :hats do
  sync :beat
  
  with_fx :hpf, cutoff: 100 do
    with_fx :reverb, room: 0.4, mix: 0.3 do
      # Offbeat hi-hats
      sleep 0.5
      sample :drum_cymbal_closed, amp: rrand(0.15, 0.3), rate: rrand(1.8, 2.2)
      sleep 0.5
    end
  end
end

live_loop :perc_texture do
  sync :beat
  sleep 0.25
  
  with_fx :reverb, room: 0.7, mix: 0.5 do
    if one_in(4)
      sample :perc_snap, amp: 0.2, rate: rrand(0.9, 1.1)
    end
    if one_in(6)
      sample :elec_ping, amp: 0.1, rate: rrand(1.5, 2.5)
    end
    sleep 0.75
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# AMBIENT TEXTURE - Ethereal background movement
# ─────────────────────────────────────────────────────────────────────────────
live_loop :ambient_wash do
  sync :atmosphere
  
  with_fx :reverb, room: 1, mix: 0.8 do
    with_fx :slicer, phase: 0.5, mix: 0.3 do
      use_synth :dark_ambience
      play :D3, attack: 8, sustain: 4, release: 4, amp: 0.15, cutoff: rrand(60, 80)
      sleep 16
    end
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# RISING PAD - Creates emotional swells
# ─────────────────────────────────────────────────────────────────────────────
live_loop :swell do
  sync :atmosphere
  sleep 24
  
  with_fx :reverb, room: 0.9, mix: 0.7 do
    with_fx :lpf, cutoff: 70, cutoff_slide: 8 do |f|
      use_synth :prophet
      notes = chord(:D4, :minor9)
      control f, cutoff: 110
      play notes, attack: 6, sustain: 1, release: 1, amp: 0.25, cutoff: 90
      sleep 8
    end
  end
end

