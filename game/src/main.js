// Moonpetal Grove — entry point: game loop, state transitions, status line.
import { CONFIG as C } from './config.js';
import { World } from './world.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { applyShot, parseQuery } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const { seed, shot } = parseQuery();

const sound = new SoundBank();
const world = new World(seed, sound);
world.setSeed(seed);
const renderer = new Renderer(canvas);
const input = new Input(canvas);

if (shot) applyShot(world, shot);

function setStatus(text) {
  if (statusEl.textContent !== text) statusEl.textContent = text;
}

function describeState() {
  switch (world.state) {
    case 'title': return `${document.title}. Title screen. Press Enter to start.`;
    case 'playing':
      return `Playing. Score ${world.score} of ${C.targetScore}. `
        + `${Math.max(0, Math.ceil(C.dayLengthSec - world.time))} seconds to dusk. `
        + `Water ${Math.floor(world.water)}. Pouch holds ${world.pouch.length} seeds. `
        + `Blight ${world.blight} of ${C.maxBlight}.`;
    case 'paused': return 'Paused. Press P to carry on.';
    case 'win': return `You won with ${world.score} points. Press R to play again.`;
    case 'lose': return `Game over. ${world.loseReason || ''} Press R to try again.`;
    default: return '';
  }
}

function startGame() {
  sound.ensure();
  sound.click();
  world.start();
}

function restart() {
  sound.ensure();
  world.start();
}

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'm') {
    sound.ensure();
    const muted = sound.toggleMute();
    world.say(muted ? 'Sound off.' : 'Sound on.');
    return;
  }
  if (key === 'p' || key === 'escape') {
    if (world.state === 'playing') { world.state = 'paused'; sound.click(); }
    else if (world.state === 'paused') { world.state = 'playing'; sound.click(); }
    return;
  }
  if (key === 'r') {
    if (world.state !== 'title') restart();
    return;
  }
  if (key === 'enter' || key === ' ') {
    if (world.state === 'title') startGame();
    else if (world.state === 'win' || world.state === 'lose') restart();
    else if (world.state === 'paused') world.state = 'playing';
  }
});

canvas.addEventListener('pointerdown', () => {
  sound.ensure();
  if (world.state === 'title') startGame();
  else if (world.state === 'win' || world.state === 'lose') restart();
  else if (world.state === 'paused') world.state = 'playing';
});

let last = performance.now();
let frames = 0;
let fpsWindowStart = performance.now();
let fps = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  world.update(dt, input);
  renderer.draw(world, now);
  setStatus(describeState());
  frames++;
  if (now - fpsWindowStart >= 1000) {
    fps = Math.round((frames * 1000) / (now - fpsWindowStart));
    frames = 0;
    fpsWindowStart = now;
  }
  requestAnimationFrame(frame);
}

// Test handle: the headless playtest reads state and drives spawns through
// this, never by editing the game. It is inert during normal play.
window.__grove = {
  world,
  fps: () => fps,
  state: () => world.debug(),
  spawnSeed: (kind, x) => world.spawnSeed(kind, x),
  spawnMeteor: (x) => world.spawnMeteor(x),
  setPointer: (x) => { input.pointerX = x; },
  clickAt: (x, y) => { input.clicked = { x, y }; },
  // Frame-cost probe: time N simulation steps and N draws, synchronously.
  frameCost: (n = 300) => {
    const t0 = performance.now();
    for (let i = 0; i < n; i++) world.update(1 / 60, input);
    const t1 = performance.now();
    for (let i = 0; i < n; i++) renderer.draw(world, performance.now());
    const t2 = performance.now();
    return {
      updateMs: +((t1 - t0) / n).toFixed(3),
      drawMs: +((t2 - t1) / n).toFixed(3),
      totalMs: +((t2 - t0) / n).toFixed(3),
    };
  },
};

requestAnimationFrame(frame);
