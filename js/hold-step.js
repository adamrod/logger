const HOLD_DELAY = 400;
const FIRST_INTERVAL = 200;
const FASTEST_INTERVAL = 100;
const SPEED_UP = 0.85;
const BIG_STEPS_AFTER = 20;
const BIG_STEP = 5;

const stepButton = (event) => event.target.closest('button[data-steps]');
const holdInterval = (repeats) => Math.max(FASTEST_INTERVAL, FIRST_INTERVAL * SPEED_UP ** repeats);
const holdStepSize = (repeats) => (repeats < BIG_STEPS_AFTER ? 1 : BIG_STEP);

export function onHoldStep(container, step) {
  let timer = null;
  let held = false;

  const repeat = (button, repeats) => {
    held = true;
    step(button.dataset, holdStepSize(repeats));
    timer = setTimeout(() => repeat(button, repeats + 1), holdInterval(repeats));
  };
  const stop = () => clearTimeout(timer);

  container.addEventListener('pointerdown', (event) => {
    const button = stepButton(event);
    if (!button) return;
    held = false;
    timer = setTimeout(() => repeat(button, 0), HOLD_DELAY);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => container.addEventListener(type, stop));
  container.addEventListener('contextmenu', (event) => { if (stepButton(event)) event.preventDefault(); });
  container.addEventListener('click', (event) => {
    if (held && stepButton(event)) event.stopPropagation();
    held = false;
  }, true);
}
