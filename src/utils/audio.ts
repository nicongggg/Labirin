/**
 * Procedural horror sound generator using the browser's Web Audio API.
 * Includes the iconic "Abdi Teh Ayeuna Gaduh Hiji Boneka" music box synthesizer,
 * jumpscare screams, and environmental audio cues.
 */

export interface SongLyricEvent {
  text: string;
  time: number;
}

class SoundController {
  private ctx: AudioContext | null = null;
  private ambientGain: GainNode | null = null;
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private isAmbientPlaying = false;
  private songTimeout: NodeJS.Timeout | null = null;
  private isSongPlaying = false;
  public volume = 0.85;
  private lyricListeners: ((lyric: string) => void)[] = [];

  public initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public onLyric(cb: (lyric: string) => void) {
    this.lyricListeners.push(cb);
  }

  private notifyLyric(lyric: string) {
    this.lyricListeners.forEach(cb => cb(lyric));
  }

  // Play button hover sound
  public playHoverSound() {
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.08 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio context may require click
    }
  }

  // Play start stinger
  public playStartSound() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      // Heavy sub-bass boom
      const boom = ctx.createOscillator();
      const boomGain = ctx.createGain();
      boom.type = 'sine';
      boom.frequency.setValueAtTime(130, now);
      boom.frequency.exponentialRampToValueAtTime(30, now + 1.2);
      boomGain.gain.setValueAtTime(0.45 * this.volume, now);
      boomGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      boom.connect(boomGain);
      boomGain.connect(ctx.destination);
      boom.start();
      boom.stop(now + 1.2);

      // Disharmonic metallic screech
      const screech = ctx.createOscillator();
      const screechGain = ctx.createGain();
      screech.type = 'sawtooth';
      screech.frequency.setValueAtTime(460, now);
      screech.frequency.exponentialRampToValueAtTime(120, now + 0.8);
      screechGain.gain.setValueAtTime(0.18 * this.volume, now);
      screechGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      screech.connect(screechGain);
      screechGain.connect(ctx.destination);
      screech.start();
      screech.stop(now + 0.8);
    } catch {
      // ignore
    }
  }

  // Heartbeat pulse effect
  public playHeartbeat() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      [0, 0.22].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(idx === 0 ? 58 : 50, now + delay);
        osc.frequency.exponentialRampToValueAtTime(30, now + delay + 0.15);
        gain.gain.setValueAtTime(0.35 * this.volume, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.15);
      });
    } catch {
      // ignore
    }
  }

  // Single eerie, echoing music box note
  private playMusicBoxNote(freq: number, startTime: number, duration = 1.2) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = startTime;

    // Primary crystalline tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // Overtone for authentic music box metallic bell ring
    const oscHarmonic = ctx.createOscillator();
    const gainHarmonic = ctx.createGain();
    oscHarmonic.type = 'sine';
    oscHarmonic.frequency.setValueAtTime(freq * 2.002, now);

    // Third harmonic sparkle
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(freq * 3.01, now);

    const baseVol = 0.22 * this.volume;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(baseVol, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    gainHarmonic.gain.setValueAtTime(0.0001, now);
    gainHarmonic.gain.linearRampToValueAtTime(baseVol * 0.5, now + 0.01);
    gainHarmonic.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.7);

    gain3.gain.setValueAtTime(0.0001, now);
    gain3.gain.linearRampToValueAtTime(baseVol * 0.25, now + 0.01);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.4);

    osc.connect(gain);
    oscHarmonic.connect(gainHarmonic);
    osc3.connect(gain3);

    gain.connect(ctx.destination);
    gainHarmonic.connect(ctx.destination);
    gain3.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
    oscHarmonic.start(now);
    oscHarmonic.stop(now + duration * 0.7);
    osc3.start(now);
    osc3.stop(now + duration * 0.4);
  }

  /**
   * CINEMATIC SUSPENSE HORROR SOUNDTRACK (Lagu Serem Bikin Deg-Degan)
   * Deep visceral heartbeat bass thumps, dark droning strings, dissonant eerie chimes,
   * and psychological tension swells that trigger racing pulses and dread.
   */
  private tensionLoopTimeout: NodeJS.Timeout | null = null;
  public tensionLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'PANIC' = 'LOW';

  public setTensionLevel(level: 'LOW' | 'MEDIUM' | 'HIGH' | 'PANIC') {
    this.tensionLevel = level;
  }

  // Deep visceral sub-bass heartbeat pulse (Thump-Thump)
  private playDeepHeartbeatPulse(time: number, isDouble = true, volumeMultiplier = 1.0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const vol = this.volume * volumeMultiplier * (this.tensionLevel === 'PANIC' ? 1.5 : this.tensionLevel === 'HIGH' ? 1.25 : 1.0);

    // First deep thud
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(58, time);
    osc1.frequency.exponentialRampToValueAtTime(28, time + 0.18);

    gain1.gain.setValueAtTime(0.001, time);
    gain1.gain.linearRampToValueAtTime(0.45 * vol, time + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(time);
    osc1.stop(time + 0.22);

    if (isDouble) {
      // Second trailing thump (lub-DUB)
      const t2 = time + 0.2;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(50, t2);
      osc2.frequency.exponentialRampToValueAtTime(24, t2 + 0.22);

      gain2.gain.setValueAtTime(0.001, t2);
      gain2.gain.linearRampToValueAtTime(0.55 * vol, t2 + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.26);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t2);
      osc2.stop(t2 + 0.26);
    }
  }

  // Dissonant suspense swell (Eerie bowing string chord)
  private playDissonantChime(freq1: number, freq2: number, time: number, duration = 2.4) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const vol = 0.16 * this.volume;

    [freq1, freq2].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, time);
      filter.frequency.exponentialRampToValueAtTime(1100, time + duration * 0.4);
      filter.frequency.exponentialRampToValueAtTime(220, time + duration);

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(vol, time + duration * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + duration);
    });
  }

  // Metallic ticking water / paranoia clock
  private playTensionTick(time: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1600, time);
    osc.frequency.exponentialRampToValueAtTime(400, time + 0.035);

    gain.gain.setValueAtTime(0.08 * this.volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.035);
  }

  /**
   * Main Heart-Pounding Horror Track (Lagu Mencekam Bikin Deg-Degan)
   */
  public startHorrorTensionTrack() {
    if (this.isSongPlaying) return;
    this.isSongPlaying = true;
    const ctx = this.initCtx();

    // Suspense cues that cycle naturally
    const atmosphericCues = [
      "Detak jantungmu berpacu semakin kencang...",
      "Hawa dingin merayap di tengkukmu...",
      "Suara langkah mendekat dari kegelapan...",
      "Jangan menoleh... Sesuatu sedang mengintip!",
      "Nafas arwah terasa membeku di dekatmu...",
      "Lorong labirin ini terkutuk... Lari!",
    ];
    let cueIndex = 0;

    const runHorrorBar = () => {
      if (!this.isSongPlaying) return;
      const now = ctx.currentTime + 0.05;

      // Pacing depends on tension level
      const bpm = this.tensionLevel === 'PANIC' ? 115 : this.tensionLevel === 'HIGH' ? 95 : 72;
      const beatDuration = 60 / bpm;

      // Send suspense atmospheric cue
      this.notifyLyric(atmosphericCues[cueIndex % atmosphericCues.length]);
      cueIndex++;

      // Heartbeat pulse pattern (16 beats per phrase)
      const beatsInBar = 8;
      for (let i = 0; i < beatsInBar; i++) {
        const beatTime = now + i * beatDuration;

        // Heartbeat hits on beat 0, 2, 4, 6 (or every beat if Panic)
        if (i % 2 === 0 || this.tensionLevel === 'PANIC' || this.tensionLevel === 'HIGH') {
          this.playDeepHeartbeatPulse(beatTime, true, i === 0 ? 1.2 : 0.9);
        }

        // Ticking paranoia on offbeats
        if (i % 2 === 1) {
          this.playTensionTick(beatTime);
        }
      }

      // Sinister dissonant string swells (Tritone intervals: C-F#, Eb-A, D-G#)
      const chords = [
        { f1: 130.81, f2: 185.00 }, // C3 - F#3 (Devil's Tritone)
        { f1: 155.56, f2: 220.00 }, // Eb3 - A3
        { f1: 146.83, f2: 207.65 }, // D3 - G#3
        { f1: 123.47, f2: 174.61 }, // B2 - F3
      ];
      const chord = chords[cueIndex % chords.length];
      this.playDissonantChime(chord.f1, chord.f2, now + 0.1, beatDuration * 4.5);

      const phraseTimeMs = beatsInBar * beatDuration * 1000;
      this.tensionLoopTimeout = setTimeout(runHorrorBar, phraseTimeMs);
    };

    runHorrorBar();
  }

  public stopHorrorTensionTrack() {
    this.isSongPlaying = false;
    if (this.tensionLoopTimeout) {
      clearTimeout(this.tensionLoopTimeout);
      this.tensionLoopTimeout = null;
    }
  }

  // Compatibility aliases
  public startAbdiTehAyeunaSong() {
    this.startHorrorTensionTrack();
  }

  public stopAbdiTehAyeunaSong() {
    this.stopHorrorTensionTrack();
  }

  // Ambient eerie drone background
  public startAmbient() {
    this.initCtx();
    this.startHorrorTensionTrack();
    if (this.isAmbientPlaying) return;

    try {
      const ctx = this.initCtx();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08 * this.volume, ctx.currentTime);

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(55, ctx.currentTime);

      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(57.5, ctx.currentTime);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      this.ambientGain = gain;
      this.ambientOsc1 = osc1;
      this.ambientOsc2 = osc2;
      this.isAmbientPlaying = true;
    } catch {
      // Needs gesture
    }
  }

  public stopAmbient() {
    this.stopAbdiTehAyeunaSong();
    if (!this.isAmbientPlaying) return;
    try {
      this.ambientOsc1?.stop();
      this.ambientOsc2?.stop();
      this.ambientOsc1?.disconnect();
      this.ambientOsc2?.disconnect();
      this.ambientGain?.disconnect();
      this.isAmbientPlaying = false;
    } catch {
      // ignore
    }
  }

  // Kuntilanak: High-pitched echoing eerie laughter
  public playKuntiLaugh() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      const notes = [880, 930, 850, 990, 820, 780];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.11);
        osc.frequency.linearRampToValueAtTime(freq + (idx % 2 === 0 ? 40 : -50), now + idx * 0.11 + 0.09);

        gain.gain.setValueAtTime(0.001, now + idx * 0.11);
        gain.gain.linearRampToValueAtTime(0.28 * this.volume, now + idx * 0.11 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.13);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.11);
        osc.stop(now + idx * 0.11 + 0.14);
      });
    } catch {
      // ignore
    }
  }

  // Genderuwo: Deep guttural demonic growl
  public playGenderuwoGrowl() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(75, now);
      osc.frequency.linearRampToValueAtTime(45, now + 0.8);
      osc.frequency.linearRampToValueAtTime(60, now + 1.2);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.35 * this.volume, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.4);
    } catch {
      // ignore
    }
  }

  // Pocong: Eerie rustling whisper & sinister bouncing thud
  public playPocongSound() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      // Heavy shroud jump thud
      const thud = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thud.type = 'triangle';
      thud.frequency.setValueAtTime(90, now);
      thud.frequency.exponentialRampToValueAtTime(35, now + 0.25);
      thudGain.gain.setValueAtTime(0.35 * this.volume, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      thud.connect(thudGain);
      thudGain.connect(ctx.destination);
      thud.start(now);
      thud.stop(now + 0.25);

      // Raspy shroud whisper
      const bufferSize = Math.floor(ctx.sampleRate * 0.4);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, now);
      filter.Q.setValueAtTime(4, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.22 * this.volume, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
    } catch {
      // ignore
    }
  }

  // HORROR JUMPSCARE & SCREAMING VOICES
  public playGhostScream(ghostType: 'POCONG' | 'KUNTILANAK' | 'GENDERUWO') {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      if (ghostType === 'KUNTILANAK') {
        // High-pitched terrifying blood-curdling banshee scream
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const screamGain = ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(1400, now);
        osc1.frequency.linearRampToValueAtTime(2600, now + 0.15);
        osc1.frequency.linearRampToValueAtTime(1800, now + 0.7);
        osc1.frequency.exponentialRampToValueAtTime(600, now + 1.5);

        osc2.frequency.setValueAtTime(1420, now);
        osc2.frequency.linearRampToValueAtTime(2640, now + 0.15);
        osc2.frequency.linearRampToValueAtTime(1820, now + 0.7);
        osc2.frequency.exponentialRampToValueAtTime(580, now + 1.5);

        // Harsh throat scream noise
        const bufferSize = Math.floor(ctx.sampleRate * 1.5);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.sin(i / 12);
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(2200, now);
        noiseFilter.Q.setValueAtTime(3, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.6 * this.volume, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

        screamGain.gain.setValueAtTime(0.85 * this.volume, now);
        screamGain.gain.linearRampToValueAtTime(0.95 * this.volume, now + 0.2);
        screamGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        osc1.connect(screamGain);
        osc2.connect(screamGain);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);

        screamGain.connect(ctx.destination);
        noiseGain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        noise.start(now);
        osc1.stop(now + 1.5);
        osc2.stop(now + 1.5);
        noise.stop(now + 1.5);
      } else if (ghostType === 'POCONG') {
        // Horrific choked death rattle shrieking scream
        const screech = ctx.createOscillator();
        const screechGain = ctx.createGain();
        screech.type = 'sawtooth';
        screech.frequency.setValueAtTime(850, now);
        screech.frequency.linearRampToValueAtTime(1550, now + 0.1);
        screech.frequency.linearRampToValueAtTime(420, now + 0.8);
        screech.frequency.exponentialRampToValueAtTime(90, now + 1.4);

        screechGain.gain.setValueAtTime(0.9 * this.volume, now);
        screechGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

        const rattleBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.2), ctx.sampleRate);
        const rData = rattleBuf.getChannelData(0);
        for (let i = 0; i < rData.length; i++) {
          rData[i] = (Math.random() * 2 - 1) * ((i % 120 < 60) ? 1 : -0.5);
        }
        const rattle = ctx.createBufferSource();
        rattle.buffer = rattleBuf;
        const rFilter = ctx.createBiquadFilter();
        rFilter.type = 'bandpass';
        rFilter.frequency.setValueAtTime(1100, now);
        const rGain = ctx.createGain();
        rGain.gain.setValueAtTime(0.55 * this.volume, now);
        rGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        rattle.connect(rFilter);
        rFilter.connect(rGain);
        rGain.connect(ctx.destination);
        screech.connect(screechGain);
        screechGain.connect(ctx.destination);

        screech.start(now);
        rattle.start(now);
        screech.stop(now + 1.4);
        rattle.stop(now + 1.2);
      } else {
        // Genderuwo: Thunderous demonic roar & bellowing screech
        const roar1 = ctx.createOscillator();
        const roar2 = ctx.createOscillator();
        const roarGain = ctx.createGain();

        roar1.type = 'sawtooth';
        roar2.type = 'square';

        roar1.frequency.setValueAtTime(130, now);
        roar1.frequency.linearRampToValueAtTime(320, now + 0.2);
        roar1.frequency.linearRampToValueAtTime(65, now + 1.1);
        roar1.frequency.exponentialRampToValueAtTime(30, now + 1.8);

        roar2.frequency.setValueAtTime(65, now);
        roar2.frequency.linearRampToValueAtTime(180, now + 0.25);
        roar2.frequency.linearRampToValueAtTime(45, now + 1.3);

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(650, now);

        roarGain.gain.setValueAtTime(0.95 * this.volume, now);
        roarGain.gain.linearRampToValueAtTime(0.98 * this.volume, now + 0.3);
        roarGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        roar1.connect(lowpass);
        roar2.connect(lowpass);
        lowpass.connect(roarGain);
        roarGain.connect(ctx.destination);

        roar1.start(now);
        roar2.start(now);
        roar1.stop(now + 1.8);
        roar2.stop(now + 1.8);
      }
    } catch {
      // ignore
    }
  }

  // Quick sudden corridor jumpscare stinger
  public playSuddenShockStinger() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.45);
      gain.gain.setValueAtTime(0.7 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch {
      // ignore
    }
  }

  // SPECIFIC JUMPSCARE VOICES WHEN CAUGHT:
  public playJumpscareCaught(ghostType: 'POCONG' | 'KUNTILANAK' | 'GENDERUWO') {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      // 1. Violent visceral impact boom & shockwave
      const boom = ctx.createOscillator();
      const boomGain = ctx.createGain();
      boom.type = 'sawtooth';
      boom.frequency.setValueAtTime(320, now);
      boom.frequency.exponentialRampToValueAtTime(18, now + 1.8);
      boomGain.gain.setValueAtTime(0.95 * this.volume, now);
      boomGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      boom.connect(boomGain);
      boomGain.connect(ctx.destination);
      boom.start(now);
      boom.stop(now + 1.8);

      // 2. Play intense blood-curdling ghost scream
      this.playGhostScream(ghostType);
    } catch {
      // ignore
    }
  }

  // Closet creak sound
  public playClosetCreak(isEntering: boolean) {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      if (isEntering) {
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(140, now + 0.25);
        osc.frequency.linearRampToValueAtTime(180, now + 0.4);
      } else {
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(240, now + 0.35);
      }

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.2 * this.volume, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch {
      // ignore
    }
  }

  // Player footstep
  public playFootstep() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

      gain.gain.setValueAtTime(0.09 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // ignore
    }
  }

  // Flashlight click
  public playFlashlightClick() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.03);
      gain.gain.setValueAtTime(0.12 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    } catch {
      // ignore
    }
  }

  // Victory Escape Chime / Level up
  public playVictory() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      [330, 440, 554, 659].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);
        gain.gain.setValueAtTime(0.001, now + idx * 0.15);
        gain.gain.linearRampToValueAtTime(0.25 * this.volume, now + idx * 0.15 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 1.2);
      });
    } catch {
      // ignore
    }
  }
}

export const soundManager = new SoundController();
