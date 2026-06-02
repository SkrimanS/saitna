// Bridge between the static GitHub Pages editor and Cloudflare Worker API.
// Users do not need GitHub tokens in the browser.
window.BEZDNA_WORKER_URL = window.BEZDNA_WORKER_URL || 'https://saitna.xomein0165.workers.dev';
window.BEZDNA_PROJECT = new URLSearchParams(location.search).get('project') || 'bezdna-main';

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

async function loadWorkerProject(showMessage = true) {
  const project = window.BEZDNA_PROJECT;
  const data = await workerRequest('/api/project?project=' + encodeURIComponent(project));
  if (data.exists && data.state) {
    state = data.state;
    selected = state.selectedId || selected || state.nodes?.[0]?.id;
    localStorage.setItem('bezdna_state_v3', JSON.stringify(state));
    render();
    if (showMessage) status('Загружено из общего GitHub-хранилища');
    return true;
  }
  if (showMessage) status('Общий проект ещё пустой. Нажми Сохранить.');
  return false;
}

async function saveWorkerProject() {
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
  status('Сохранено в общий проект');
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

// Override old direct-GitHub browser functions from app.js.
window.loadGitHub = async function () { return loadWorkerProject(true); };
window.saveGitHub = async function () { return saveWorkerProject(); };
window.uploadFile = async function (file) { return uploadWorkerFile(file); };
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
window.scheduleSave = function () {
  clearTimeout(window.__workerSaveTimer);
  window.__workerSaveTimer = setTimeout(() => saveWorkerProject().catch(e => status('Ошибка сохранения: ' + e.message)), 1200);
};

window.addEventListener('load', async () => {
  try {
    const ghBox = document.getElementById('ghRepo')?.closest('.card');
    if (ghBox) {
      ghBox.innerHTML = `
        <b>Общий онлайн-проект</b>
        <div id="status" class="tiny">Подключение к Cloudflare Worker...</div>
        <p class="tiny">Хранилище: GitHub через Cloudflare Worker. Токены людям не нужны.</p>
        <div class="row">
          <button class="btn green" onclick="saveGitHub()">Сохранить всем</button>
          <button class="btn" onclick="loadGitHub()">Обновить</button>
          <button class="btn" onclick="shareGitHub()">Ссылка</button>
          <button class="btn" onclick="setName()">Имя</button>
        </div>`;
    }
    await loadWorkerProject(false);
    status('Онлайн через Cloudflare Worker');
    setInterval(() => loadWorkerProject(false).catch(() => {}), 7000);
  } catch (e) {
    status('Worker не подключился: ' + e.message);
  }
});
