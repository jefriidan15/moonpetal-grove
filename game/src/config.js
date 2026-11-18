// Moonpetal Grove — configuration. All tuning lives here so the game can be
// balanced without touching the simulation.
export const CONFIG = {
  width: 1280,
  height: 720,
  groundY: 600, // top edge of the soil strip
  bedCount: 6,
  targetScore: 900, // reach this before dusk to win
  dayLengthSec: 150, // one full day; dusk ends the game
  maxBlight: 5, // plants destroyed by meteors before the grove withers
  pouchMax: 3, // seeds the keeper can carry at once
  waterMax: 100,
  waterCost: 15, // per watering
  rainEverySec: 26, // a rain shower refills part of the water meter
  rainAmount: 35,
  keeperSpeed: 620, // px per second (keyboard)
  keeperY: 560,
  // Falling things: spawn interval shrinks as the night deepens.
  seedIntervalStart: 2.1,
  seedIntervalEnd: 1.15,
  meteorIntervalStart: 7.5,
  meteorIntervalEnd: 4.2,
  fallSpeedStart: 95,
  fallSpeedEnd: 175,
  // Seed kinds: value, growth seconds (unwatered), rarity weight.
  kinds: {
    moonpetal: { value: 40, growSec: 9, weight: 55, petal: '#c9b8ff', core: '#f4ecff' },
    sunberry: { value: 80, growSec: 14, weight: 32, petal: '#ffb84d', core: '#fff3c4' },
    starfern: { value: 150, growSec: 20, weight: 13, petal: '#7fe7ff', core: '#eafcff' },
  },
  // Combo: every consecutive catch without a seed touching the ground adds
  // +10% score, capped at +100%.
  comboStep: 0.1,
  comboCap: 1.0,
  swatScore: 10,
};
