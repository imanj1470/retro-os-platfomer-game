export type SfxName =
  | 'jump'
  | 'land'
  | 'hurt'
  | 'die'
  | 'collect'
  | 'keyclick'
  | 'beepError'
  | 'notify'
  | 'notResponding'
  | 'windowOpen'
  | 'windowClose'
  | 'chimeXp'
  | 'chimeWin10'
  | 'bossPing'
  | 'reflect'
  | 'block'
  | 'explode'
  | 'dialup';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let destinationNode: MediaStreamAudioDestinationNode | null = null;
let isMuted = false;
let isUnlocked = false;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    destinationNode = audioCtx.createMediaStreamDestination();
    masterGain.connect(audioCtx.destination);
    masterGain.connect(destinationNode);
  }
  return audioCtx;
}

function unlock(): void {
  if (isUnlocked) return;
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  isUnlocked = true;
}

// Unlock on first interaction
document.addEventListener('keydown', unlock, { once: true });
document.addEventListener('pointerdown', unlock, { once: true });

export function toggleMute(): void {
  isMuted = !isMuted;
  if (masterGain) {
    masterGain.gain.setValueAtTime(isMuted ? 0 : 1, getAudioCtx().currentTime);
  }
}

export function getDestinationNode(): MediaStreamAudioDestinationNode | null {
  return destinationNode;
}

function randomPitch(): number {
  return 0.92 + Math.random() * 0.16; // ±8%
}

export function sfx(name: SfxName, opts?: { pitch?: number; volume?: number }): void {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  const vol = opts?.volume ?? 0.3;
  const pitch = opts?.pitch ?? randomPitch();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(masterGain!);

  switch (name) {
    case 'jump':
      osc.type = 'square';
      osc.frequency.setValueAtTime(200 * pitch, now);
      osc.frequency.linearRampToValueAtTime(400 * pitch, now + 0.1);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;

    case 'land':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100 * pitch, now);
      gain.gain.setValueAtTime(vol * 0.5, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
      break;

    case 'hurt':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300 * pitch, now);
      osc.frequency.linearRampToValueAtTime(100 * pitch, now + 0.2);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
      break;

    case 'die':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400 * pitch, now);
      osc.frequency.linearRampToValueAtTime(50 * pitch, now + 0.5);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
      break;

    case 'collect':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600 * pitch, now);
      osc.frequency.setValueAtTime(800 * pitch, now + 0.05);
      gain.gain.setValueAtTime(vol * 0.7, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;

    case 'keyclick':
      osc.type = 'square';
      osc.frequency.setValueAtTime(800 * pitch, now);
      gain.gain.setValueAtTime(vol * 0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.03);
      osc.start(now);
      osc.stop(now + 0.03);
      break;

    case 'beepError':
      osc.type = 'square';
      osc.frequency.setValueAtTime(200 * pitch, now);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.setValueAtTime(vol, now + 0.15);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;

    case 'notify':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500 * pitch, now);
      osc.frequency.setValueAtTime(700 * pitch, now + 0.08);
      gain.gain.setValueAtTime(vol * 0.5, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;

    case 'notResponding':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440 * pitch, now);
      osc.frequency.setValueAtTime(330 * pitch, now + 0.15);
      gain.gain.setValueAtTime(vol * 0.6, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
      break;

    case 'windowOpen':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300 * pitch, now);
      osc.frequency.linearRampToValueAtTime(600 * pitch, now + 0.1);
      gain.gain.setValueAtTime(vol * 0.4, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;

    case 'windowClose':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600 * pitch, now);
      osc.frequency.linearRampToValueAtTime(300 * pitch, now + 0.1);
      gain.gain.setValueAtTime(vol * 0.4, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;

    case 'chimeXp':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523 * pitch, now);
      osc.frequency.setValueAtTime(659 * pitch, now + 0.1);
      osc.frequency.setValueAtTime(784 * pitch, now + 0.2);
      gain.gain.setValueAtTime(vol * 0.5, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
      break;

    case 'chimeWin10':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440 * pitch, now);
      osc.frequency.setValueAtTime(554 * pitch, now + 0.12);
      osc.frequency.setValueAtTime(659 * pitch, now + 0.24);
      gain.gain.setValueAtTime(vol * 0.5, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
      break;

    case 'bossPing':
      osc.type = 'square';
      osc.frequency.setValueAtTime(200 * pitch, now);
      osc.frequency.linearRampToValueAtTime(100 * pitch, now + 0.3);
      gain.gain.setValueAtTime(vol * 0.8, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
      break;

    case 'reflect':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800 * pitch, now);
      osc.frequency.linearRampToValueAtTime(1200 * pitch, now + 0.1);
      gain.gain.setValueAtTime(vol * 0.5, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;

    case 'block':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150 * pitch, now);
      gain.gain.setValueAtTime(vol * 0.6, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;

    case 'explode':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200 * pitch, now);
      osc.frequency.linearRampToValueAtTime(30 * pitch, now + 0.4);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
      break;

    case 'dialup':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400 * pitch, now);
      osc.frequency.linearRampToValueAtTime(1800 * pitch, now + 0.2);
      osc.frequency.linearRampToValueAtTime(400 * pitch, now + 0.4);
      gain.gain.setValueAtTime(vol * 0.3, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
      break;
  }
}
