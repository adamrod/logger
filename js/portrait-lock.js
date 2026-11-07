export function initPortraitLock() {
  const { orientation } = screen;
  if (!orientation) return;
  const holdUpright = () => { document.documentElement.dataset.turn = (orientation.angle + 360) % 360; };
  orientation.addEventListener('change', holdUpright);
  holdUpright();
}
