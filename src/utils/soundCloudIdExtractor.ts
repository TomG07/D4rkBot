let id = '';

const SCRIPT_REGEX = /https:\/\/[A-Za-z0-9-.]+\/assets\/[a-f0-9-]+\.js/g
const CLIENT_ID_REGEX = /,client_id:"(\w+)"/

export default async function soundCloudIdExtractor(): Promise<string | null> {
  if (id) return id;

  const httpRes = await fetch('https://soundcloud.com').then(r => r.text());
  const scripts = httpRes.match(SCRIPT_REGEX);

  if (!scripts) return null;

  const scriptRes = await fetch(scripts[scripts.length - 1]).then(r => r.text());
  const clientId = scriptRes.match(CLIENT_ID_REGEX);

  if (!clientId) return null;

  id = clientId[1]

  return id;
}