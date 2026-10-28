const API = 'https://api.github.com';
const ERRORS = {
  401: 'The access token was rejected.',
  403: 'The token has no access to this repository.',
  404: 'Repository not found, or the token can’t see it.',
  409: 'The repository changed during sync. Try again.',
  422: 'GitHub rejected the update. Try again.',
};

export async function readFile(repo, path) {
  const file = await request(repo, path);
  return file && { text: decodeBase64(file.content), sha: file.sha };
}

export function writeFile(repo, path, text, sha) {
  const body = JSON.stringify({ message: `Update ${path} from Logger`, content: encodeBase64(text), sha });
  return request(repo, path, { method: 'PUT', body });
}

async function request({ owner, repo, token }, path, options = {}) {
  const response = await fetch(`${API}/repos/${owner}/${repo}/contents/${path}`, {
    ...options,
    cache: 'no-store',
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` },
  }).catch(() => { throw new Error('Can’t reach GitHub. Check your connection.'); });
  if (response.status === 404 && !options.method) return null;
  if (!response.ok) throw new Error(ERRORS[response.status] ?? `GitHub error ${response.status}.`);
  return response.json();
}

function encodeBase64(text) {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(base64) {
  const binary = atob(base64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}
