// Skyline Run — keyboard and mouse input. One object, read by the game loop:
// throttle up/down, turn left/right, climb/descend, brake, pause, restart.
export function createInput(canvas) {
  const keys = new Set();
  const input = {
    mouseX: 0, mouseActive: false,
    get throttleUp() { return keys.has('KeyW') || keys.has('ArrowUp') && false; },
    get throttleDown() { return keys.has('KeyS'); },
    get turnLeft() { return keys.has('KeyA') || keys.has('ArrowLeft'); },
    get turnRight() { return keys.has('KeyD') || keys.has('ArrowRight'); },
    get climb() { return keys.has('ArrowUp'); },
    get descend() { return keys.has('ArrowDown'); },
    get brake() { return keys.has('Space'); },
  };

  const down = (e) => {
    if (e.code === 'Space') e.preventDefault();
    keys.add(e.code);
    input.onKey?.(e.code);
  };
  const up = (e) => keys.delete(e.code);
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = (e.clientX - rect.left) / rect.width - 0.5;
    input.mouseActive = true;
  });
  canvas.addEventListener('mousedown', (e) => {
    input.mouseActive = true;
    input.onClick?.(e);
  });
  canvas.addEventListener('mouseleave', () => { input.mouseActive = false; });
  return input;
}
