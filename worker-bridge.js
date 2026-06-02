// Bridge between the static GitHub Pages editor and Cloudflare Worker API.
// Users do not need GitHub tokens in the browser.
window.BEZDNA_WORKER_URL = window.BEZDNA_WORKER_URL || 'https://saitna.xomein0165.workers.dev';
window.BEZDNA_PROJECT = new URLSearchParams(location.search).get('project') || 'bezdna-main';

let __syncingFromWorker = false;
let __localDirty = false;
let __lastLocalJson = '';
let __lastRemoteJson = '';
let __pendingRemote = null;
let __autoSaveTimer = null;
let __pollTimer = null;
let __lastUserInputAt = 0;

function workerKey() {
  const params = new URLSearchParams(location.search);
  return params.get('key') || localStorage.getItem('bezdna_room_key') || '';
}

function workerUser() {
  let name = localStorage.getItem('bezdna_user_name');
  if (!name) {
    name = prompt('Имя для совместной работы') || ('Гость-' + Math.floor(Math.random() * 999));
    localStorage.setItem('bezdna_user_name', name);
  }
  return name;
}

async function workerRequest(path, options = {}) {
  const url = window.BEZDNA_WORKER_URL + path;
  const res = await fetch(url, options);
  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error((data && data.error) || ('HTTP ' + res.status));
  return data;
}

function showWorkerError(prefix, error) {
  const message = prefix + ': ' + (error && error.message ? error.message : String(error));
  console.error(message, error);
  if (typeof status === 'function') status(message);
  alert(message);
}

function stateJson() {
  try {
    state.selectedId = selected;
    return JSON.stringify(state);
  } catch (_) {
    return localStorage.getItem('bezdna_state_v3') || '';
  }
}

function isUserEditingNow() {
  const a = document.activeElement;
  const inField = a && a.matches && a.matches('input, textarea, select');
  return Boolean(inField) || (Date.now() - __lastUserInputAt < 1400);
}

function markLocalChanged() {
  if (__syncingFromWorker) return;
  const current = stateJson();
  if (!current || current === __lastLocalJson) return;
  __lastLocalJson = current;
  __localDirty = true;
  scheduleWorkerSave();
}

function scheduleWorkerSave() {
  clearTimeout(__autoSaveTimer);
  __autoSaveTimer = setTimeout(() => {
    saveWorkerProject(false).catch(e => {
      if (typeof status === 'function') status('Ошибка автосохранения: ' + e.message);
      console.error(e);
    });
  }, 1600);
}

function applyRemoteState(remoteState, showMessage = false) {
  __syncingFromWorker = true;
  try {
    state = remoteState;
    selected = state.selectedId || selected || state.nodes?.[0]?.id;
    __lastRemoteJson = JSON.stringify(remoteState);
    __lastLocalJson = __lastRemoteJson;
    __localDirty = false;
    localStorage.setItem('bezdna_state_v3', __lastRemoteJson);
    render();
    if (showMessage && typeof status === 'function') status('Загружено из общего GitHub-хранилища');
  } finally {
    __syncingFromWorker = false;
  }
}

async function loadWorkerProject(showMessage = true, force = false) {
  const project = window.BEZDNA_PROJECT;
  const data = await workerRequest('/api/project?project=' + encodeURIComponent(project));
  if (data.exists && data.state) {
    const remoteJson = JSON.stringify(data.state);
    const currentJson = stateJson();

    if (!force && remoteJson === currentJson) {
      __lastRemoteJson = remoteJson;
      __lastLocalJson = currentJson;
      __localDirty = false;
      if (showMessage) status('Уже актуально');
      return true;
    }

    if (!force && (__localDirty || isUserEditingNow())) {
      __pendingRemote = data.state;
      if (showMessage) status('Есть обновление от другого, но твои правки не перезаписаны');
      return true;
    }

    applyRemoteState(data.state, showMessage);
    return true;
  }
  if (showMessage) status('Общий проект ещё пустой. Нажми Сохранить всем.');
  return false;
}

async function saveWorkerProject(showMessage = true) {
  state.selectedId = selected;
  const payload = {
    project: window.BEZDNA_PROJECT,
    key: workerKey(),
    user: workerUser(),
    state
  };
  await workerRequest('/api/project?project=' + encodeURIComponent(window.BEZDNA_PROJECT), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  __localDirty = false;
  __lastLocalJson = stateJson();
  __lastRemoteJson = __lastLocalJson;
  if (showMessage) status('Сохранено в общий проект');
}

async function uploadWorkerFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  const data = await workerRequest('/api/upload?project=' + encodeURIComponent(window.BEZDNA_PROJECT), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project: window.BEZDNA_PROJECT,
      key: workerKey(),
      user: workerUser(),
      nodeId: selected,
      fileName: file.name,
      contentBase64: btoa(binary)
    })
  });
  const n = node(selected);
  n.files = n.files || [];
  n.files.push({ name: file.name, path: data.path, url: data.url });
  saveLocal();
  render();
  await saveWorkerProject();
}

window.loadGitHub = async function () {
  try {
    if (__localDirty && !confirm('Есть несохранённые локальные изменения. Загрузить общий проект и заменить их?')) return false;
    return await loadWorkerProject(true, true);
  } catch (error) {
    showWorkerError('Ошибка загрузки из Worker', error);
    return false;
  }
};
window.saveGitHub = async function () {
  try { return await saveWorkerProject(true); }
  catch (error) { showWorkerError('Ошибка сохранения в Worker', error); return false; }
};
window.uploadFile = async function (file) {
  try { return await uploadWorkerFile(file); }
  catch (error) { showWorkerError('Ошибка загрузки файла', error); return false; }
};
window.shareGitHub = function () {
  const url = location.origin + location.pathname + '?project=' + encodeURIComponent(window.BEZDNA_PROJECT);
  navigator.clipboard?.writeText(url);
  alert('Ссылка скопирована:\n' + url);
};
window.setName = function () {
  const old = localStorage.getItem('bezdna_user_name') || '';
  const name = prompt('Имя для совместной работы', old) || old;
  if (name) localStorage.setItem('bezdna_user_name', name);
};
window.scheduleSave = scheduleWorkerSave;
window.applyPendingRemote = function () {
  if (!__pendingRemote) return status('Нет ожидающих обновлений');
  if (__localDirty && !confirm('Есть твои несохранённые правки. Применить внешнее обновление поверх них?')) return;
  applyRemoteState(__pendingRemote, true);
  __pendingRemote = null;
};

document.addEventListener('input', () => { __lastUserInputAt = Date.now(); setTimeout(markLocalChanged, 80); }, true);
document.addEventListener('change', () => { __lastUserInputAt = Date.now(); setTimeout(markLocalChanged, 80); }, true);
document.addEventListener('pointerup', () => setTimeout(markLocalChanged, 120), true);

window.addEventListener('load', async () => {
  try {
    __lastLocalJson = stateJson();
    await loadWorkerProject(false, false);
    status('Онлайн через Cloudflare Worker');
    clearInterval(__pollTimer);
    __pollTimer = setInterval(() => loadWorkerProject(false, false).catch(() => {}), 2500);
    setInterval(markLocalChanged, 900);
  } catch (e) {
    status('Worker не подключился: ' + e.message);
  }
});
