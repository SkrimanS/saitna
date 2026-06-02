// Mobile pinch zoom and mobile zoom buttons.
(function () {
  let pinch = null;
  let lastTap = 0;

  function evalGlobal(code) {
    return (0, eval)(code);
  }

  function getView() {
    return evalGlobal('({ scale, tx, ty })');
  }

  function setView(nextScale, nextTx, nextTy) {
    evalGlobal(`scale=${nextScale};tx=${Math.round(nextTx)};ty=${Math.round(nextTy)};setTransform();`);
  }

  function zoomAt(clientX, clientY, factor) {
    const wrap = document.getElementById('wrap');
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const view = getView();
    const ax = clientX - rect.left;
    const ay = clientY - rect.top;
    const worldX = (ax - view.tx) / view.scale;
    const worldY = (ay - view.ty) / view.scale;
    const nextScale = Math.max(0.22, Math.min(1.55, view.scale * factor));
    const nextTx = ax - worldX * nextScale;
    const nextTy = ay - worldY * nextScale;
    setView(nextScale, nextTx, nextTy);
  }

  window.mobileZoomIn = function () {
    const wrap = document.getElementById('wrap');
    const r = wrap.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.16);
  };

  window.mobileZoomOut = function () {
    const wrap = document.getElementById('wrap');
    const r = wrap.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, 0.86);
  };

  function touchPoint(touches) {
    const a = touches[0];
    const b = touches[1];
    const dx = b.clientX - a.clientX;
    const dy = b.clientY - a.clientY;
    return {
      distance: Math.hypot(dx, dy),
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2
    };
  }

  function bind() {
    const wrap = document.getElementById('wrap');
    if (!wrap) return;

    wrap.addEventListener('touchstart', (event) => {
      if (event.touches.length === 2) {
        event.preventDefault();
        const p = touchPoint(event.touches);
        const view = getView();
        const rect = wrap.getBoundingClientRect();
        pinch = {
          startDistance: p.distance,
          startScale: view.scale,
          worldX: (p.x - rect.left - view.tx) / view.scale,
          worldY: (p.y - rect.top - view.ty) / view.scale
        };
      } else if (event.touches.length === 1) {
        const now = Date.now();
        if (now - lastTap < 280) {
          const t = event.touches[0];
          zoomAt(t.clientX, t.clientY, 1.22);
          event.preventDefault();
        }
        lastTap = now;
      }
    }, { passive: false });

    wrap.addEventListener('touchmove', (event) => {
      if (event.touches.length === 2 && pinch) {
        event.preventDefault();
        event.stopPropagation();
        const p = touchPoint(event.touches);
        const rect = wrap.getBoundingClientRect();
        const nextScale = Math.max(0.22, Math.min(1.55, pinch.startScale * (p.distance / pinch.startDistance)));
        const nextTx = p.x - rect.left - pinch.worldX * nextScale;
        const nextTy = p.y - rect.top - pinch.worldY * nextScale;
        setView(nextScale, nextTx, nextTy);
      }
    }, { passive: false });

    wrap.addEventListener('touchend', (event) => {
      if (event.touches.length < 2) pinch = null;
    }, { passive: false });

    wrap.addEventListener('touchcancel', () => { pinch = null; }, { passive: false });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
