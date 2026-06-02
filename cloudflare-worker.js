const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function safeName(value, fallback = 'bezdna-main') {
  return String(value || fallback).replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]/g, '_').slice(0, 80) || fallback;
}

function encodeBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
}

function repoParts(env) {
  const repo = env.REPO || 'SkrimanS/saitna';
  const [owner, name] = repo.split('/');
  return { repo, owner, name, branch: env.BRANCH || 'main' };
}

function ghHeaders(env) {
  return {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
    'User-Agent': 'bezdna-editor-worker'
  };
}

function checkPassword(env, body) {
  if (!env.PROJECT_PASSWORD) return true;
  return body && body.key === env.PROJECT_PASSWORD;
}

async function fetchGithubFile(env, path) {
  const { owner, name, branch } = repoParts(env);
  const url = `https://api.github.com/repos/${owner}/${name}/contents/${path}?ref=${encodeURIComponent(branch)}&cacheBust=${Date.now()}`;
  const res = await fetch(url, { headers: ghHeaders(env) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function putGithubFileOnce(env, path, contentBase64, message) {
  const { owner, name, branch } = repoParts(env);
  const current = await fetchGithubFile(env, path);
  const body = { message, branch, content: contentBase64 };
  if (current && current.sha) body.sha = current.sha;
  const url = `https://api.github.com/repos/${owner}/${name}/contents/${path}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...ghHeaders(env), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) {}
  if (!res.ok) {
    const err = new Error((data && data.message) || text || `GitHub HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function putGithubFile(env, path, contentBase64, message) {
  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await putGithubFileOnce(env, path, contentBase64, message);
    } catch (error) {
      lastError = error;
      const isConflict = error.status === 409 || String(error.message || '').includes('does not match');
      if (!isConflict || attempt === 4) throw error;
      await new Promise(resolve => setTimeout(resolve, 250 * attempt));
    }
  }
  throw lastError;
}

function decodeGithubContent(file) {
  const raw = String(file.content || '').replace(/\s/g, '');
  const bin = atob(raw);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    try {
      const url = new URL(request.url);
      const project = safeName(url.searchParams.get('project') || 'bezdna-main');

      if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
        return json({ ok: true, service: 'bezdna-editor-api', project });
      }

      if (!env.GITHUB_TOKEN) return json({ error: 'Worker secret GITHUB_TOKEN is not set' }, 500);

      if (request.method === 'GET' && url.pathname === '/api/project') {
        const path = `data/${project}.json`;
        const file = await fetchGithubFile(env, path);
        if (!file) return json({ exists: false, project, state: null });
        return json({ exists: true, project, state: JSON.parse(decodeGithubContent(file)), updated_at: file.sha });
      }

      if (request.method === 'POST' && url.pathname === '/api/project') {
        const body = await request.json();
        if (!checkPassword(env, body)) return json({ error: 'Wrong project password' }, 403);
        const projectId = safeName(body.project || project);
        const state = body.state;
        if (!state || typeof state !== 'object') return json({ error: 'Missing state object' }, 400);
        state.meta = state.meta || {};
        state.meta.lastSavedBy = body.user || 'unknown';
        state.meta.lastSavedAt = new Date().toISOString();
        const path = `data/${projectId}.json`;
        const result = await putGithubFile(env, path, encodeBase64(JSON.stringify(state, null, 2)), `Save Bezdna project ${projectId}`);
        return json({ ok: true, project: projectId, sha: result.content?.sha || null });
      }

      if (request.method === 'POST' && url.pathname === '/api/upload') {
        const body = await request.json();
        if (!checkPassword(env, body)) return json({ error: 'Wrong project password' }, 403);
        const projectId = safeName(body.project || project);
        const nodeId = safeName(body.nodeId || 'global');
        const fileName = safeName(body.fileName || 'file.bin', 'file.bin');
        if (!body.contentBase64) return json({ error: 'Missing contentBase64' }, 400);
        const path = `uploads/${projectId}/${nodeId}/${Date.now()}_${fileName}`;
        await putGithubFile(env, path, body.contentBase64, `Upload ${fileName}`);
        const { repo, branch } = repoParts(env);
        return json({ ok: true, path, url: `https://github.com/${repo}/blob/${branch}/${path}` });
      }

      return json({ error: 'Not found', path: url.pathname }, 404);
    } catch (error) {
      return json({ error: error.message || String(error), status: error.status || 500 }, error.status || 500);
    }
  }
};
