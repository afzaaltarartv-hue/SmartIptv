import { AudioEqualizerSettings } from '../types';

export const EQ_PRESETS: Record<string, Partial<AudioEqualizerSettings>> = {
  flat: {
    band60Hz: 0,
    band230Hz: 0,
    band910Hz: 0,
    band3600Hz: 0,
    band14000Hz: 0,
    bassGain: 0,
    vocalGain: 0,
  },
  bass: {
    band60Hz: 8,
    band230Hz: 5,
    band910Hz: 0,
    band3600Hz: -2,
    band14000Hz: 1,
    bassGain: 7,
    vocalGain: 0,
  },
  vocal: {
    band60Hz: -4,
    band230Hz: 0,
    band910Hz: 6,
    band3600Hz: 5,
    band14000Hz: 2,
    bassGain: -3,
    vocalGain: 6,
  },
  cinema: {
    band60Hz: 6,
    band230Hz: 2,
    band910Hz: -2,
    band3600Hz: 4,
    band14000Hz: 6,
    bassGain: 5,
    vocalGain: 2,
  },
  night: {
    band60Hz: -7,
    band230Hz: -3,
    band910Hz: 4,
    band3600Hz: 2,
    band14000Hz: -5,
    bassGain: -6,
    vocalGain: 4,
  },
};

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private currentVideoElement: HTMLMediaElement | null = null;

  // Audio Nodes
  private preampNode: GainNode | null = null;
  private bassNode: BiquadFilterNode | null = null;
  private vocalNode: BiquadFilterNode | null = null;
  private band60Node: BiquadFilterNode | null = null;
  private band230Node: BiquadFilterNode | null = null;
  private band910Node: BiquadFilterNode | null = null;
  private band3600Node: BiquadFilterNode | null = null;
  private band14000Node: BiquadFilterNode | null = null;
  private isConnected = false;
  private isCorsBlocked = false;

  private initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  public attachToVideo(video: HTMLMediaElement, settings: AudioEqualizerSettings): boolean {
    if (this.currentVideoElement === video && this.isConnected) {
      this.applySettings(settings);
      return true;
    }

    try {
      this.initContext();
      if (!this.audioCtx) return false;

      // Only create source node once per element
      if (!this.sourceNode || this.currentVideoElement !== video) {
        this.currentVideoElement = video;
        this.sourceNode = this.audioCtx.createMediaElementSource(video);

        // Preamp gain
        this.preampNode = this.audioCtx.createGain();

        // Bass shelf
        this.bassNode = this.audioCtx.createBiquadFilter();
        this.bassNode.type = 'lowshelf';
        this.bassNode.frequency.value = 120;

        // Vocal / Dialogue Peaking
        this.vocalNode = this.audioCtx.createBiquadFilter();
        this.vocalNode.type = 'peaking';
        this.vocalNode.frequency.value = 2000;
        this.vocalNode.Q.value = 1.0;

        // 5-Band Equalizer
        this.band60Node = this.createFilter('peaking', 60, 1.2);
        this.band230Node = this.createFilter('peaking', 230, 1.2);
        this.band910Node = this.createFilter('peaking', 910, 1.2);
        this.band3600Node = this.createFilter('peaking', 3600, 1.2);
        this.band14000Node = this.createFilter('highshelf', 14000, 1.0);

        // Connect chain:
        // Source -> Preamp -> Bass -> Vocal -> 60Hz -> 230Hz -> 910Hz -> 3.6kHz -> 14kHz -> Destination
        this.sourceNode.connect(this.preampNode);
        this.preampNode.connect(this.bassNode);
        this.bassNode.connect(this.vocalNode);
        this.vocalNode.connect(this.band60Node);
        this.band60Node.connect(this.band230Node);
        this.band230Node.connect(this.band910Node);
        this.band910Node.connect(this.band3600Node);
        this.band3600Node.connect(this.band14000Node);
        this.band14000Node.connect(this.audioCtx.destination);

        this.isConnected = true;
        this.isCorsBlocked = false;
      }

      this.applySettings(settings);
      return true;
    } catch (err) {
      console.warn('Web Audio attachment failed (possibly CORS or autoplay restriction):', err);
      this.isCorsBlocked = true;
      return false;
    }
  }

  private createFilter(type: BiquadFilterType, frequency: number, q: number): BiquadFilterNode {
    if (!this.audioCtx) throw new Error('AudioContext missing');
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    return filter;
  }

  public applySettings(settings: AudioEqualizerSettings): void {
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    if (this.preampNode) {
      // Preamp multiplier (1.0 = 0dB, 2.0 = +6dB)
      const gain = settings.enabled ? Math.max(0.2, Math.min(2.5, settings.preampGain)) : 1.0;
      this.preampNode.gain.setTargetAtTime(gain, this.audioCtx.currentTime, 0.05);
    }

    if (!settings.enabled) {
      // Reset all bands to 0 dB
      if (this.bassNode) this.bassNode.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.05);
      if (this.vocalNode) this.vocalNode.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.05);
      if (this.band60Node) this.band60Node.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.05);
      if (this.band230Node) this.band230Node.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.05);
      if (this.band910Node) this.band910Node.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.05);
      if (this.band3600Node) this.band3600Node.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.05);
      if (this.band14000Node) this.band14000Node.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.05);
      return;
    }

    // Apply active EQ values
    if (this.bassNode) {
      this.bassNode.gain.setTargetAtTime(settings.bassGain, this.audioCtx.currentTime, 0.05);
    }
    if (this.vocalNode) {
      this.vocalNode.gain.setTargetAtTime(settings.vocalGain, this.audioCtx.currentTime, 0.05);
    }
    if (this.band60Node) {
      this.band60Node.gain.setTargetAtTime(settings.band60Hz, this.audioCtx.currentTime, 0.05);
    }
    if (this.band230Node) {
      this.band230Node.gain.setTargetAtTime(settings.band230Hz, this.audioCtx.currentTime, 0.05);
    }
    if (this.band910Node) {
      this.band910Node.gain.setTargetAtTime(settings.band910Hz, this.audioCtx.currentTime, 0.05);
    }
    if (this.band3600Node) {
      this.band3600Node.gain.setTargetAtTime(settings.band3600Hz, this.audioCtx.currentTime, 0.05);
    }
    if (this.band14000Node) {
      this.band14000Node.gain.setTargetAtTime(settings.band14000Hz, this.audioCtx.currentTime, 0.05);
    }
  }

  public resume(): void {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  public getStatus() {
    return {
      active: this.isConnected && !this.isCorsBlocked,
      corsBlocked: this.isCorsBlocked,
    };
  }
}

export const audioEngine = new AudioEngine();
