(function(){
  const Q='sources/bezdna_pamyat_glubin_tom1_v10/quests_part_02.json';
  const D='sources/bezdna_pamyat_glubin_tom1_v10/dialogs_part_02.json';
  function run(code){return (0,eval)(code)}
  function state(){return run('state')}
  function saveLocal(){try{run('saveLocal()')}catch(e){}}
  function rerender(){try{run('render()')}catch(e){}}
  function info(t){try{status(t)}catch(e){console.log(t)}}
  async function getJson(path){const r=await fetch(path+'?v='+Date.now());if(!r.ok)throw new Error('Не загрузился '+path);return await r.json()}
  function upsertNode(s,n){const i=(s.nodes||[]).findIndex(x=>x.id===n.id);if(i>=0){s.nodes[i]=Object.assign({},s.nodes[i],n);return 'updated'}s.nodes.push(n);return 'added'}
  function upsertLink(s,l){const i=(s.links||[]).findIndex(x=>x.id===l.id||(x.from===l.from&&x.to===l.to&&x.label===l.label));if(i>=0){s.links[i]=Object.assign({},s.links[i],l);return 'updated'}s.links.push(l);return 'added'}
  window.importPart2Polished=async function(){
    if(new URLSearchParams(location.search).get('view')==='1'){alert('В режиме просмотра импорт отключён.');return}
    if(!confirm('Внести игровую ветку Часть II / главы 5-11?'))return;
    const quests=await getJson(Q), dialogs=await getJson(D), s=state();
    s.nodes=s.nodes||[];s.links=s.links||[];s.dialogs=s.dialogs||{};s.meta=s.meta||{};s.meta.sources=s.meta.sources||{};
    let added=0,updated=0,links=0;
    quests.nodes.forEach(n=>{const r=upsertNode(s,n);if(r==='added')added++;else updated++});
    quests.links.forEach(l=>{const r=upsertLink(s,l);if(r==='added')links++});
    Object.keys(dialogs.dialogs||{}).forEach(id=>{s.dialogs[id]=dialogs.dialogs[id]});
    s.meta.sources[quests.packId]={title:quests.title,file:quests.sourceFile,nodes:quests.nodes.length,dialogs:Object.keys(dialogs.dialogs||{}).length,importedAt:new Date().toISOString()};
    if(window.addActionHistory)window.addActionHistory('Импортирована Часть II из PDF v10','Добавлено: '+added+', обновлено: '+updated+', связей: '+links);
    saveLocal();rerender();info('Часть II внесена: добавлено '+added+', обновлено '+updated+', связей '+links+'. Нажми Сохранить всем.');
  };
  function panel(){
    if(document.getElementById('part2ImporterPanel'))return;
    const list=document.getElementById('list');if(!list)return;
    const p=document.createElement('div');p.id='part2ImporterPanel';p.className='part2Panel card';
    p.innerHTML='<b>PDF v10 → Часть II</b><button class="btn green" style="margin-top:8px" onclick="importPart2Polished()">Внести Часть II нормально</button><span class="tiny part2Hint">Добавляет главы 5-11: тёплое после тьмы, пустые руки, чужой фонарь, слухи, контракт, второй выход и Соляную лестницу.</span>';
    list.parentNode.insertBefore(p,list);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(panel,500));else setTimeout(panel,500);
})();
