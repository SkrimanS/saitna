(function(){
  const ev = code => (0, eval)(code);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function state(){ return ev('state'); }
  function selected(){ return ev('selected'); }
  function node(id){ return state().nodes.find(n => n.id === id); }
  function save(){ try { ev('saveLocal()'); } catch(_) {} }
  function render(){ try { ev('render()'); } catch(_) {} }
  function go(id){ ev('selected=' + JSON.stringify(id) + ';render();center()'); }
  function ensure(){ (state().nodes || []).forEach(n => { if(typeof n.favorite !== 'boolean') n.favorite = false; }); }
  function drawFavorites(){
    const box = document.getElementById('favoritesBox');
    if(!box) return;
    const favs = (state().nodes || []).filter(n => n.favorite);
    box.innerHTML = favs.length ? favs.map(n => '<button class="btn" data-fav="'+esc(n.id)+'">★ '+esc(n.title)+'</button>').join('') : '<span class="tiny">Пока нет избранных.</span>';
    box.querySelectorAll('[data-fav]').forEach(btn => btn.onclick = () => go(btn.dataset.fav));
  }
  function addLeftPanel(){
    if(document.getElementById('favoritesPanel')) return;
    const list = document.getElementById('list');
    if(!list) return;
    const panel = document.createElement('div');
    panel.id = 'favoritesPanel';
    panel.className = 'favorite-panel';
    panel.innerHTML = '<h2 style="margin-top:0">Избранное</h2><div id="favoritesBox" class="favorite-box"></div>';
    list.parentNode.insertBefore(panel, list);
  }
  function addRightButton(){
    const right = document.getElementById('right');
    const n = node(selected());
    if(!right || !n) return;
    const old = document.getElementById('favoriteToggleBox');
    if(old && old.dataset.node === n.id) return;
    if(old) old.remove();
    const box = document.createElement('div');
    box.id = 'favoriteToggleBox';
    box.dataset.node = n.id;
    box.className = 'card';
    box.innerHTML = '<button class="btn '+(n.favorite?'gold':'')+'" id="favoriteToggleBtn">'+(n.favorite?'★ В избранном':'☆ В избранное')+'</button>';
    right.insertBefore(box, right.children[1] || right.firstChild);
    box.querySelector('#favoriteToggleBtn').onclick = () => {
      n.favorite = !n.favorite;
      save();
      render();
      setTimeout(update, 80);
    };
  }
  function markNodes(){
    const map = new Map((state().nodes || []).map(n => [n.title, n]));
    document.querySelectorAll('.node').forEach(el => {
      const title = el.querySelector('.title')?.textContent || '';
      const n = map.get(title);
      if(!n) return;
      el.classList.toggle('favorite-node', !!n.favorite);
      let chip = el.querySelector('.favorite-chip');
      if(n.favorite && !chip){
        chip = document.createElement('span');
        chip.className = 'chip favorite-chip';
        chip.textContent = '★ избранное';
        el.appendChild(chip);
      }
      if(!n.favorite && chip) chip.remove();
    });
  }
  function update(){ ensure(); addLeftPanel(); drawFavorites(); addRightButton(); markNodes(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setInterval(update, 1200));
  else setInterval(update, 1200);
  setTimeout(update, 300);
})();
