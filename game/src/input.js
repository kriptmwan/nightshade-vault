// Nightshade Vault — keyboard and mouse. WASD or arrows move, Shift sneaks,
// click throws a pebble at the cursor, M mutes, R restarts, P pauses.
// The game reads this through one object, so the loop never touches the DOM.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, clicked: false };
    this.canvas = canvas;
    this.onKey = null;
    this.onClick = null;
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
      if (!event.repeat) {
        this.keys.add(event.key.toLowerCase());
        if (this.onKey) this.onKey(event.key.toLowerCase());
      }
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = event.clientX - rect.left;
      this.mouse.y = event.clientY - rect.top;
    });
    canvas.addEventListener('mousedown', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = event.clientX - rect.left;
      this.mouse.y = event.clientY - rect.top;
      this.mouse.clicked = true;
      if (this.onClick) this.onClick(this.mouse.x, this.mouse.y);
    });
  }

  // Normalised movement vector from the held keys, or {0,0} when idle.
  moveVector() {
    let mx = 0;
    let my = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) mx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) mx += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) my -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) my += 1;
    return { mx, my };
  }

  get sneak() {
    return this.keys.has('shift');
  }
}
