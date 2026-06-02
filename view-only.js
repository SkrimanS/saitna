(function(){
  const params=new URLSearchParams(location.search);
  if(params.get('view')!=='1')return;
  function block(){alert('Это режим просмотра. Редактирование отключено.');return false}
  function init(){
    document.body.classList.add('view-only');
    if(!document.querySelector('.viewBanner')){
      const b=document.createElement('div');b.className='viewBanner';b.textContent='Режим просмотра';document.body.appendChild(b);
    }
    try{setTool('pan')}catch(e){}
    ['saveGitHub','uploadFile','saveQuest','addNode','delNode','addLine','addChoice','delLine','lUpd','cUpd'].forEach(k=>{window[k]=block});
    const edit=document.getElementById('toolEdit'); if(edit){edit.disabled=true;edit.onclick=block}
    document.querySelectorAll('button,label,input,textarea,select').forEach(el=>{
      const text=(el.textContent||el.value||'').trim();
      if(el.id==='search')return;
      if(el.matches('input,textarea,select')){el.readOnly=true;if(el.tagName==='SELECT')el.disabled=true}
      if(text.includes('Сохранить')||text.includes('Новый')||text.includes('Удалить')||text.includes('Реплика')||text.includes('ответ')||text.includes('Загрузить')||text.includes('Импорт')){
        el.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();block()},true);
      }
    });
  }
  window.addEventListener('load',()=>setTimeout(init,300));
  document.addEventListener('click',e=>{
    const t=(e.target.textContent||'').trim();
    if(t.includes('Сохранить')||t.includes('Новый')||t.includes('Удалить')||t.includes('Реплика')||t.includes('ответ')||t.includes('Загрузить')||t.includes('Импорт')){
      e.preventDefault();e.stopImmediatePropagation();block();
    }
  },true);
})();
