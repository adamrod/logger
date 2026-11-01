import { readFileSync } from 'node:fs';

Object.defineProperty(globalThis, 'navigator', { value: undefined, writable: true, configurable: true });
globalThis.readFile = (path) => readFileSync(path, 'utf8');
globalThis.print = console.log;
