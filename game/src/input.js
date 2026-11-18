// Keyboard + mouse input. The keeper follows the pointer; arrow keys / A-D
// move him too. Clicks plant, water and swat depending on what is under the
// cursor. All state is plain fields the world reads each frame.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.pointerX = canvas.width / 2;
    this.pointerY = canvas.height / 2;
    this.pointerDown = false;
    this.clicked = null; // {x, y} consumed once by the world
    this.keys = new Set();
    this.left = false;
    this.right = false;

    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.pointerX = ((e.clientX - r.left) / r.width) * canvas.width;
      this.pointerY = ((e.clientY - r.top) / r.height) * canvas.height;
    });
    canvas.addEventListener('pointerdown', (e) => {
      this.pointerDown = true;
      const r = canvas.getBoundingClientRect();
      this.clicked = {
        x: ((e.clientX - r.left) / r.width) * canvas.width,
        y: ((e.clientY - r.top) / r.height) * canvas.height,
      };
    });
    window.addEventListener('pointerup', () => { this.pointerDown = false; });
    window.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }
      this.keys.add(e.key.toLowerCase());
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.right = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.right = false;
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.left = false;
      this.right = false;
    });
  }

  consumeClick() {
    const c = this.clicked;
    this.clicked = null;
    return c;
  }

  consumeKey(key) {
    key = key.toLowerCase();
    if (this.keys.has(key)) {
      this.keys.delete(key);
      return true;
    }
    return false;
  }
}
