// Visual + functional tab switching fix.
// app.js keeps `tab` as a global lexical variable, so we update it through global eval.
(function () {
  function setActiveInGroup(button) {
    const group = button.closest('.tab');
    if (!group) return;
    group.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
  }

  function setAppTab(name) {
    try {
      (0, eval)(`tab = ${JSON.stringify(name)}; renderRight();`);
    } catch (error) {
      console.error('Tab switch failed:', error);
    }
  }

  function syncRightTabs(name) {
    const map = { quest: 0, dialog: 1, play: 2 };
    const buttons = document.querySelectorAll('#rightPanel .tab button');
    buttons.forEach(b => b.classList.remove('active'));
    if (buttons[map[name]]) buttons[map[name]].classList.add('active');
  }

  function bindTabs() {
    const topButtons = document.querySelectorAll('.top .tab button');
    const rightButtons = document.querySelectorAll('#rightPanel .tab button');
    const topMap = ['story', 'quest', 'dialog', 'play'];
    const rightMap = ['quest', 'dialog', 'play'];

    topButtons.forEach((button, index) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const next = topMap[index] || 'quest';
        setActiveInGroup(button);
        if (next !== 'story') {
          syncRightTabs(next);
          setAppTab(next);
        }
      });
    });

    rightButtons.forEach((button, index) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const next = rightMap[index] || 'quest';
        setActiveInGroup(button);
        setAppTab(next);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindTabs);
  } else {
    bindTabs();
  }
})();
