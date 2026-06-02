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

async function loadProjectFromGithub(env, project) {
  const file = await fetchGithubFile(env, `data/${project}.json`);
  if (!file) return null;
  return { state: JSON.parse(decodeGithubContent(file)), sha: file.sha };
}

async function saveProjectToGithub(env, project, state, user = 'unknown') {
  state.meta = state.meta || {};
  state.meta.lastSavedBy = user;
  state.meta.lastSavedAt = new Date().toISOString();
  const result = await putGithubFile(env, `data/${project}.json`, encodeBase64(JSON.stringify(state, null, 2)), `Save Bezdna project ${project}`);
  return result.content?.sha || null;
}

function applyNodePatch(state, nodeId, patch) {
  const n = state.nodes?.find(x => x.id === nodeId);
  if (!n) return false;
  Object.assign(n, patch || {});
  return true;
}

function applyDialogPatch(state, nodeId, dialogs) {
  state.dialogs = state.dialogs || {};
  state.dialogs[nodeId] = Array.isArray(dialogs) ? dialogs : [];
  return true;
}

function applyLinkPatch(state, link) {
  state.links = state.links || [];
  if (!link || !link.from || !link.to) return false;
  const id = link.id || `live_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const existing = state.links.findIndex(l => l.id === id || (l.from === link.from && l.to === link.to && l.label === link.label));
  const value = { id, type: 'branch', label: '', ...link };
  if (existing >= 0) state.links[existing] = { ...state.links[existing], ...value };
  else state.links.push(value);
  return true;
}

export class ProjectRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sessions = new Map();
    this.project = null;
    this.state = null;
    this.rev = 0;
    this.locks = {};
    this.users = {};
    this.lastBackupAt = 0;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const project = safeName(url.searchParams.get('project') || 'bezdna-main');
    this.project = this.project || project;

    if (request.headers.get('Upgrade') !== 'websocket') {
      await this.ensureLoaded(project);
      return json({ ok: true, live: true, project, users: Object.values(this.users), rev: this.rev });
    }

    await this.ensureLoaded(project);
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();

    const id = crypto.randomUUID();
    const name = safeName(url.searchParams.get('user') || 'Гость', 'Гость');
    const session = { id, name, ws: server, locks: new Set(), joinedAt: Date.now() };
    this.sessions.set(id, session);
    this.users[id] = { id, name, joinedAt: session.joinedAt };

    this.send(server, { type: 'hello', id, project, rev: this.rev, state: this.state, users: Object.values(this.users), locks: this.locks });
    this.broadcast({ type: 'presence', users: Object.values(this.users), locks: this.locks }, id);

    server.addEventListener('message', event => this.onMessage(id, event.data).catch(error => this.send(server, { type: 'error', error: error.message || String(error) })));
    server.addEventListener('close', () => this.closeSession(id));
    server.addEventListener('error', () => this.closeSession(id));
    return new Response(null, { status: 101, webSocket: client });
  }

  async ensureLoaded(project) {
    if (this.state) return;
    const storedState = await this.ctx.storage.get('state');
    const storedRev = await this.ctx.storage.get('rev');
    const storedBackupAt = await this.ctx.storage.get('lastBackupAt');
    if (storedState) {
      this.state = storedState;
      this.rev = storedRev || 1;
      this.lastBackupAt = storedBackupAt || 0;
      return;
    }
    const gh = await loadProjectFromGithub(this.env, project);
    this.state = gh?.state || { nodes: [], links: [], dialogs: {}, meta: {} };
    this.rev = 1;
    this.lastBackupAt = 0;
    await this.persist();
  }

  send(ws, data) {
    try { ws.send(JSON.stringify(data)); } catch (_) {}
  }

  broadcast(data, exceptId = null) {
    for (const [id, session] of this.sessions) {
      if (id === exceptId) continue;
      this.send(session.ws, data);
    }
  }

  closeSession(id) {
    const session = this.sessions.get(id);
    if (!session) return;
    for (const nodeId of session.locks) {
      if (this.locks[nodeId]?.by === id) delete this.locks[nodeId];
    }
    delete this.users[id];
    this.sessions.delete(id);
    this.broadcast({ type: 'presence', users: Object.values(this.users), locks: this.locks });
  }

  async persist() {
    await this.ctx.storage.put('state', this.state);
    await this.ctx.storage.put('rev', this.rev);
    await this.ctx.storage.put('lastBackupAt', this.lastBackupAt);
  }

  async maybeBackup(user) {
    const interval = Math.max(60, Number(this.env.BACKUP_INTERVAL_SECONDS || 300)) * 1000;
    if (Date.now() - this.lastBackupAt < interval) return;
    this.lastBackupAt = Date.now();
    await this.ctx.storage.put('lastBackupAt', this.lastBackupAt);
    if (!this.env.GITHUB_TOKEN) return;
    try {
      await saveProjectToGithub(this.env, this.project || 'bezdna-main', this.state, user || 'live-room');
      this.broadcast({ type: 'backup', at: new Date().toISOString(), by: user || 'live-room' });
    } catch (error) {
      this.broadcast({ type: 'backup_error', error: error.message || String(error) });
    }
  }

  async onMessage(id, raw) {
    const session = this.sessions.get(id);
    if (!session) return;
    let msg;
    try { msg = JSON.parse(raw); } catch (_) { return; }

    if (msg.type === 'ping') return this.send(session.ws, { type: 'pong', t: Date.now() });
    if (msg.type === 'full_state') return this.replaceFullState(id, msg.state, msg.note || 'full_state');
    if (msg.type === 'lock') return this.lockNode(id, msg.nodeId);
    if (msg.type === 'unlock') return this.unlockNode(id, msg.nodeId);
    if (msg.type === 'patch') return this.applyPatchMessage(id, msg);
    if (msg.type === 'save_backup') {
      await saveProjectToGithub(this.env, this.project || 'bezdna-main', this.state, session.name);
      this.lastBackupAt = Date.now();
      await this.persist();
      this.broadcast({ type: 'backup', at: new Date().toISOString(), by: session.name });
    }
  }

  lockNode(id, nodeId) {
    if (!nodeId) return;
    const current = this.locks[nodeId];
    if (current && current.by !== id && Date.now() - current.at < 45000) {
      const owner = this.users[current.by]?.name || 'другой пользователь';
      return this.send(this.sessions.get(id).ws, { type: 'lock_denied', nodeId, owner });
    }
    const session = this.sessions.get(id);
    this.locks[nodeId] = { by: id, name: session.name, at: Date.now() };
    session.locks.add(nodeId);
    this.broadcast({ type: 'locks', locks: this.locks });
  }

  unlockNode(id, nodeId) {
    if (!nodeId) return;
    if (this.locks[nodeId]?.by === id) delete this.locks[nodeId];
    this.sessions.get(id)?.locks.delete(nodeId);
    this.broadcast({ type: 'locks', locks: this.locks });
  }

  async replaceFullState(id, nextState, note) {
    if (!nextState || typeof nextState !== 'object') return;
    const session = this.sessions.get(id);
    nextState.meta = nextState.meta || {};
    nextState.meta.liveUpdatedBy = session.name;
    nextState.meta.liveUpdatedAt = new Date().toISOString();
    this.state = nextState;
    this.rev++;
    await this.persist();
    this.broadcast({ type: 'state', state: this.state, rev: this.rev, by: session.name, note }, id);
    await this.maybeBackup(session.name);
  }

  async applyPatchMessage(id, msg) {
    const session = this.sessions.get(id);
    if (!session || !this.state) return;
    let ok = false;
    if (msg.kind === 'move_node') ok = applyNodePatch(this.state, msg.nodeId, { x: msg.x, y: msg.y });
    if (msg.kind === 'update_node') ok = applyNodePatch(this.state, msg.nodeId, msg.patch || {});
    if (msg.kind === 'update_dialog') ok = applyDialogPatch(this.state, msg.nodeId, msg.dialogs);
    if (msg.kind === 'add_link') ok = applyLinkPatch(this.state, msg.link);
    if (!ok) return;
    this.rev++;
    this.state.meta = this.state.meta || {};
    this.state.meta.liveUpdatedBy = session.name;
    this.state.meta.liveUpdatedAt = new Date().toISOString();
    await this.persist();
    this.broadcast({ type: 'patch', rev: this.rev, by: session.name, locks: this.locks, ...msg }, id);
    await this.maybeBackup(session.name);
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    try {
      const url = new URL(request.url);
      const project = safeName(url.searchParams.get('project') || 'bezdna-main');

      if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
        return json({ ok: true, service: 'bezdna-editor-api', project, live: Boolean(env.PROJECT_ROOM) });
      }

      if (url.pathname === '/api/live') {
        const id = env.PROJECT_ROOM.idFromName(project);
        return env.PROJECT_ROOM.get(id).fetch(request);
      }

      if (!env.GITHUB_TOKEN) return json({ error: 'Worker secret GITHUB_TOKEN is not set' }, 500);

      if (request.method === 'GET' && url.pathname === '/api/project') {
        const file = await fetchGithubFile(env, `data/${project}.json`);
        if (!file) return json({ exists: false, project, state: null });
        return json({ exists: true, project, state: JSON.parse(decodeGithubContent(file)), updated_at: file.sha });
      }

      if (request.method === 'POST' && url.pathname === '/api/project') {
        const body = await request.json();
        if (!checkPassword(env, body)) return json({ error: 'Wrong project password' }, 403);
        const projectId = safeName(body.project || project);
        const state = body.state;
        if (!state || typeof state !== 'object') return json({ error: 'Missing state object' }, 400);
        const sha = await saveProjectToGithub(env, projectId, state, body.user || 'unknown');
        return json({ ok: true, project: projectId, sha });
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
