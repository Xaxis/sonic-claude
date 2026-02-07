# ═══════════════════════════════════════════════════════════════════════════════
# "Ethereal Dawn" - Ambient Melodic Electronic
# ═══════════════════════════════════════════════════════════════════════════════
# A more minimal, introspective piece in the style of Two Lanes / Lane 8
# Features: Delicate piano, vast reverbs, gentle pulses, emotional builds
# Copy this entire file into Sonic Pi and press Run
# ═══════════════════════════════════════════════════════════════════════════════

use_bpm 110

# ─────────────────────────────────────────────────────────────────────────────
# VAST AMBIENT FOUNDATION
# ─────────────────────────────────────────────────────────────────────────────
live_loop :vast_space do
  with_fx :reverb, room: 1, mix: 0.85, damp: 0.8 do
    with_fx :lpf, cutoff: 75 do
      use_synth :hollow
      play_chord [:E2, :B2, :E3], attack: 8, sustain: 8, release: 8, amp: 0.3
      sleep 24
    end
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# DELICATE PIANO - Sparse, emotional phrases
# ─────────────────────────────────────────────────────────────────────────────
live_loop :piano_whispers do
  sync :vast_space
  sleep 4
  
  with_fx :reverb, room: 0.9, mix: 0.6 do
    with_fx :echo, phase: 0.5, decay: 8, mix: 0.35 do
      use_synth :piano
      
      phrases = [
        [:E4, :G4, :B4, :E5],
        [:D4, :Fs4, :A4, :D5],
        [:C4, :E4, :G4, :B4],
        [:B3, :Ds4, :Fs4, :B4]
      ]
      
      phrase = phrases.choose
      phrase.each do |note|
        play note, amp: rrand(0.25, 0.4), attack: 0.01, release: rrand(2, 4)
        sleep rrand(0.75, 1.5)
      end
      sleep rrand(4, 8)
    end
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# GENTLE PULSE - Subtle rhythmic foundation
# ─────────────────────────────────────────────────────────────────────────────
live_loop :gentle_pulse do
  sync :vast_space
  sleep 16
  
  with_fx :reverb, room: 0.6, mix: 0.4 do
    with_fx :lpf, cutoff: 90 do
      sample :bd_haus, amp: 0.4, rate: 0.9
      sleep 2
      sample :bd_haus, amp: 0.3, rate: 0.85
      sleep 2
    end
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# SHIMMERING TEXTURE - High frequency sparkle
# ─────────────────────────────────────────────────────────────────────────────
live_loop :shimmer do
  sync :vast_space
  sleep 8
  
  with_fx :reverb, room: 0.95, mix: 0.7 do
    with_fx :echo, phase: 0.375, decay: 6, mix: 0.5 do
      use_synth :blade
      
      notes = scale(:E5, :major_pentatonic)
      8.times do
        play notes.choose, amp: rrand(0.05, 0.12), attack: 0.01, 
             release: rrand(1, 3), cutoff: rrand(80, 110)
        sleep rrand(0.5, 2)
      end
    end
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# WARM SUB - Deep, gentle bass
# ─────────────────────────────────────────────────────────────────────────────
live_loop :warm_sub do
  sync :vast_space
  
  use_synth :sine
  with_fx :lpf, cutoff: 55 do
    bass = (ring :E1, :E1, :D1, :B0)
    play bass.tick, attack: 1, sustain: 4, release: 1, amp: 0.5
    sleep 6
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# PROPHET SWELL - Emotional crescendos
# ─────────────────────────────────────────────────────────────────────────────
live_loop :emotional_swell do
  sync :vast_space
  sleep 12
  
  with_fx :reverb, room: 0.95, mix: 0.75 do
    with_fx :lpf, cutoff: 60, cutoff_slide: 10 do |f|
      use_synth :prophet
      control f, cutoff: 100
      play_chord [:E3, :B3, :E4, :Gs4], attack: 8, sustain: 2, release: 2, amp: 0.2
      sleep 12
    end
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# SOFT PERCUSSION - Organic textures
# ─────────────────────────────────────────────────────────────────────────────
live_loop :soft_perc do
  sync :gentle_pulse
  
  with_fx :reverb, room: 0.8, mix: 0.6 do
    if one_in(3)
      sample :perc_bell, amp: 0.08, rate: rrand(1.5, 2.5)
    end
    if one_in(5)
      sample :ambi_glass_rub, amp: 0.05, rate: rrand(0.8, 1.2)
    end
    sleep 1
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# DISTANT CHOIR - Ethereal vocal texture
# ─────────────────────────────────────────────────────────────────────────────
live_loop :distant_voices do
  sync :vast_space
  sleep 20
  
  with_fx :reverb, room: 1, mix: 0.9 do
    with_fx :lpf, cutoff: 70 do
      sample :ambi_choir, amp: 0.15, rate: 0.5
      sleep 4
    end
  end
end

