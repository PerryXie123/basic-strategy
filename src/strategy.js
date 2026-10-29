// Total-dependent, initial two-card strategy for 4–8 deck American peek games.
// Reference: https://wizardofodds.com/games/blackjack/strategy/4-decks/
// Keep decision logic independent of UI/persistence so new rule families can be added.
export const DEFAULT_RULES = Object.freeze({ decks: 6, h17: false, das: true, surrender: false });
export const ACTIONS = Object.freeze({ H: 'Hit', S: 'Stand', D: 'Double', P: 'Split', R: 'Surrender' });
export const UPCARDS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
export function total(cards) {
  let value = cards.reduce((sum, card) => sum + Number(card), 0);
  let aces = cards.filter(card => card === 11).length;
  while (value > 21 && aces) { value -= 10; aces--; }
  return { value, soft: aces > 0 };
}
export function category(cards) {
  if (cards.length === 2 && cards[0] === cards[1]) return 'pairs';
  return total(cards).soft ? 'soft' : 'hard';
}
export function label(cards) {
  const t = total(cards);
  return category(cards) === 'pairs' ? `Pair of ${cards[0] === 11 ? 'aces' : `${cards[0]}s`}` : `${t.soft ? 'Soft' : 'Hard'} ${t.value}`;
}
export function recommend(cards, dealer, rules = DEFAULT_RULES) {
  const { value: n, soft } = total(cards);
  const pair = cards.length === 2 && cards[0] === cards[1];
  const two = cards.length === 2;
  // Late surrender precedes splitting, including H17 8,8 vs ace.
  if (two && rules.surrender && !soft) {
    if ((n === 16 && !pair && dealer >= 9) || (n === 15 && dealer === 10) ||
      (rules.h17 && dealer === 11 && (n === 15 || n === 17 || (pair && cards[0] === 8)))) return 'R';
  }
  if (pair) {
    const p = cards[0];
    if (p === 11 || p === 8) return 'P';
    if ((p === 2 || p === 3) && dealer >= (rules.das ? 2 : 4) && dealer <= 7) return 'P';
    if (p === 4 && rules.das && (dealer === 5 || dealer === 6)) return 'P';
    if (p === 6 && dealer >= (rules.das ? 2 : 3) && dealer <= 6) return 'P';
    if (p === 7 && dealer <= 7) return 'P';
    if (p === 9 && (dealer <= 6 || dealer === 8 || dealer === 9)) return 'P';
  }
  if (soft) {
    if (two && ((n >= 13 && n <= 14 && dealer >= 5 && dealer <= 6) ||
      (n >= 15 && n <= 16 && dealer >= 4 && dealer <= 6) ||
      (n === 17 && dealer >= 3 && dealer <= 6) ||
      (n === 18 && dealer >= (rules.h17 ? 2 : 3) && dealer <= 6) ||
      (n === 19 && rules.h17 && dealer === 6))) return 'D';
    if (n >= 19 || (n === 18 && dealer <= 8)) return 'S';
    return 'H';
  }
  if (two && ((n === 9 && dealer >= 3 && dealer <= 6) ||
    (n === 10 && dealer <= 9) || (n === 11 && (dealer <= 10 || rules.h17)))) return 'D';
  if (n >= 17 || (n >= 13 && dealer <= 6) || (n === 12 && dealer >= 4 && dealer <= 6)) return 'S';
  return 'H';
}
export function explain(cards, dealer, rules) {
  const action = recommend(cards, dealer, rules);
  const {value, soft} = total(cards);
  const up = dealer === 11 ? 'an ace' : `a ${dealer}`;
  if (action === 'P') return cards[0] === 11 ? 'Two aces work better as two starting hands. Split them to give each ace a chance to make a strong total.' : cards[0] === 8 ? 'A hard 16 is a weak starting hand. Splitting your eights gives you two better opportunities.' : `Against ${up}, splitting this pair is the preferred play${rules.das ? ' with double after split available' : ' under these table rules'}.`;
  if (action === 'R') return `Against ${up}, giving up half the stake is preferable to playing out this ${label(cards).toLowerCase()}. This applies after the dealer checks for blackjack.`;
  if (action === 'D') return `Your ${soft ? 'soft' : 'hard'} ${value} is a favorable doubling opportunity against ${up}.${soft ? ' The ace keeps this hand flexible.' : ''}${dealer === 11 || (soft && value >= 18) ? ` The dealer ${rules.h17 ? 'hitting' : 'standing on'} soft 17 matters here.` : ''}`;
  if (action === 'S') return value >= 17 ? `Your ${soft ? 'soft' : 'hard'} ${value} is strong enough to stand against ${up}. Taking another card is less favorable.` : `The dealer's ${dealer} is vulnerable. Stand on ${value} and let the dealer take the risk of drawing.`;
  return soft ? `Your ace can count as 1 or 11, so you can safely improve this soft ${value}. Hit against ${up}.` : `A hard ${value} needs improvement against ${up}. Hitting is the preferred play, even when there is a risk of busting.`;
}
export function chartRows(type) {
  if (type === 'soft') return Array.from({length: 8}, (_, i) => ({name:`A, ${i + 2}`, cards:[11, i + 2]}));
  if (type === 'pairs') return [11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map(n => ({name: n === 11 ? 'A, A' : `${n}, ${n}`, cards:[n, n]}));
  return Array.from({length: 14}, (_, i) => { const n = i + 5; return {name: n === 18 ? '18–20' : `${n}`, cards: n <= 11 ? [2, n - 2] : [10, n - 10]}; });
}
export function makeHand(focus = 'all', rng = Math.random) {
  const types = focus === 'all' || focus === 'mistakes' ? ['hard', 'soft', 'pairs'] : [focus];
  const type = types[Math.floor(rng() * types.length)];
  const rows = chartRows(type);
  const row = rows[Math.floor(rng() * rows.length)];
  const cards = row.cards.slice();
  // Vary hard-hand composition without changing its total or introducing pairs/soft hands.
  if (type === 'hard') {
    const n = total(cards).value;
    const choices = Array.from({length:9}, (_,i)=>i+2).filter(a=>n-a>=2 && n-a<=10 && n-a!==a);
    if (choices.length) { cards[0] = choices[Math.floor(rng()*choices.length)]; cards[1] = n-cards[0]; }
  }
  return { cards, dealer: UPCARDS[Math.floor(rng() * UPCARDS.length)] };
}
