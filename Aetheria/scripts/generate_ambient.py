import numpy as np
import subprocess
import wave
import os

SAMPLE_RATE = 44100
DURATION = 72.0  # 72 seconds
N_SAMPLES = int(SAMPLE_RATE * DURATION)
t = np.linspace(0, DURATION, N_SAMPLES, endpoint=False)

left = np.zeros(N_SAMPLES, dtype=np.float64)
right = np.zeros(N_SAMPLES, dtype=np.float64)

# Chord progression in D minor / Space ambient:
# Dm9 -> Bbmaj7 -> Fmaj7 -> Gm9 -> Csus2 -> Dm(add9)
CHORDS = [
    [73.42, 110.0, 174.61, 220.0, 261.63, 329.63],      # Dm9
    [58.27, 87.31, 146.83, 220.0, 293.66, 349.23],      # Bbmaj7
    [87.31, 130.81, 220.0, 261.63, 329.63, 440.0],     # Fmaj7
    [98.0, 146.83, 233.08, 293.66, 349.23, 440.0],      # Gm9
    [65.41, 98.0, 164.81, 196.0, 293.66, 392.0],       # Csus2
    [73.42, 110.0, 174.61, 261.63, 329.63, 440.0],     # Dm(add9)
]

CHORD_DUR = DURATION / len(CHORDS)  # 12.0s
OVERLAP = 4.0

for c_idx, chord in enumerate(CHORDS):
    start_t = c_idx * CHORD_DUR
    chord_len = CHORD_DUR + OVERLAP
    n_chord = int(chord_len * SAMPLE_RATE)
    local_t = np.linspace(0, chord_len, n_chord, endpoint=False)
    
    # Smooth cosine envelope
    env = np.ones(n_chord, dtype=np.float64)
    attack_n = int(3.5 * SAMPLE_RATE)
    env[:attack_n] = 0.5 * (1.0 - np.cos(np.pi * local_t[:attack_n] / 3.5))
    
    release_n = int(OVERLAP * SAMPLE_RATE)
    rel_start = n_chord - release_n
    env[rel_start:] = 0.5 * (1.0 + np.cos(np.pi * (local_t[rel_start:] - CHORD_DUR) / OVERLAP))
    
    # Breathing LFO
    lfo = 1.0 + 0.12 * np.sin(2.0 * np.pi * 0.15 * local_t)
    
    c_left = np.zeros(n_chord, dtype=np.float64)
    c_right = np.zeros(n_chord, dtype=np.float64)
    
    for n_idx, freq in enumerate(chord):
        weight = 1.0 / (1.0 + n_idx * 0.28)
        detune = 0.45 * (n_idx - 2.5) / 6.0
        f_l = freq * (1.0 + detune * 0.003)
        f_r = freq * (1.0 - detune * 0.003)
        
        # Warm analog harmonics
        sig_l = np.sin(2.0 * np.pi * f_l * local_t) + \
                0.28 * np.sin(4.0 * np.pi * f_l * local_t + 0.5) + \
                0.12 * np.sin(6.0 * np.pi * f_l * local_t + 1.0)
        sig_r = np.sin(2.0 * np.pi * f_r * local_t) + \
                0.28 * np.sin(4.0 * np.pi * f_r * local_t + 0.5) + \
                0.12 * np.sin(6.0 * np.pi * f_r * local_t + 1.0)
                
        pan = -0.3 + 0.6 * (n_idx / max(1, len(chord) - 1))
        c_left += sig_l * weight * (0.5 - 0.5 * pan)
        c_right += sig_r * weight * (0.5 + 0.5 * pan)
        
    chord_sig_l = c_left * env * lfo * 0.048
    chord_sig_r = c_right * env * lfo * 0.048
    
    start_sample = int(start_t * SAMPLE_RATE)
    indices = (start_sample + np.arange(n_chord)) % N_SAMPLES
    np.add.at(left, indices, chord_sig_l)
    np.add.at(right, indices, chord_sig_r)

# Cosmic breath / space texture
rng = np.random.default_rng(1337)
raw_noise = rng.normal(0, 0.25, N_SAMPLES)
# Smooth rolling average for pink/soft noise
k = 32
pad_noise = np.pad(raw_noise, (k, 0), mode='wrap')
soft_noise = np.convolve(pad_noise, np.ones(k)/k, mode='valid')[:N_SAMPLES]

wind_breath = 0.5 + 0.5 * np.sin(2.0 * np.pi * 0.045 * t)
wind_pan = 0.5 + 0.3 * np.sin(2.0 * np.pi * 0.03 * t)
left += soft_noise * 0.015 * wind_breath * (1.0 - wind_pan)
right += soft_noise * 0.015 * wind_breath * wind_pan

# Celestial chimes with stereo delay
CHIME_EVENTS = [
    (3.5, 523.25, -0.4), (7.0, 659.25, 0.4), (10.2, 783.99, -0.2),
    (15.0, 587.33, 0.5), (19.5, 523.25, -0.5), (22.8, 880.0, 0.3),
    (27.0, 659.25, -0.3), (31.5, 783.99, 0.4), (34.2, 587.33, -0.4),
    (39.0, 523.25, 0.2), (43.5, 659.25, -0.5), (46.8, 880.0, 0.5),
    (51.0, 783.99, -0.3), (55.5, 659.25, 0.4), (58.2, 587.33, -0.2),
    (63.0, 523.25, 0.3), (67.5, 659.25, -0.4), (70.2, 440.0, 0.2),
]

for ev_time, freq, pan in CHIME_EVENTS:
    bell_dur = 4.5
    n_bell = int(bell_dur * SAMPLE_RATE)
    bt = np.linspace(0, bell_dur, n_bell, endpoint=False)
    bell_env = np.exp(-bt * 1.6)
    bell_sig = (
        np.sin(2.0 * np.pi * freq * bt) * 0.7 +
        np.sin(2.0 * np.pi * (freq * 2.76) * bt) * 0.22 +
        np.sin(2.0 * np.pi * (freq * 2.0) * bt) * 0.15
    )
    amp = 0.026 * bell_env
    
    start_sample = int(ev_time * SAMPLE_RATE)
    indices = (start_sample + np.arange(n_bell)) % N_SAMPLES
    np.add.at(left, indices, bell_sig * amp * (0.5 - 0.5 * pan))
    np.add.at(right, indices, bell_sig * amp * (0.5 + 0.5 * pan))
    
    # Delay echo (0.35s later, opposite pan)
    delay_sample = (start_sample + int(0.35 * SAMPLE_RATE)) % N_SAMPLES
    echo_indices = (delay_sample + np.arange(n_bell)) % N_SAMPLES
    np.add.at(left, echo_indices, bell_sig * amp * 0.35 * (0.5 + 0.5 * pan))
    np.add.at(right, echo_indices, bell_sig * amp * 0.35 * (0.5 - 0.5 * pan))

# Soft limiter / saturation
max_val = max(np.max(np.abs(left)), np.max(np.abs(right)))
if max_val > 0:
    left = np.tanh(left / max_val * 0.88)
    right = np.tanh(right / max_val * 0.88)

# Convert to 16-bit PCM WAV
left_i16 = (left * 32767).astype(np.int16)
right_i16 = (right * 32767).astype(np.int16)
interleaved = np.empty((N_SAMPLES * 2,), dtype=np.int16)
interleaved[0::2] = left_i16
interleaved[1::2] = right_i16

wav_path = r"c:\Dev\Resume\Aetheria\public\audio_temp.wav"
mp3_dir = r"c:\Dev\Resume\Aetheria\public\audio"
os.makedirs(mp3_dir, exist_ok=True)
mp3_path = os.path.join(mp3_dir, "aetheria-ambient.mp3")

with wave.open(wav_path, "wb") as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(SAMPLE_RATE)
    wf.writeframes(interleaved.tobytes())

# Encode to MP3 128k
subprocess.run([
    "ffmpeg", "-y", "-i", wav_path,
    "-codec:a", "libmp3lame", "-b:a", "128k",
    mp3_path
], check=True)

if os.path.exists(wav_path):
    os.remove(wav_path)

print(f"Generated {mp3_path}. Size: {os.path.getsize(mp3_path)} bytes")
