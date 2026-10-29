const KEY = 'blackjack-lab:v1';
export function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
export function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch { return false; }
}
export function cleanHistory(history) {
  return Array.isArray(history) ? history.filter(x => x && Array.isArray(x.cards) && x.cards.length === 2 && x.cards.every(n=>Number.isInteger(n)&&n>=2&&n<=11) && Number.isInteger(x.dealer) && x.dealer>=2 && x.dealer<=11 && typeof x.correct === 'boolean' && typeof x.assisted === 'boolean' && Number.isFinite(x.ms) && Number.isFinite(x.at)).slice(-1000) : [];
}
