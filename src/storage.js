const KEY = 'blackjack-lab:v2';
export function load() {
  try {
    // Carry forward table preferences without collecting or migrating old statistics.
    return JSON.parse(localStorage.getItem(KEY) || localStorage.getItem('blackjack-lab:v1')) || {};
  } catch { return {}; }
}
export function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch { return false; }
}
