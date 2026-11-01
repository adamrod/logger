export function highlight(element) {
  element.classList.add('is-changed');
  element.addEventListener('animationend', () => element.classList.remove('is-changed'), { once: true });
}
