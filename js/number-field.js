import { roundValue } from './format.js';

export const INTEGER = { invalidChars: /[^0-9]/g, parse: (text) => parseInt(text, 10) };
export const DECIMAL = { invalidChars: /[^0-9.,]/g, parse: (text) => parseFloat(text.replace(',', '.')) };

export function bindNumberInput(input, { invalidChars }, onInput) {
  input.addEventListener('input', () => {
    input.value = input.value.replace(invalidChars, '');
    onInput();
  });
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter') input.blur(); });
}

export function stepInput(input, { parse, step, min }, direction) {
  const value = parse(input.value);
  const next = Number.isNaN(value) ? min : roundValue(value + direction * step);
  input.value = Math.max(min, next);
}
