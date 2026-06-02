(function(){
  function getState(){ return (0,eval)('state'); }
  function escMd(value){ return String(value ?? '').replace(/\r/g,'').trim(); }
  function nodeTitle(id){ const s=getState(); const n=(s.nodes||[]).find(x=>x.id===id); return n ? n.title : id; }
  function buildMarkdown(){
    const s=getState();
    const lines=[];
    lines.push('# Бездна — сценарий квестов и диалогов');
    lines.push('');
    lines.push('Экспорт: '+new Date().toLocaleString('ru-RU'));
    lines.push('');
    const nodes=[...(s.nodes||[])].sort((a,b)=>{
      if(!!a.main!==!!b.main) return a.main ? -1 : 1;
      return (a.x||0)-(b.x||0);
    });
    for(const n of nodes){
      lines.push('## '+escMd(n.title));
      lines.push('');
      lines.push('- Линия: '+(n.main?'основная':'ветка'));
      lines.push('- Тип: '+escMd(n.type||''));
      lines.push('- Акт: '+escMd(n.act||''));
      lines.push('- NPC: '+escMd(n.npc||''));
      lines.push('- Локация: '+escMd(n.loc||''));
      if(n.need&&n.need.length) lines.push('- Нужно: '+n.need.join(', '));
      if(n.set&&n.set.length) lines.push('- Выдаёт: '+n.set.join(', '));
      lines.push('');
      if(n.summary) lines.push(escMd(n.summary),'');
      if(n.obj&&n.obj.length){
        lines.push('### Задачи');
        n.obj.forEach(o=>lines.push('- '+escMd(o)));
        lines.push('');
      }
      const ds=(s.dialogs||{})[n.id]||[];
      if(ds.length){
        lines.push('### Диалог');
        ds.forEach((d,idx)=>{
          lines.push('**'+escMd(d.speaker||'NPC')+':** '+escMd(d.text||''));
          (d.choices||[]).forEach(c=>{
            let extra=[];
            if(c.next) extra.push('к квесту: '+nodeTitle(c.next));
            if(Number.isInteger(c.target)) extra.push('к реплике #'+(c.target+1));
            if(c.sets) extra.push('выдаёт: '+c.sets);
            lines.push('- Игрок: '+escMd(c.text||'')+(extra.length?' ('+extra.join('; ')+')':''));
          });
          if(idx!==ds.length-1) lines.push('');
        });
        lines.push('');
      }
      const outgoing=(s.links||[]).filter(l=>l.from===n.id);
      if(outgoing.length){
        lines.push('### Переходы');
        outgoing.forEach(l=>lines.push('- '+escMd(l.label||l.type)+' → '+escMd(nodeTitle(l.to))));
        lines.push('');
      }
    }
    return lines.join('\n');
  }
  window.exportMarkdown=function(){
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([buildMarkdown()],{type:'text/markdown;charset=utf-8'}));
    a.download='bezdna_scenario.md';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  };
  function addButton(){
    if(document.getElementById('mdExportBtn')) return;
    const jsonBtn=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Скачать JSON'));
    if(!jsonBtn) return;
    const btn=document.createElement('button');
    btn.id='mdExportBtn';
    btn.className='btn';
    btn.textContent='Экспорт Markdown';
    btn.onclick=window.exportMarkdown;
    jsonBtn.insertAdjacentElement('afterend',btn);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(addButton,200));
  else setTimeout(addButton,200);
})();
