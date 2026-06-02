(function(){
  const Q1='sources/bezdna_pamyat_glubin_tom1_v10/quests_part_01.json';
  const D1='sources/bezdna_pamyat_glubin_tom1_v10/dialogs_part_01.json';
  const Q2='sources/bezdna_pamyat_glubin_tom1_v10/quests_part_02.json';
  const D2='sources/bezdna_pamyat_glubin_tom1_v10/dialogs_part_02.json';
  function run(code){return (0,eval)(code)}
  function state(){return run('state')}
  function saveLocal(){try{run('saveLocal()')}catch(e){}}
  function rerender(){try{run('render()')}catch(e){}}
  function info(t){try{status(t)}catch(e){console.log(t)}}
  async function getJson(path){const r=await fetch(path+'?v='+Date.now());if(!r.ok)throw new Error('Не загрузился '+path);return await r.json()}
  function removeOldPdfOutline(s){
    const old=new Set((s.nodes||[]).filter(n=>String(n.id||'').startsWith('pdf_v10_ch_')).map(n=>n.id));
    if(!old.size)return 0;
    s.nodes=s.nodes.filter(n=>!old.has(n.id));
    s.links=(s.links||[]).filter(l=>!old.has(l.from)&&!old.has(l.to));
    return old.size;
  }
  function upsertNode(s,n){
    const i=(s.nodes||[]).findIndex(x=>x.id===n.id);
    if(i>=0){s.nodes[i]=Object.assign({},s.nodes[i],n);return 'updated'}
    s.nodes.push(n);return 'added';
  }
  function upsertLink(s,l){
    const i=(s.links||[]).findIndex(x=>x.id===l.id || (x.from===l.from&&x.to===l.to&&x.label===l.label));
    if(i>=0){s.links[i]=Object.assign({},s.links[i],l);return 'updated'}
    s.links.push(l);return 'added';
  }
  async function importPack(questsPath, dialogsPath, label, removeOutline){
    if(new URLSearchParams(location.search).get('view')==='1'){alert('В режиме просмотра импорт отключён.');return}
    if(!confirm('Внести '+label+'?'))return;
    const quests=await getJson(questsPath), dialogs=await getJson(dialogsPath), s=state();
    s.nodes=s.nodes||[];s.links=s.links||[];s.dialogs=s.dialogs||{};s.meta=s.meta||{};s.meta.sources=s.meta.sources||{};
    const removed=removeOutline?removeOldPdfOutline(s):0;
    let added=0,updated=0,links=0;
    quests.nodes.forEach(n=>{const r=upsertNode(s,n);if(r==='added')added++;else updated++});
    quests.links.forEach(l=>{const r=upsertLink(s,l);if(r==='added')links++});
    Object.keys(dialogs.dialogs||{}).forEach(id=>{s.dialogs[id]=dialogs.dialogs[id]});
    s.meta.sources[quests.packId]={title:quests.title,file:quests.sourceFile,nodes:quests.nodes.length,dialogs:Object.keys(dialogs.dialogs||{}).length,importedAt:new Date().toISOString()};
    if(window.addActionHistory)window.addActionHistory('Импортирована '+label+' из PDF v10','Удалено пустых узлов: '+removed+', добавлено: '+added+', обновлено: '+updated+', связей: '+links);
    saveLocal();rerender();info(label+' внесена: добавлено '+added+', обновлено '+updated+', связей '+links+'. Нажми Сохранить всем.');
  }
  window.importPart1Polished=function(){return importPack(Q1,D1,'Часть I',true)};
  window.importPart2Polished=function(){return importPack(Q2,D2,'Часть II',false)};
  function panel(){
    const list=document.getElementById('list');if(!list)return;
    let p=document.getElementById('part1ImporterPanel');
    if(!p){p=document.createElement('div');p.id='part1ImporterPanel';p.className='part1Panel card';list.parentNode.insertBefore(p,list)}
    p.innerHTML='<b>PDF v10 → игровая ветка</b><button class="btn green" style="margin-top:8px" onclick="importPart1Polished()">Внести Часть I нормально</button><button class="btn green" style="margin-top:8px" onclick="importPart2Polished()">Внести Часть II нормально</button><span class="tiny part1Hint">Часть I заменяет пустой PDF-каркас. Часть II добавляет главы 5–11: тёплое после тьмы, пустые руки, чужой фонарь, слухи, контракт, второй выход и Соляную лестницу.</span>';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(panel,450));else setTimeout(panel,450);
})();
