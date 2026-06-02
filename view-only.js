(function(){
  const params = new URLSearchParams(location.search);
  if (params.get('view') !== '1') return;

  const WRITE_WORDS = ['Сохранить', 'Новый', 'Удалить', 'Реплика', 'ответ', 'Загрузить', 'Импорт', 'В избранное'];
  const WRITE_FNS = ['saveGitHub','uploadFile','saveQuest','addNode','delNode','addLine','addChoice','delLine','lUpd','cUpd'];
  let lastSnapshot = '';
  let armed = false;

  function run(code){ return (0, eval)(code); }
  function block(){ alert('Это режим просмотра. Редактирование отключено.'); return false; }
  function isWriteText(text){ return WRITE_WORDS.some(w => String(text || '').includes(w)); }

  function snapshot(){
    try { return run('JSON.stringify(state)'); }
    catch(_) { return localStorage.getItem('bezdna_state_v3') || ''; }
  }

  function restoreSnapshot(){
    if (!lastSnapshot) return;
    try {
      run('state = JSON.parse(' + JSON.stringify(lastSnapshot) + '); localStorage.setItem("bezdna_state_v3", ' + JSON.stringify(lastSnapshot) + '); render();');
    } catch (e) {
      console.warn('view restore failed', e);
    }
  }

  function replaceWriteFunctions(){
    WRITE_FNS.forEach(name => { window[name] = block; });
    // app.js sometimes reassigns these after renderRight(), so keep replacing lightly.
    try {
      run('window.saveQuest = function(){alert("Это режим просмотра. Редактирование отключено.");return false};');
      run('window.addNode = function(){alert("Это режим просмотра. Редактирование отключено.");return false};');
      run('window.delNode = function(){alert("Это режим просмотра. Редактирование отключено.");return false};');
      run('window.addLine = function(){alert("Это режим просмотра. Редактирование отключено.");return false};');
      run('window.addChoice = function(){alert("Это режим просмотра. Редактирование отключено.");return false};');
      run('window.delLine = function(){alert("Это режим просмотра. Редактирование отключено.");return false};');
    } catch (_) {}
  }

  function lockControls(){
    document.body.classList.add('view-only');
    if (!document.querySelector('.viewBanner')) {
      const b = document.createElement('div');
      b.className = 'viewBanner';
      b.textContent = 'Режим просмотра';
      document.body.appendChild(b);
    }

    try { setTool('pan'); } catch(_) {}

    const edit = document.getElementById('toolEdit');
    if (edit) { edit.disabled = true; edit.onclick = block; }

    document.querySelectorAll('input, textarea, select').forEach(el => {
      if (el.id === 'search') return;
      el.readOnly = true;
      el.disabled = true;
      el.setAttribute('aria-readonly','true');
    });

    document.querySelectorAll('button,label').forEach(el => {
      const text = (el.textContent || el.value || '').trim();
      if (isWriteText(text)) {
        el.classList.add('view-disabled');
        el.onclick = block;
      }
    });
  }

  function init(){
    lastSnapshot = snapshot();
    armed = true;
    replaceWriteFunctions();
    lockControls();
  }

  // Block all write UI clicks, including controls that appear after switching tabs.
  document.addEventListener('click', e => {
    const t = (e.target.textContent || e.target.value || '').trim();
    const btn = e.target.closest && e.target.closest('button,label');
    const text = btn ? (btn.textContent || btn.value || '').trim() : t;
    if (isWriteText(text)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      block();
      return false;
    }
  }, true);

  // Prevent typing/editing in inspector fields created after render.
  document.addEventListener('beforeinput', e => {
    const el = e.target;
    if (el && el.matches && el.matches('input, textarea') && el.id !== 'search') {
      e.preventDefault();
      e.stopImmediatePropagation();
      block();
      return false;
    }
  }, true);

  document.addEventListener('change', e => {
    const el = e.target;
    if (el && el.matches && el.matches('input, textarea, select') && el.id !== 'search') {
      e.preventDefault();
      e.stopImmediatePropagation();
      restoreSnapshot();
      block();
      return false;
    }
  }, true);

  // If any code still changes state, revert it back to the loaded snapshot.
  setInterval(() => {
    if (!armed) return;
    replaceWriteFunctions();
    lockControls();
    const current = snapshot();
    if (lastSnapshot && current && current !== lastSnapshot) {
      restoreSnapshot();
    }
  }, 900);

  window.addEventListener('load', () => setTimeout(init, 350));
})();
