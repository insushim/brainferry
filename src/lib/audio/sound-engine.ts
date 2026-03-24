export class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private volume = 0.5;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private createGain(duration: number): GainNode {
    const ctx = this.getContext();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    gain.connect(ctx.destination);
    return gain;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
  }

  playSplash(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const duration = 0.4;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + duration);

    const gain = this.createGain(duration);
    source.connect(filter);
    filter.connect(gain);
    source.start();
    source.stop(ctx.currentTime + duration);
  }

  playSuccess(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(this.volume * 0.6, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      gain.connect(ctx.destination);
      osc.connect(gain);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  playError(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const duration = 0.3;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + duration);
    const gain = this.createGain(duration);
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  playClick(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const duration = 0.05;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 880;
    const gain = this.createGain(duration);
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  playPour(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const duration = 0.5;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(2000, ctx.currentTime + duration * 0.5);
    filter.frequency.linearRampToValueAtTime(800, ctx.currentTime + duration);
    filter.Q.value = 2;

    const gain = this.createGain(duration);
    source.connect(filter);
    filter.connect(gain);
    source.start();
    source.stop(ctx.currentTime + duration);
  }

  playPlace(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const duration = 0.15;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + duration);
    const gain = this.createGain(duration);
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  playHint(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const duration = 0.2;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + duration);
    const gain = this.createGain(duration);
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  playTick(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const duration = 0.02;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1000;
    const gain = this.createGain(duration);
    gain.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  playScale(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const duration = 0.35;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + duration);
    const gain = this.createGain(duration);
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  playToggle(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const duration = 0.06;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + duration);
    const gain = this.createGain(duration);
    gain.gain.setValueAtTime(this.volume * 0.4, ctx.currentTime);
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }
}

export const soundEngine: SoundEngine | null =
  typeof window !== 'undefined' ? new SoundEngine() : null;
