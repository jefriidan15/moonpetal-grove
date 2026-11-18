// Screenshot presets: ?shot=start|play|end&seed=N puts the game into a fixed,
// good-looking state so screenshots are real renders of the game's own code.
import { CONFIG as C } from './config.js';

export function applyShot(world, shot) {
  if (shot === 'start') {
    world.state = 'title';
    return;
  }
  if (shot === 'play') {
    world.state = 'playing';
    world.time = 62;
    world.score = 345;
    world.combo = 4;
    world.bestCombo = 6;
    world.water = 62;
    world.pouch = ['moonpetal', 'sunberry'];
    world.keeperX = 620;
    // A lively mid-game garden: one plant at each stage, one scorched bed.
    const stages = [
      { kind: 'moonpetal', growth: 0.18, boostUntil: 0, dry: 0 },
      { kind: 'sunberry', growth: 0.55, boostUntil: 0, dry: 0 },
      { kind: 'starfern', growth: 0.6, boostUntil: 70, dry: 0 },
      { kind: 'moonpetal', growth: 0.7, boostUntil: 0, dry: 1 },
      { kind: 'sunberry', growth: 0.35, boostUntil: 0, dry: 0 },
      null,
    ];
    world.beds.forEach((bed, i) => {
      bed.plant = stages[i] ? { ...stages[i] } : null;
      bed.scorched = i === 5;
    });
    world.seeds = [
      { kind: 'moonpetal', x: 320, y: 210, vy: 120, sway: 22, phase: 1.2, rot: 0.4 },
      { kind: 'starfern', x: 880, y: 130, vy: 110, sway: 30, phase: 2.6, rot: 1.1 },
      { kind: 'sunberry', x: 1050, y: 300, vy: 130, sway: 18, phase: 0.3, rot: 2.0 },
    ];
    world.meteors = [{ x: 480, y: 180, vy: 150, r: 24, rot: 0.7, vr: 1.2 }];
    world.stats = { caught: 14, planted: 9, bloomed: 5, swatted: 3, missed: 2, watered: 7 };
    world.level = 2;
    return;
  }
  if (shot === 'end') {
    world.state = 'win';
    world.time = 118;
    world.score = 940;
    world.combo = 0;
    world.bestCombo = 8;
    world.water = 40;
    world.pouch = ['starfern'];
    world.keeperX = 640;
    world.beds.forEach((bed, i) => {
      bed.plant = i < 3
        ? { kind: ['moonpetal', 'sunberry', 'starfern'][i], growth: 0.95, boostUntil: 0, dry: 0 }
        : null;
      bed.scorched = false;
    });
    world.stats = { caught: 31, planted: 18, bloomed: 12, swatted: 6, missed: 4, watered: 15 };
    world.level = 4;
  }
}

export function parseQuery() {
  const q = new URLSearchParams(window.location.search);
  return {
    seed: Number(q.get('seed') || '1') || 1,
    shot: q.get('shot') || '',
  };
}

export function shotList() {
  return [
    { name: '1-start.jpg', query: '?shot=start&seed=7' },
    { name: '2-play.jpg', query: '?shot=play&seed=7' },
    { name: '3-end.jpg', query: '?shot=end&seed=7' },
  ];
}
