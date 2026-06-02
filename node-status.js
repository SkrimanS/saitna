(function(){
  const STATUSES={draft:'Черновик',review:'Нужно проверить',ready:'Готово',ingame:'В игре',cut:'Вырезано'};
  const ev=code=>(0,eval)(code);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function state(){return ev('state')}
  function selected(){return ev('selected')}
  function node(id){return state().nodes.find(n=>n.id===id)}
  function save(){try{ev('saveLocal()')}catch(e){}}
  function render(){try{ev('render()')}catch(e){}}
  function label(v){return STATUSES[v||'draft']||'Черновик'}
  function ensure(){(state().nodes||[]).forEach(n=>{if(!n.status)n.status='draft'})}
  function cleanFavorites(){
    document.querySelectorAll('#favoriteToggleBox,#favoritesPanel,.favorite-chip').forEach(x=>x.remove());
    document.querySelectorAll('.favorite-node').forEach(x=>x.classList.remove('favorite-node'));
  }
  function markNodes(){
    const byTitle=new Map((state().nodes||[]).map(n=>[n.title,n]));
    document.querySelectorAll('.node').forEach(el=>{
      const n=byTitle.get(el.querySelector('.title')?.textContent||'');
      if(!n)return;
      el.classList.remove('status-draft','status-review','status-ready','status-ingame','status-cut');
      el.classList.add('status-'+(n.status||'draft'));
      let chip=el.querySelector('.status-chip');
      if(!chip){chip=document.createElement('span');chip.className='chip status-chip';el.appendChild(chip)}
      chip.className='chip status-chip status-'+(n.status||'draft');
      chip.textContent=label(n.status);
    });
  }
  function panel(){
    const right=document.getElementById('right'),n=node(selected());
    if(!right||!n)return;
    const old=document.getElementById('statusPanel');
    if(old&&old.dataset.node===n.id)return;
    if(old)old.remove();
    const box=document.createElement('div');
    box.id='statusPanel';box.dataset.node=n.id;box.className='status-panel';
    box.innerHTML='<label class="tiny">Статус узла<select id="nodeStatus" class="field">'+Object.entries(STATUSES).map(([v,l])=>'<option value="'+v+'" '+(v===(n.status||'draft')?'selected':'')+'>'+l+'</option>').join('')+'</select></label>';
    right.insertBefore(box,right.children[1]||right.firstChild);
    box.querySelector('#nodeStatus').onchange=e=>{n.status=e.target.value;save();render();setTimeout(update,60)};
  }
  function update(){ensure();cleanFavorites();markNodes();panel()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setInterval(update,1200));
  else setInterval(update,1200);
  setTimeout(update,300);
})();
