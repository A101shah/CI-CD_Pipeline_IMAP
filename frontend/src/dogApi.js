export const API_BASE = 'https://dogapi.dog/api/v2';

async function getJSON(path, signal) {
  const response = await fetch(API_BASE + path, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Dog API returned HTTP ' + response.status + '. Please try again.');
  const body = await response.json();
  if (!body || !Array.isArray(body.data)) throw new Error('Dog API returned an unexpected response.');
  return body.data;
}

export async function getBreeds(signal) {
  return getJSON('/breeds?page[size]=1000&filter[has_images]=true', signal);
}

export async function getGroups(signal) {
  return getJSON('/groups', signal);
}

export async function getFact(signal) {
  const facts = await getJSON('/facts?limit=1', signal);
  return facts[0]?.attributes?.body || 'Dogs make every day a little brighter.';
}
