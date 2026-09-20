// Shared navigation only: each quest keeps ownership of its game state.
export function setupQuestNavigation({ isInProgress, onLeave }) {
  const dialog = document.getElementById('leave-quest');
  let destination;
  document.querySelectorAll('a[data-quest-exit]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!isInProgress()) { onLeave(); return; }
      event.preventDefault();
      destination = link.href;
      dialog.showModal();
    });
  });
  dialog.querySelector('[data-stay]').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-leave]').addEventListener('click', () => {
    onLeave();
    location.assign(destination);
  });
}
