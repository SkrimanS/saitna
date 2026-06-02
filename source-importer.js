(function(){
  const PACK_URL='sources/bezdna_pamyat_glubin_tom1_v10/chapters.json';
  function run(code){return (0,eval)(code)}
  function getState(){return run('state')}
  function saveLocal(){try{run('saveLocal()')}catch(e){}}
  function rerender(){try{run('render()')}catch(e){}}
  function info(t){try{status(t)}catch(e){console.log(t)}}
  function currentNodeByTitle(title){return (getState().nodes||[]).find(n=>n.title===title&&!String(n.id||'').startsWith('pdf_v10_ch_'))}
  function linkExists(from,to){return (getState().links||[]).some(l=>l.from===from&&l.to===to)}
  function partIndex(part){
    const parts=['Часть первая','Часть вторая','Часть третья','Часть четвёртая','Часть пятая','Часть шестая','Часть седьмая','Часть восьмая','Часть девятая','Часть десятая'];
    const i=parts.findIndex(p=>String(part).startsWith(p));
    return i<0?0:i;
  }
  function orderInPart(chapters,chapter){return chapters.filter(c=>c[2]===chapter[2]&&c[0]<=chapter[0]).length-1}
  async function loadPack(){const r=await fetch(PACK_URL+'?v='+Date.now());if(!r.ok)throw new Error('Не удалось загрузить '+PACK_URL);return await r.json()}
  function makeNode(ch,pack){
    const p=partIndex(ch[2]);
    return {id:'pdf_v10_ch_'+String(ch[0]).padStart(2,'0'),type:'source',x:-900+orderInPart(pack.chapters,ch)*310,y:1080+p*250,title:ch[1],act:ch[2],npc:'',loc:'PDF v10',main:false,summary:'Глава '+ch[0]+' из PDF v10: '+ch[1]+'. '+ch[2]+'.',obj:['Сверить события главы с игровой схемой'],need:[],set:['pdf_v10_ch_'+String(ch[0]).padStart(2,'0')+'_noted'],source:{pack:pack.packId,file:pack.sourceFile,chapter:ch[0]}};
  }
  window.importPdfV10Branch=async function(){
    if(new URLSearchParams(location.search).get('view')==='1'){alert('В режиме просмотра импорт отключён.');return}
    const pack=await loadPack();
    const s=getState();s.nodes=s.nodes||[];s.links=s.links||[];s.meta=s.meta||{};s.meta.sources=s.meta.sources||{};
    let added=0,linked=0,prevId='q_prologue';
    for(const ch of pack.chapters){
      const existing=currentNodeByTitle(ch[1]);
      let id=existing?existing.id:'pdf_v10_ch_'+String(ch[0]).padStart(2,'0');
      if(!existing&&!s.nodes.some(n=>n.id===id)){s.nodes.push(makeNode(ch,pack));added++}
      if(prevId&&id&&prevId!==id&&!linkExists(prevId,id)){s.links.push({id:'pdf_v10_l_'+ch[0],from:prevId,to:id,type:'branch',label:'PDF v10: глава '+ch[0]});linked++}
      prevId=id;
    }
    s.meta.sources[pack.packId]={title:pack.title,file:pack.sourceFile,chapters:pack.chapters.length,importedAt:new Date().toISOString()};
    if(window.addActionHistory)window.addActionHistory('Импортирована ветка PDF v10','Добавлено узлов: '+added+', связей: '+linked);
    saveLocal();rerender();info('PDF v10 внесён отдельной веткой: +'+added+' узлов, +'+linked+' связей. Нажми Сохранить всем.');
  };
  function panel(){
    if(document.getElementById('sourceImporterPanel'))return;
    const list=document.getElementById('list');if(!list)return;
    const p=document.createElement('div');p.id='sourceImporterPanel';p.className='sourcePanel card';
    p.innerHTML='<b>Источники / ветки</b><button class="btn" style="margin-top:8px" onclick="importPdfV10Branch()">Внести PDF v10 отдельной веткой</button><span class="tiny sourceHint">Не перезаписывает существующие узлы. Добавляет недостающие главы как отдельную ветку.</span>';
    list.parentNode.insertBefore(p,list);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(panel,400));else setTimeout(panel,400);
})();
