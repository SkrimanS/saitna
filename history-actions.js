(function(){
  function run(code){return (0,eval)(code)}
  function txt(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function getState(){return run('state')}
  function getMeta(){var s=getState();s.meta=s.meta||{};s.meta.history=s.meta.history||[];return s.meta}
  function who(){return localStorage.getItem('bezdna_user_name')||'Локально'}
  function add(action,details){try{var m=getMeta();m.history.unshift({time:new Date().toISOString(),user:who(),action:action,details:details||''});m.history=m.history.slice(0,80);localStorage.setItem('bezdna_state_v3',JSON.stringify(getState()));badge()}catch(e){console.warn(e)}}
  window.addActionHistory=add;
  function badge(){var b=document.getElementById('historyBadge');if(!b)return;var h=getMeta().history||[];b.textContent=h.length?'записей: '+h.length:'нет записей'}
  function addPanel(){if(document.getElementById('historyPanel'))return;var st=document.getElementById('status');if(!st)return;var card=st.closest('.card');if(!card)return;var p=document.createElement('div');p.id='historyPanel';p.className='historyPanel';p.innerHTML='<div class="row"><button class="btn" id="historyBtn">История действий</button><span class="tiny" id="historyBadge"></span></div>';card.appendChild(p);document.getElementById('historyBtn').onclick=show}
  function show(){var h=getMeta().history||[];var body=h.length?h.map(function(i){return '<div class="card"><b>'+txt(i.action)+'</b><br><span class="tiny">'+new Date(i.time).toLocaleString('ru-RU')+' · '+txt(i.user)+'</span><p>'+txt(i.details)+'</p></div>'}).join(''):'<p class="tiny">История пока пустая.</p>';var m=document.getElementById('historyModal');if(!m){m=document.createElement('div');m.id='historyModal';m.innerHTML='<div class="historyBox"><div class="row space"><h2>История действий</h2><button class="btn red" id="historyClose">Закрыть</button></div><div id="historyBody"></div></div>';document.body.appendChild(m);document.getElementById('historyClose').onclick=function(){m.classList.remove('open')}}document.getElementById('historyBody').innerHTML=body;m.classList.add('open')}
  function wrap(name,label){setTimeout(function(){var old=window[name];if(!old||old.__hist)return;var w=function(){add(label,'');return old.apply(this,arguments)};w.__hist=true;window[name]=w},900)}
  function init(){addPanel();badge();if(!(getMeta().history||[]).length)add('Открыт проект',location.href);wrap('saveGitHub','Сохранение общего проекта');wrap('loadGitHub','Загрузка общего проекта');wrap('uploadFile','Загрузка файла');wrap('exportJSON','Экспорт JSON');wrap('exportMarkdown','Экспорт Markdown')}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
