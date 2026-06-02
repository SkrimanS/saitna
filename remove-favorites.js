(function(){
  function cleanup(){
    document.querySelectorAll('#favoriteToggleBox,#favoritesPanel,.favorite-chip').forEach(el=>el.remove());
    document.querySelectorAll('.favorite-node').forEach(el=>el.classList.remove('favorite-node'));
    document.querySelectorAll('button').forEach(btn=>{
      const t=(btn.textContent||'').trim();
      if(t.includes('В избранное')||t.includes('В избранном'))btn.remove();
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cleanup);else cleanup();
  setInterval(cleanup,1200);
})();
