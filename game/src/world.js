// Moonpetal Grove — the simulation. No drawing here, only state and rules.
// The keeper catches seeds drifting down on the solar wind, plants them in
// the six soil beds, waters them until they bloom, and swats blight meteors
// out of the sky before they crush a plant. Reach the target score before
// dusk, or the grove is lost.
import { CONFIG as C } from './config.js';
import { mulberry32, pickWeighted } from './random.js';

export function bedRect(i) {
  const w = 150;
  const gap = (C.width - C.bedCount * w) / (C.bedCount + 1);
  const x = gap + i * (w + gap);
  return { x, y: C.groundY + 18, w, h: 84 };
}

export class World {
  constructor(seed, sound) {
    this.sound = sound;
    this.rng = mulberry32(seed);
    this.reset(seed);
  }

  reset(seed) {
    this.rng = mulberry32(seed);
    this.state = 'title'; // title | playing | paused | win | lose
    this.time = 0; // seconds of daylight used
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.blight = 0;
    this.water = C.waterMax;
    this.pouch = []; // seed kinds carried, oldest first
    this.keeperX = C.width / 2;
    this.keeperFace = 1;
    this.seeds = []; // falling seeds {kind, x, y, vy, sway, phase, rot}
    this.meteors = []; // falling rocks {x, y, vy, r, rot, vr}
    this.particles = [];
    this.floaters = []; // {x, y, text, color, life}
    this.rain = 0; // seconds of rain left
    this.nextRain = C.rainEverySec;
    this.seedTimer = 0.8;
    this.meteorTimer = 5;
    this.beds = Array.from({ length: C.bedCount }, () => ({ plant: null, scorched: false }));
    this.stats = { caught: 0, planted: 0, bloomed: 0, swatted: 0, missed: 0, watered: 0 };
    this.message = '';
    this.messageUntil = 0;
    this.level = 1;
  }

  get difficulty() {
    return Math.min(1, this.time / C.dayLengthSec);
  }

  get targetReached() {
    return this.score >= C.targetScore;
  }

  levelFor(score) {
    return 1 + Math.floor(score / 200);
  }

  start() {
    this.reset(this.seedValue ?? 1);
    this.state = 'playing';
  }

  // Keep the seed used for this run so restart replays the same sky.
  setSeed(seed) {
    this.seedValue = seed;
  }

  spawnSeed(kind, x) {
    const kinds = Object.entries(C.kinds).map(([key, v]) => ({ key, weight: v.weight }));
    const k = kind || pickWeighted(this.rng, kinds);
    const speed = C.fallSpeedStart + (C.fallSpeedEnd - C.fallSpeedStart) * this.difficulty;
    this.seeds.push({
      kind: k,
      x: x ?? 60 + this.rng() * (C.width - 120),
      y: -30,
      vy: speed * (0.85 + this.rng() * 0.3),
      sway: 18 + this.rng() * 26,
      phase: this.rng() * Math.PI * 2,
      rot: this.rng() * Math.PI * 2,
    });
  }

  spawnMeteor(x) {
    const speed = (C.fallSpeedStart + 40) * (0.9 + this.rng() * 0.3);
    this.meteors.push({
      x: x ?? 60 + this.rng() * (C.width - 120),
      y: -40,
      vy: speed,
      r: 20 + this.rng() * 8,
      rot: this.rng() * Math.PI * 2,
      vr: (this.rng() - 0.5) * 3,
    });
  }

  burst(x, y, color, n, speed = 120) {
    for (let i = 0; i < n; i++) {
      const a = this.rng() * Math.PI * 2;
      const v = speed * (0.3 + this.rng() * 0.7);
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40,
        life: 0.5 + this.rng() * 0.5, max: 1, color, size: 2 + this.rng() * 3,
      });
    }
  }

  floatText(x, y, text, color) {
    this.floaters.push({ x, y, text, color, life: 1.2 });
  }

  say(text, seconds = 2.2) {
    this.message = text;
    this.messageUntil = this.time + seconds;
  }

  comboBonus() {
    return Math.min(C.comboCap, this.combo * C.comboStep);
  }

  addScore(base, x, y, label) {
    const gained = Math.round(base * (1 + this.comboBonus()));
    this.score += gained;
    this.floatText(x, y, `${label} +${gained}`, '#ffe9a8');
    this.level = this.levelFor(this.score);
    return gained;
  }

  // --- player actions -------------------------------------------------
  plantInBed(i) {
    if (this.state !== 'playing') return false;
    const bed = this.beds[i];
    if (!bed || bed.scorched || bed.plant || this.pouch.length === 0) return false;
    const kind = this.pouch.shift();
    bed.plant = { kind, growth: 0, boostUntil: 0, dry: 0 };
    this.stats.planted++;
    this.sound.plant();
    const r = bedRect(i);
    this.burst(r.x + r.w / 2, r.y + 10, '#9fe08a', 10, 70);
    return true;
  }

  waterBed(i) {
    if (this.state !== 'playing') return false;
    const bed = this.beds[i];
    if (!bed || !bed.plant) return false;
    if (this.water < C.waterCost) {
      this.say('The well is dry — wait for rain.');
      return false;
    }
    this.water -= C.waterCost;
    bed.plant.boostUntil = this.time + 6;
    bed.plant.dry = 0;
    this.stats.watered++;
    this.sound.water();
    const r = bedRect(i);
    this.burst(r.x + r.w / 2, r.y + 6, '#7fd4ff', 14, 90);
    return true;
  }

  clearScorch(i) {
    const bed = this.beds[i];
    if (!bed || !bed.scorched) return false;
    bed.scorched = false;
    this.sound.click();
    const r = bedRect(i);
    this.burst(r.x + r.w / 2, r.y + 20, '#b9a58a', 8, 60);
    return true;
  }

  swatAt(x, y) {
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      const d = Math.hypot(m.x - x, m.y - y);
      if (d < m.r + 26) {
        this.meteors.splice(i, 1);
        this.stats.swatted++;
        this.addScore(C.swatScore, m.x, m.y, 'Swatted');
        this.sound.swat();
        this.burst(m.x, m.y, '#ff9d5c', 16, 160);
        return true;
      }
    }
    return false;
  }

  bedAt(x, y) {
    for (let i = 0; i < this.beds.length; i++) {
      const r = bedRect(i);
      if (x >= r.x - 6 && x <= r.x + r.w + 6 && y >= r.y - 30 && y <= r.y + r.h + 10) return i;
    }
    return -1;
  }

  handleClick(x, y) {
    if (this.state !== 'playing') return;
    if (this.swatAt(x, y)) return;
    const i = this.bedAt(x, y);
    if (i >= 0) {
      const bed = this.beds[i];
      if (bed.scorched) this.clearScorch(i);
      else if (bed.plant) this.waterBed(i);
      else this.plantInBed(i);
    }
  }

  waterNearestBed() {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < this.beds.length; i++) {
      if (!this.beds[i].plant) continue;
      const r = bedRect(i);
      const d = Math.abs(r.x + r.w / 2 - this.keeperX);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best >= 0) this.waterBed(best);
  }

  // --- simulation -----------------------------------------------------
  update(dt, input) {
    if (this.state !== 'playing') {
      this.updateFx(dt);
      return;
    }
    this.time += dt;

    // Keeper movement: pointer leads, keys nudge.
    const targetX = Math.max(40, Math.min(C.width - 40, input.pointerX));
    if (input.left) this.keeperX -= C.keeperSpeed * dt;
    if (input.right) this.keeperX += C.keeperSpeed * dt;
    if (!input.left && !input.right) {
      const diff = targetX - this.keeperX;
      this.keeperX += diff * Math.min(1, dt * 14);
    }
    this.keeperX = Math.max(40, Math.min(C.width - 40, this.keeperX));
    if (Math.abs(targetX - this.keeperX) > 2) this.keeperFace = targetX > this.keeperX ? 1 : -1;

    // Clicks.
    const click = input.consumeClick();
    if (click) this.handleClick(click.x, click.y);
    if (input.consumeKey(' ')) this.waterNearestBed();
    for (let i = 0; i < C.bedCount; i++) {
      if (input.consumeKey(String(i + 1))) {
        const bed = this.beds[i];
        if (bed.scorched) this.clearScorch(i);
        else if (bed.plant) this.waterBed(i);
        else this.plantInBed(i);
      }
    }

    // Spawning.
    const seedInterval = C.seedIntervalStart + (C.seedIntervalEnd - C.seedIntervalStart) * this.difficulty;
    this.seedTimer -= dt;
    if (this.seedTimer <= 0) {
      this.spawnSeed();
      this.seedTimer = seedInterval * (0.75 + this.rng() * 0.5);
    }
    const meteorInterval = C.meteorIntervalStart + (C.meteorIntervalEnd - C.meteorIntervalStart) * this.difficulty;
    this.meteorTimer -= dt;
    if (this.meteorTimer <= 0 && this.time > 12) {
      this.spawnMeteor();
      this.meteorTimer = meteorInterval * (0.8 + this.rng() * 0.4);
    }

    // Rain.
    this.nextRain -= dt;
    if (this.nextRain <= 0 && this.rain <= 0) {
      this.rain = 4;
      this.nextRain = C.rainEverySec;
      this.water = Math.min(C.waterMax, this.water + C.rainAmount);
      this.sound.rain();
      this.say('Rain! The well refills and every plant drinks.');
      for (const bed of this.beds) {
        if (bed.plant) { bed.plant.boostUntil = this.time + 4; bed.plant.dry = 0; }
      }
    }
    if (this.rain > 0) this.rain -= dt;

    // Falling seeds.
    for (let i = this.seeds.length - 1; i >= 0; i--) {
      const s = this.seeds[i];
      s.y += s.vy * dt;
      s.phase += dt * 2;
      s.x += Math.sin(s.phase) * s.sway * dt;
      s.rot += dt * 1.5;
      const caught = Math.abs(s.x - this.keeperX) < 52 && s.y > C.keeperY - 46 && s.y < C.keeperY + 26;
      if (caught) {
        this.seeds.splice(i, 1);
        this.stats.caught++;
        if (this.pouch.length < C.pouchMax) {
          this.pouch.push(s.kind);
          this.combo++;
          this.bestCombo = Math.max(this.bestCombo, this.combo);
          this.sound.catchSeed();
          this.burst(this.keeperX, C.keeperY - 30, C.kinds[s.kind].petal, 8, 80);
        } else {
          this.say('Pouch full — plant a seed first!');
          this.combo = 0;
        }
        continue;
      }
      if (s.y > C.groundY + 4) {
        this.seeds.splice(i, 1);
        this.stats.missed++;
        this.combo = 0;
        this.burst(s.x, C.groundY, '#8a7a5c', 6, 50);
      }
    }

    // Falling meteors.
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.y += m.vy * dt;
      m.rot += m.vr * dt;
      if (m.y >= C.groundY + 6) {
        this.meteors.splice(i, 1);
        const bedIndex = this.bedAt(m.x, C.groundY + 30);
        this.sound.blight();
        this.burst(m.x, C.groundY, '#ff6b4a', 18, 180);
        if (bedIndex >= 0) {
          const bed = this.beds[bedIndex];
          if (bed.plant) {
            bed.plant = null;
            this.blight++;
            this.say(`Blight crushed a plant! (${this.blight}/${C.maxBlight})`);
          }
          bed.scorched = true;
        }
      }
    }

    // Plants grow. Watered plants grow 2.5x; dry plants stall and droop.
    for (let i = 0; i < this.beds.length; i++) {
      const bed = this.beds[i];
      if (!bed.plant) continue;
      const p = bed.plant;
      const kind = C.kinds[p.kind];
      const boosted = this.time < p.boostUntil;
      if (boosted) p.dry = 0;
      else p.dry = Math.min(1, p.dry + dt / 14);
      const rate = p.dry >= 1 ? 0 : (boosted ? 2.5 : 1) / kind.growSec;
      p.growth += rate * dt;
      if (p.growth >= 1) {
        const r = bedRect(i);
        this.addScore(kind.value, r.x + r.w / 2, r.y - 10, kindLabel(p.kind));
        this.burst(r.x + r.w / 2, r.y - 6, kind.petal, 22, 130);
        this.sound.bloom();
        bed.plant = null;
        this.stats.bloomed++;
        this.say(`${kindLabel(p.kind)} bloomed!`);
      }
    }

    this.updateFx(dt);

    // End conditions.
    if (this.targetReached) {
      this.state = 'win';
      this.sound.win();
    } else if (this.blight >= C.maxBlight) {
      this.state = 'lose';
      this.loseReason = 'The blight withered the grove.';
      this.sound.lose();
    } else if (this.time >= C.dayLengthSec) {
      this.state = 'lose';
      this.loseReason = `Dusk fell at ${this.score} / ${C.targetScore} points.`;
      this.sound.lose();
    }
  }

  updateFx(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.y -= 34 * dt;
      f.life -= dt;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }
  }

  debug() {
    return {
      state: this.state,
      time: Math.round(this.time * 10) / 10,
      score: this.score,
      combo: this.combo,
      bestCombo: this.bestCombo,
      blight: this.blight,
      water: Math.round(this.water),
      pouch: [...this.pouch],
      keeperX: Math.round(this.keeperX),
      seeds: this.seeds.length,
      seedPositions: this.seeds.map((s) => ({ kind: s.kind, x: Math.round(s.x), y: Math.round(s.y) })),
      meteors: this.meteors.length,
      meteorPositions: this.meteors.map((m) => ({ x: Math.round(m.x), y: Math.round(m.y), r: m.r })),
      beds: this.beds.map((b) => (b.scorched ? 'scorched' : b.plant ? `${b.plant.kind}:${Math.round(b.plant.growth * 100)}%` : 'empty')),
      stats: { ...this.stats },
      level: this.level,
    };
  }
}

export function kindLabel(kind) {
  return { moonpetal: 'Moonpetal', sunberry: 'Sunberry', starfern: 'Starfern' }[kind] || kind;
}
