(function(){
  function ev(code){ return (0, eval)(code); }
  function html(value){ return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function getState(){ return ev('state'); }
  function getSelected(){ return ev('selected'); }
  function dialogueText(state, id){
    return ((state.dialogs || {})[id] || []).map(line => {
      const choices = (line.choices || []).map(choice => [choice.text, choice.sets, choice.requires, choice.next].join(' ')).join(' ');
      return [line.speaker, line.text, choices].join(' ');
    }).join(' ');
  }
  function nodeText(state, node){
    return [
      node.title, node.summary, node.npc, node.loc, node.act, node.type,
      (node.obj || []).join(' '), (node.need || []).join(' '), (node.set || []).join(' '),
      dialogueText(state, node.id)
    ].join(' ').toLowerCase();
  }
  window.__dialogueRenderList = function(){
    const state = getState();
    const selected = getSelected();
    const list = document.getElementById('list');
    const search = document.getElementById('search');
    if(!state || !list || !search) return;
    const q = search.value.trim().toLowerCase();
    const rows = (state.nodes || []).filter(node => !q || nodeText(state, node).includes(q));
    list.innerHTML = '';
    if(!rows.length){
      list.innerHTML = '<p class="tiny">Ничего не найдено.</p>';
      return;
    }
    for(const node of rows){
      const dText = dialogueText(state, node.id).toLowerCase();
      const dialogueHit = q && dText.includes(q);
      const div = document.createElement('div');
      div.className = 'mini ' + (node.id === selected ? 'sel' : '');
      div.innerHTML = '<b>' + html(node.title) + '</b><div>' + html(node.summary).slice(0,90) + '...</div><span class="chip ' + (node.main ? '' : 'blue') + '">' + (node.main ? 'основа' : 'ветка') + '</span><span class="chip green">' + (((state.dialogs || {})[node.id] || []).length) + ' репл.</span>' + (dialogueHit ? '<span class="chip blue">найдено в диалоге</span>' : '');
      div.onclick = () => ev('selected=' + JSON.stringify(node.id) + ';render();center()');
      list.appendChild(div);
    }
  };
  function install(){
    try{
      ev('renderList = window.__dialogueRenderList');
      const search = document.getElementById('search');
      if(search){
        search.placeholder = 'Поиск по узлам и диалогам: Марра, долг, дверь...';
        search.oninput = window.__dialogueRenderList;
      }
      window.__dialogueRenderList();
    }catch(error){
      console.warn('dialogue search disabled', error);
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(install, 300));
  else setTimeout(install, 300);
})();
