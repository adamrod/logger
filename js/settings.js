import { notifyChange } from './events.js';

const STORAGE_KEY = 'logger.settings';
const DEFAULTS = { owner: '', repo: '', token: '' };

let settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };

export const getSettings = () => settings;

export const isSyncConfigured = () => Boolean(settings.owner && settings.repo && settings.token);

export function updateSettings(changes) {
  settings = { ...settings, ...changes };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  notifyChange();
}
