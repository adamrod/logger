const storage = new Map();
let fetchHandler = () => { throw new Error('Unexpected fetch'); };

export function handleFetch(handler) {
  fetchHandler = handler;
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
globalThis.setInterval = () => 0;
globalThis.clearTimeout = () => {};
globalThis.navigator = { onLine: true };
globalThis.window = { addEventListener: () => {} };
globalThis.document = { getElementById: () => ({}), addEventListener: () => {}, visibilityState: 'visible' };

localStorage.setItem('logger.settings', JSON.stringify({ owner: 'owner', repo: 'repo', token: 'token' }));
