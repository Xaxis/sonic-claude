# ═══════════════════════════════════════════════════════════════════════════════
# "Celestial Pulse" - Evolving Ambient EDM Masterpiece
# ═══════════════════════════════════════════════════════════════════════════════
# A dynamic journey: ambient textures meet driving beats and catchy hooks
# The track evolves through phases, building intensity over time
# Copy this entire file into Sonic Pi and press Run
# ═══════════════════════════════════════════════════════════════════════════════

use_bpm 128

# Global intensity control - track evolves over time
set :intensity, 0
set :drop_active, false

# ─────────────────────────────────────────────────────────────────────────────
# EVOLUTION CONTROLLER - Builds intensity over time
# ─────────────────────────────────────────────────────────────────────────────
live_loop :evolution do
  intensity = get[:intensity]
  if intensity < 10
    set :intensity, intensity + 1
  end
  if intensity == 6
    set :drop_active, true
  end
  sleep 16
end

# ─────────────────────────────────────────────────────────────────────────────
# AMBIENT FOUNDATION - Vast, evolving pad
# ─────────────────────────────────────────────────────────────────────────────
live_loop :cosmos do
  with_fx :reverb, room: 0.95, mix: 0.75, damp: 0.7 do
    with_fx :lpf, cutoff: 70 + (get[:intensity] * 3), cutoff_slide: 4 do
      use_synth :hollow
      play chord(:Fs3, :minor7), attack: 6, sustain: 6, release: 4, amp: 0.35
      sleep 16
    end
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# PUNCHY KICK - Driving four-on-the-floor
# ─────────────────────────────────────────────────────────────────────────────
live_loop :kick do
  sync :cosmos
  intensity = get[:intensity]
  
  with_fx :lpf, cutoff: 110 do
    with_fx :compressor, threshold: 0.3 do
      amp_val = 0.5 + (intensity * 0.05)
      sample :bd_tek, amp: amp_val.clamp(0.5, 0.95), rate: 1.02
      sleep 1
    end
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# CATCHY BASSLINE - Infectious groove
# ─────────────────────────────────────────────────────────────────────────────
live_loop :bass_groove do
  sync :kick
  
  use_synth :tb303
  with_fx :distortion, distort: 0.1, mix: 0.2 do
    with_fx :lpf, cutoff: 80 do
      # Catchy syncopated pattern
      pattern = (ring 1, 0, 0.5, 0, 1, 0, 0.5, 0.5)
      notes = (ring :Fs1, :Fs1, :A1, :A1, :E1, :E1, :B1, :Fs1)
      
      8.times do |i|
        if pattern[i] > 0
          play notes[i], amp: 0.55 * pattern[i], release: 0.2, cutoff: 75, wave: 1
        end
        sleep 0.5
      end
    end
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# CRISP HATS - Driving rhythm
# ─────────────────────────────────────────────────────────────────────────────
live_loop :hats_groove do
  sync :kick
  
  with_fx :hpf, cutoff: 115 do
    with_fx :reverb, room: 0.25, mix: 0.15 do
      16.times do
        amp_val = (tick % 2 == 1) ? rrand(0.25, 0.4) : rrand(0.1, 0.18)
        sample :drum_cymbal_closed, amp: amp_val, rate: rrand(2.0, 2.15)
        sleep 0.25
      end
    end
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# SNARE/CLAP - Punchy backbeat
# ─────────────────────────────────────────────────────────────────────────────
live_loop :backbeat do
  sync :kick
  sleep 1
  with_fx :reverb, room: 0.5, mix: 0.3 do
    sample :sn_dolf, amp: 0.5, rate: 1.05
    sample :drum_snare_soft, amp: 0.25, rate: 1.1
  end
  sleep 1
end

# ─────────────────────────────────────────────────────────────────────────────
# CATCHY LEAD HOOK - The memorable melody
# ─────────────────────────────────────────────────────────────────────────────
live_loop :lead_hook do
  sync :kick
  
  if get[:intensity] >= 3
    with_fx :reverb, room: 0.6, mix: 0.4 do
      with_fx :echo, phase: 0.375, decay: 3, mix: 0.3 do
        use_synth :saw
        
        # Catchy, memorable hook
        hook = (ring
          [:Fs4, 0.5], [:A4, 0.25], [:B4, 0.25], [:Cs5, 0.5], [:B4, 0.5],
          [:A4, 0.5], [:Fs4, 0.25], [:E4, 0.25], [:Fs4, 1]
        )
        
        hook.each do |note, dur|
          play note, amp: 0.28, attack: 0.02, release: dur * 0.8, 
               cutoff: rrand(90, 110), detune: 0.12
          sleep dur
        end
      end
    end
  else
    sleep 4
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# SHIMMERING ARPS - Ethereal texture
# ─────────────────────────────────────────────────────────────────────────────
live_loop :shimmer_arp do
  sync :kick

  with_fx :reverb, room: 0.85, mix: 0.6 do
    with_fx :echo, phase: 0.1875, decay: 4, mix: 0.4 do
      use_synth :blade

      arp = scale(:Fs4, :minor_pentatonic, num_octaves: 2).shuffle

      16.times do
        play arp.tick, amp: rrand(0.08, 0.16), attack: 0.01,
             release: rrand(0.3, 0.6), cutoff: rrand(85, 115)
        sleep 0.25
      end
    end
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# PROPHET CHORDS - Warm harmonic progression
# ─────────────────────────────────────────────────────────────────────────────
live_loop :warm_chords do
  sync :kick

  if get[:intensity] >= 2
    with_fx :reverb, room: 0.8, mix: 0.55 do
      with_fx :lpf, cutoff: 85 + (get[:intensity] * 2) do
        use_synth :prophet

        progression = (ring
          chord(:Fs3, :minor),
          chord(:D3, :major),
          chord(:A3, :major),
          chord(:E3, :major)
        )

        play progression.tick, attack: 0.5, sustain: 3, release: 0.5,
             amp: 0.22, cutoff: 95
        sleep 4
      end
    end
  else
    sleep 4
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# PLUCK ACCENTS - Rhythmic sparkle
# ─────────────────────────────────────────────────────────────────────────────
live_loop :pluck_accents do
  sync :kick

  if get[:intensity] >= 4
    with_fx :reverb, room: 0.6, mix: 0.4 do
      with_fx :echo, phase: 0.25, decay: 2, mix: 0.25 do
        use_synth :pluck

        accents = (ring :Fs5, :Cs5, :A4, :E5, :B4, :Fs5, :Cs5, :A4)
        rhythm = (ring 0.5, 0.25, 0.25, 0.5, 0.5, 0.5, 0.25, 0.25)

        8.times do |i|
          if one_in(3)
            play accents[i], amp: rrand(0.18, 0.28), release: 0.8
          end
          sleep rhythm[i]
        end
      end
    end
  else
    sleep 3
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# PERCUSSION FILLS - Organic groove elements
# ─────────────────────────────────────────────────────────────────────────────
live_loop :perc_groove do
  sync :kick

  with_fx :reverb, room: 0.5, mix: 0.35 do
    8.times do
      if one_in(3)
        sample :perc_snap, amp: 0.22, rate: rrand(0.95, 1.1)
      end
      if one_in(5)
        sample :elec_ping, amp: 0.12, rate: rrand(1.5, 2.2)
      end
      if one_in(8)
        sample :elec_blip2, amp: 0.1, rate: rrand(1.2, 1.8)
      end
      sleep 0.5
    end
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# OPEN HAT GROOVE - Adds swing and energy
# ─────────────────────────────────────────────────────────────────────────────
live_loop :open_hats do
  sync :kick

  with_fx :hpf, cutoff: 100 do
    with_fx :reverb, room: 0.4, mix: 0.3 do
      pattern = (ring 0, 0, 0, 1, 0, 0, 1, 0)
      8.times do |i|
        if pattern[i] == 1
          sample :drum_cymbal_open, amp: 0.18, rate: 2.1, finish: 0.12
        end
        sleep 0.5
      end
    end
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# RISING TENSION - Filter sweeps for builds
# ─────────────────────────────────────────────────────────────────────────────
live_loop :tension_build do
  sync :kick
  sleep 28

  if get[:intensity] >= 5
    with_fx :reverb, room: 0.7, mix: 0.5 do
      with_fx :lpf, cutoff: 40, cutoff_slide: 4 do |f|
        use_synth :dsaw
        control f, cutoff: 130
        play :Fs2, attack: 0.3, sustain: 3.2, release: 0.5, amp: 0.35, detune: 0.15
        sleep 4
      end
    end
  else
    sleep 4
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# AMBIENT SWELLS - Emotional depth
# ─────────────────────────────────────────────────────────────────────────────
live_loop :ambient_swell do
  sync :kick
  sleep 12

  with_fx :reverb, room: 1, mix: 0.8 do
    with_fx :lpf, cutoff: 65, cutoff_slide: 6 do |f|
      use_synth :dark_ambience
      control f, cutoff: 95
      play :Fs3, attack: 4, sustain: 2, release: 2, amp: 0.12
      sleep 8
    end
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# SUB BASS PULSE - Deep low end
# ─────────────────────────────────────────────────────────────────────────────
live_loop :sub_pulse do
  sync :kick

  use_synth :sine
  with_fx :lpf, cutoff: 50 do
    play :Fs1, attack: 0.05, sustain: 0.3, release: 0.15, amp: 0.55
    sleep 1
  end
end

# ─────────────────────────────────────────────────────────────────────────────
# VOCAL CHOP TEXTURE - Ethereal human element
# ─────────────────────────────────────────────────────────────────────────────
live_loop :vocal_texture do
  sync :kick

  if get[:intensity] >= 4
    with_fx :reverb, room: 0.9, mix: 0.7 do
      with_fx :echo, phase: 0.5, decay: 4, mix: 0.4 do
        with_fx :lpf, cutoff: 90 do
          if one_in(4)
            sample :ambi_choir, amp: 0.12, rate: rrand(0.8, 1.2),
                   start: rrand(0, 0.5), finish: rrand(0.5, 0.8)
          end
        end
      end
    end
  end
  sleep 4
end

