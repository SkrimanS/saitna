// Fix visual active state for top and inspector tabs.
(function () {
  function setActiveInGroup(button) {
    const group = button.closest('.tab');
    if (!group) return;
    group.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
  }

  function setEditorTab(name, button) {
    if (button) setActiveInGroup(button);
    window.tab = name;
    if (typeof window.renderRight === 'function') window.renderRight();
  }

  window.setEditorTab = setEditorTab;

  window.addEventListener('DOMContentLoaded', () => {
    const topButtons = document.querySelectorAll('.top .tab button');
    const rightButtons = document.querySelectorAll('#rightPanel .tab button');

    const topMap = ['story', 'quest', 'dialog', 'play'];
    const rightMap = ['quest', 'dialog', 'play'];

    topButtons.forEach((button, index) => {
      button.onclick = (event) => {
        event.preventDefault();
        const next = topMap[index] || 'quest';
        setActiveInGroup(button);
        if (next !== 'story') {
          window.tab = next;
          if (typeof window.renderRight === 'function') window.renderRight();
        }
      };
    });

    rightButtons.forEach((button, index) => {
      button.onclick = (event) => {
        event.preventDefault();
        setEditorTab(rightMap[index] || 'quest', button);
      };
    });
  });
})();
