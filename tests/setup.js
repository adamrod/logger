const storage = new Map();
const elements = new Map();
let fetchHandler = () => { throw new Error('Unexpected fetch'); };

export function handleFetch(handler) {
  fetchHandler = handler;
}

function createElement() {
  const listeners = [];
  let value = '';
  return {
    get value() { return value; },
    set value(text) { value = String(text); },
    addEventListener: (type, listener) => listeners.push({ type, listener }),
    dispatch: (type, event) => listeners.filter((entry) => entry.type === type).forEach(({ listener }) => listener(event)),
    setAttribute: () => {},
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ top: 0 }),
    style: {},
    focus() { document.activeElement = this; },
    blur() { if (document.activeElement === this) document.activeElement = null; },
  };
}

export function element(id) {
  if (!elements.has(id)) elements.set(id, createElement());
  return elements.get(id);
}

globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
};

globalThis.TextEncoder = class {
  encode(text) {
    return Uint8Array.from(unescape(encodeURIComponent(text)), (char) => char.charCodeAt(0));
  }
};

globalThis.TextDecoder = class {
  decode(bytes) {
    return decodeURIComponent(escape(String.fromCharCode(...bytes)));
  }
};

globalThis.fetch = (...args) => fetchHandler(...args);
globalThis.AbortSignal = { timeout: (ms) => ({ timeoutMs: ms }) };
globalThis.setInterval = () => 0;
globalThis.clearTimeout = () => {};
globalThis.navigator = { onLine: true };
globalThis.window = { addEventListener: () => {}, innerHeight: 844 };
globalThis.document = { getElementById: element, addEventListener: () => {}, visibilityState: 'visible' };

localStorage.setItem('logger.settings', JSON.stringify({ owner: 'owner', repo: 'repo', token: 'token' }));
