// Moonpetal Grove — all drawing. Canvas 2D, no image assets: the sky, the
// grove, the keeper and every plant are drawn from shapes each frame.
import { CONFIG as C } from './config.js';
import { bedRect, kindLabel } from './world.js';

function lerp(a, b, t) { return a + (b - a) * t; }

function skyColors(t) {
  // t: 0 = morning gold, 0.5 = violet afternoon, 1 = deep night.
  if (t < 0.5) {
    const k = t / 0.5;
    return {
      top: [lerp(122, 58, k), lerp(168, 74, k), lerp(214, 138, k)],
      bottom: [lerp(255, 255, k), lerp(214, 164, k), lerp(150, 190, k)],
    };
  }
  const k = (t - 0.5) / 0.5;
  return {
    top: [lerp(58, 10, k), lerp(74, 12, k), lerp(138, 38, k)],
    bottom: [lerp(255, 120, k), lerp(164, 90, k), lerp(190, 150, k)],
  };
}

function rgb(c) { return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; }

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = Array.from({ length: 90 }, (_, i) => ({
      x: (i * 137.5) % C.width,
      y: ((i * 89.3) % 340),
      r: 0.6 + ((i * 7) % 10) / 8,
      tw: (i * 0.37) % (Math.PI * 2),
    }));
    this.fireflies = Array.from({ length: 14 }, (_, i) => ({
      x: 80 + ((i * 173) % 1120),
      y: 420 + ((i * 61) % 140),
      ph: i * 0.9,
    }));
  }

  draw(world, now) {
    const ctx = this.ctx;
    const t = world.difficulty;
    const sky = skyColors(t);
    const grad = ctx.createLinearGradient(0, 0, 0, C.height);
    grad.addColorStop(0, rgb(sky.top));
    grad.addColorStop(0.75, rgb(sky.bottom));
    grad.addColorStop(1, '#1d2416');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, C.width, C.height);

    this.drawStars(ctx, t, now);
    this.drawSunMoon(ctx, t);
    this.drawHills(ctx);
    this.drawGround(ctx);
    for (let i = 0; i < world.beds.length; i++) this.drawBed(ctx, world, i, now);
    for (const s of world.seeds) this.drawSeed(ctx, s, now);
    for (const m of world.meteors) this.drawMeteor(ctx, m);
    this.drawKeeper(ctx, world, now);
    this.drawParticles(ctx, world);
    if (world.rain > 0) this.drawRain(ctx, now);
    this.drawFireflies(ctx, t, now);
    this.drawFloaters(ctx, world);
    this.drawHud(ctx, world);
    if (world.message && world.time < world.messageUntil) this.drawBanner(ctx, world);
    if (world.state === 'title') this.drawTitle(ctx, world);
    if (world.state === 'paused') this.drawPaused(ctx);
    if (world.state === 'win') this.drawEnd(ctx, world, true);
    if (world.state === 'lose') this.drawEnd(ctx, world, false);
  }

  drawStars(ctx, t, now) {
    if (t < 0.25) return;
    const alpha = Math.min(1, (t - 0.25) / 0.5);
    for (const s of this.stars) {
      const tw = 0.5 + 0.5 * Math.sin(now / 700 + s.tw);
      ctx.globalAlpha = alpha * (0.35 + 0.65 * tw);
      ctx.fillStyle = '#fff8e0';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawSunMoon(ctx, t) {
    // The sun sinks as the day passes; the moon rises after midday.
    const sunX = lerp(180, 1080, t);
    const sunY = 120 + Math.sin(t * Math.PI) * -40 + t * 60;
    const g = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 70);
    g.addColorStop(0, 'rgba(255, 236, 170, 0.95)');
    g.addColorStop(0.35, 'rgba(255, 200, 110, 0.55)');
    g.addColorStop(1, 'rgba(255, 200, 110, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
    ctx.fill();
    if (t > 0.45) {
      const mx = lerp(1080, 220, (t - 0.45) / 0.55);
      const my = 110 + (t - 0.45) * 60;
      ctx.fillStyle = '#eef2ff';
      ctx.beginPath();
      ctx.arc(mx, my, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(180, 190, 220, 0.8)';
      ctx.beginPath();
      ctx.arc(mx - 7, my - 4, 5, 0, Math.PI * 2);
      ctx.arc(mx + 6, my + 7, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawHills(ctx) {
    ctx.fillStyle = '#2c3a2a';
    ctx.beginPath();
    ctx.moveTo(0, C.groundY);
    ctx.quadraticCurveTo(320, 520, 640, C.groundY);
    ctx.quadraticCurveTo(960, 545, C.width, C.groundY - 8);
    ctx.lineTo(C.width, C.groundY + 4);
    ctx.lineTo(0, C.groundY + 4);
    ctx.fill();
    // Distant drifting asteroid.
    ctx.fillStyle = '#3a3348';
    ctx.beginPath();
    ctx.ellipse(1050, 180, 46, 26, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a4360';
    ctx.beginPath();
    ctx.ellipse(1036, 172, 12, 7, -0.2, 0, Math.PI * 2);
    ctx.ellipse(1062, 188, 9, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawGround(ctx) {
    const g = ctx.createLinearGradient(0, C.groundY, 0, C.height);
    g.addColorStop(0, '#4a3b28');
    g.addColorStop(0.25, '#3a2f22');
    g.addColorStop(1, '#241c14');
    ctx.fillStyle = g;
    ctx.fillRect(0, C.groundY, C.width, C.height - C.groundY);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, C.groundY, C.width, 3);
    ctx.fillStyle = '#5d4a33';
    for (let i = 0; i < 40; i++) {
      const x = (i * 197.3) % C.width;
      const y = C.groundY + 96 + ((i * 53) % 18);
      ctx.beginPath();
      ctx.ellipse(x, y, 3 + (i % 3), 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawBed(ctx, world, i, now) {
    const r = bedRect(i);
    const bed = world.beds[i];
    ctx.fillStyle = bed.scorched ? '#241a12' : '#2e2115';
    ctx.strokeStyle = bed.scorched ? '#5c3a26' : '#6b5236';
    ctx.lineWidth = 3;
    roundRect(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.fill();
    ctx.stroke();
    // Soil furrows.
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    for (let f = 1; f <= 3; f++) {
      ctx.beginPath();
      ctx.moveTo(r.x + 12, r.y + f * 20);
      ctx.lineTo(r.x + r.w - 12, r.y + f * 20);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), r.x + r.w / 2, r.y + r.h - 8);
    if (bed.scorched) {
      ctx.fillStyle = '#ff8a5c';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText('SCORCHED — click to clear', r.x + r.w / 2, r.y - 8);
      ctx.fillStyle = 'rgba(255, 110, 60, 0.25)';
      ctx.beginPath();
      ctx.ellipse(r.x + r.w / 2, r.y + 34, 34, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (bed.plant) this.drawPlant(ctx, world, bed.plant, r, now);
  }

  drawPlant(ctx, world, plant, r, now) {
    const cx = r.x + r.w / 2;
    const baseY = r.y + 62;
    const kind = C.kinds[plant.kind];
    const g = plant.growth;
    const droop = plant.dry >= 1;
    ctx.strokeStyle = droop ? '#7a7a55' : '#5da24a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    const h = 8 + g * 46;
    const sway = Math.sin(now / 600 + cx) * 3 * g;
    ctx.beginPath();
    ctx.moveTo(cx, baseY);
    ctx.quadraticCurveTo(cx + sway, baseY - h * 0.6, cx + sway * 1.6, baseY - h);
    ctx.stroke();
    // Leaves.
    ctx.fillStyle = droop ? '#6d7a44' : '#69b455';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + side * 10, baseY - h * 0.45, 11, 5, side * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    if (g < 0.35) {
      // Sprout: two small leaves.
      ctx.fillStyle = droop ? '#7d8a4d' : '#8fd07a';
      ctx.beginPath();
      ctx.ellipse(cx - 6, baseY - h, 8, 4, -0.5, 0, Math.PI * 2);
      ctx.ellipse(cx + 6, baseY - h, 8, 4, 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (g < 0.8) {
      // Bud.
      ctx.fillStyle = kind.petal;
      ctx.beginPath();
      ctx.arc(cx + sway * 1.6, baseY - h, 8 + g * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = kind.core;
      ctx.beginPath();
      ctx.arc(cx + sway * 1.6, baseY - h, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Bloom: ring of petals, pulsing.
      const bx = cx + sway * 1.6;
      const by = baseY - h;
      const pulse = 1 + Math.sin(now / 300) * 0.06;
      for (let p = 0; p < 6; p++) {
        const a = (p / 6) * Math.PI * 2 + now / 4000;
        ctx.fillStyle = kind.petal;
        ctx.beginPath();
        ctx.ellipse(bx + Math.cos(a) * 11 * pulse, by + Math.sin(a) * 11 * pulse, 8, 5, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = kind.core;
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(bx - 2, by - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      if (droop) {
        ctx.fillStyle = 'rgba(20,20,10,0.35)';
        ctx.beginPath();
        ctx.arc(bx, by, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Watered sparkle while the boost is active.
    if (plant.boostUntil > world.time) {
      ctx.fillStyle = 'rgba(127, 212, 255, 0.9)';
      for (let d = 0; d < 3; d++) {
        const dx = cx - 14 + d * 14;
        const dy = baseY - 10 - ((now / 240 + d * 13) % 26);
        ctx.beginPath();
        ctx.arc(dx, dy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (droop) {
      ctx.fillStyle = '#ffd27f';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('THIRSTY — click to water', cx, r.y - 8);
    }
  }

  drawSeed(ctx, s, now) {
    const kind = C.kinds[s.kind];
    const bob = Math.sin(now / 240 + s.phase) * 2;
    ctx.save();
    ctx.translate(s.x, s.y + bob);
    ctx.rotate(Math.sin(s.rot) * 0.4);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = kind.petal;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      ctx.fillStyle = kind.petal;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 6, Math.sin(a) * 6, 5.5, 3.4, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = kind.core;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawMeteor(ctx, m) {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.rot);
    ctx.fillStyle = 'rgba(255, 90, 40, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, m.r + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a3630';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rr = m.r * (0.85 + ((i * 37) % 10) / 40);
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff7a3c';
    ctx.beginPath();
    ctx.arc(-m.r * 0.3, -m.r * 0.2, 4, 0, Math.PI * 2);
    ctx.arc(m.r * 0.35, m.r * 0.3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Warning ring so the player can spot it.
    ctx.strokeStyle = 'rgba(255, 120, 70, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r + 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawKeeper(ctx, world, now) {
    const x = world.keeperX;
    const y = C.keeperY;
    const bob = Math.sin(now / 220) * 2;
    const face = world.keeperFace;
    ctx.save();
    ctx.translate(x, y + bob);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 34 - bob, 30, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body: cloak.
    ctx.fillStyle = '#7a5cff';
    ctx.beginPath();
    ctx.moveTo(-16, 32);
    ctx.quadraticCurveTo(-18, -6, 0, -8);
    ctx.quadraticCurveTo(18, -6, 16, 32);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5a3fd4';
    ctx.fillRect(-16, 20, 32, 6);
    // Head.
    ctx.fillStyle = '#ffd9b0';
    ctx.beginPath();
    ctx.arc(0, -16, 11, 0, Math.PI * 2);
    ctx.fill();
    // Wide-brim hat.
    ctx.fillStyle = '#3f6d3a';
    ctx.beginPath();
    ctx.ellipse(0, -22, 19, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-9, -22);
    ctx.quadraticCurveTo(0, -40, 9, -22);
    ctx.closePath();
    ctx.fill();
    // Eye.
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(face * 4, -16, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Basket held out in front.
    const bx = face * 26;
    ctx.strokeStyle = '#8a6a3f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(face * 10, 2);
    ctx.lineTo(bx, -6);
    ctx.stroke();
    ctx.fillStyle = '#a87f4e';
    ctx.beginPath();
    ctx.moveTo(bx - 13, -6);
    ctx.lineTo(bx + 13, -6);
    ctx.lineTo(bx + 9, 10);
    ctx.lineTo(bx - 9, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7c5a34';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx - 13, -1);
    ctx.lineTo(bx + 13, -1);
    ctx.stroke();
    // Seeds already in the basket.
    world.pouch.forEach((kind, i) => {
      ctx.fillStyle = C.kinds[kind].petal;
      ctx.beginPath();
      ctx.arc(bx - 8 + i * 8, -9, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  drawParticles(ctx, world) {
    for (const p of world.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawRain(ctx, now) {
    ctx.strokeStyle = 'rgba(160, 200, 255, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 60; i++) {
      const x = ((i * 211 + now * 0.55) % (C.width + 40)) - 20;
      const y = ((i * 97 + now * 1.1) % 620);
      ctx.moveTo(x, y);
      ctx.lineTo(x - 6, y + 22);
    }
    ctx.stroke();
  }

  drawFireflies(ctx, t, now) {
    if (t < 0.55) return;
    const alpha = Math.min(1, (t - 0.55) / 0.3);
    for (const f of this.fireflies) {
      const x = f.x + Math.sin(now / 900 + f.ph) * 24;
      const y = f.y + Math.cos(now / 700 + f.ph) * 12;
      ctx.globalAlpha = alpha * (0.4 + 0.6 * Math.abs(Math.sin(now / 500 + f.ph)));
      ctx.fillStyle = '#ffe98a';
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawFloaters(ctx, world) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 17px system-ui, sans-serif';
    for (const f of world.floaters) {
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.fillStyle = f.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  drawHud(ctx, world) {
    ctx.fillStyle = 'rgba(10, 12, 26, 0.55)';
    roundRect(ctx, 12, 10, C.width - 24, 54, 12);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // Score.
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(`SCORE ${world.score}`, 28, 34);
    ctx.fillStyle = '#c9c2e8';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(`target ${C.targetScore}`, 28, 53);
    // Day progress: sun arc.
    const px = 300;
    ctx.strokeStyle = '#8f86b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px + 60, 52, 22, Math.PI, 0);
    ctx.stroke();
    const ang = Math.PI + (1 - world.difficulty) * Math.PI;
    const sx = px + 60 + Math.cos(ang) * 22;
    const sy = 52 - Math.sin(ang) * 22;
    ctx.fillStyle = world.difficulty > 0.7 ? '#eef2ff' : '#ffd76a';
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c9c2e8';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(world.difficulty > 0.7 ? 'Night' : 'Day', px + 92, 30);
    ctx.fillText(`${Math.max(0, Math.ceil(C.dayLengthSec - world.time))}s to dusk`, px + 92, 48);
    // Water.
    const wx = 560;
    ctx.fillStyle = '#c9c2e8';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('WATER', wx, 28);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, wx, 33, 130, 12, 6);
    ctx.fill();
    ctx.fillStyle = world.water < C.waterCost ? '#ff7a5c' : '#5fc8ff';
    roundRect(ctx, wx, 33, Math.max(0, 130 * (world.water / C.waterMax)), 12, 6);
    ctx.fill();
    ctx.fillStyle = '#c9c2e8';
    ctx.fillText(`${Math.floor(world.water)}`, wx + 138, 44);
    // Pouch.
    const qx = 760;
    ctx.fillStyle = '#c9c2e8';
    ctx.fillText('POUCH', qx, 28);
    for (let i = 0; i < C.pouchMax; i++) {
      const cx = qx + 12 + i * 26;
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.beginPath();
      ctx.arc(cx, 40, 10, 0, Math.PI * 2);
      ctx.fill();
      if (world.pouch[i]) {
        ctx.fillStyle = C.kinds[world.pouch[i]].petal;
        ctx.beginPath();
        ctx.arc(cx, 40, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Combo + blight + level.
    ctx.textAlign = 'right';
    if (world.combo >= 2) {
      ctx.fillStyle = '#ffb84d';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(`COMBO x${world.combo}`, C.width - 28, 32);
    }
    ctx.fillStyle = '#c9c2e8';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(`Level ${world.level}   Blight ${world.blight}/${C.maxBlight}`, C.width - 28, 54);
    ctx.textAlign = 'left';
    // Bottom hint.
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('Move: mouse / ← →   •   Plant & water: click a bed (or keys 1–6)   •   Water nearest: Space   •   Swat meteors: click them   •   P pause   •   M mute', 28, C.height - 12);
  }

  drawBanner(ctx, world) {
    ctx.fillStyle = 'rgba(10, 12, 26, 0.72)';
    const w = ctx.measureText(world.message).width + 44;
    roundRect(ctx, (C.width - w) / 2, 78, w, 36, 18);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.message, C.width / 2, 101);
    ctx.textAlign = 'left';
  }

  panel(ctx, title, lines, accent) {
    ctx.fillStyle = 'rgba(8, 10, 24, 0.72)';
    ctx.fillRect(0, 0, C.width, C.height);
    const w = 700;
    const h = 130 + lines.length * 30;
    const x = (C.width - w) / 2;
    const y = (C.height - h) / 2;
    ctx.fillStyle = 'rgba(20, 24, 48, 0.95)';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.fillText(title, C.width / 2, y + 58);
    ctx.fillStyle = '#e8e4f8';
    ctx.font = '17px system-ui, sans-serif';
    lines.forEach((line, i) => ctx.fillText(line, C.width / 2, y + 100 + i * 30));
    ctx.textAlign = 'left';
  }

  drawTitle(ctx, world) {
    this.panel(ctx, 'MOONPETAL GROVE', [
      'You keep the last garden on a drifting asteroid.',
      'Catch seeds in your basket, plant them in the soil, water them to bloom.',
      'Swat blight meteors before they crush your plants.',
      `Reach ${C.targetScore} points before dusk.`,
      `Lose a plant to blight ${C.maxBlight} times and the grove withers.`,
      '',
      'Click or press Enter to begin',
    ], '#c9b8ff');
  }

  drawPaused(ctx) {
    this.panel(ctx, 'PAUSED', ['The garden waits.', '', 'P or click to carry on — R restarts the day.'], '#8fd0ff');
  }

  drawEnd(ctx, world, won) {
    const lines = won
      ? [
          `The grove blazes with light — ${world.score} points before dusk.`,
          `Blooms: ${world.stats.bloomed}   Caught: ${world.stats.caught}   Best combo: x${world.bestCombo}`,
          '',
          'Press R or click to play again',
        ]
      : [
          world.loseReason || 'The grove fell silent.',
          `Score: ${world.score} / ${C.targetScore}   Blooms: ${world.stats.bloomed}   Best combo: x${world.bestCombo}`,
          '',
          'Press R or click to try another day',
        ];
    this.panel(ctx, won ? 'THE GROVE BLOOMS!' : 'DUSK FALLS', lines, won ? '#ffd76a' : '#ff8a7a');
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
