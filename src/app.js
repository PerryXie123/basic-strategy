import { DEFAULT_RULES, ACTIONS, UPCARDS, total, category, label, recommend, explain, chartRows, makeHand } from './strategy.js';
import { load, save } from './storage.js';

const paths = {
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  bulb: '<path d="M9 18h6m-5 3h4M8 14a7 7 0 1 1 8 0c-1 1-1 2-1 4H9c0-2 0-3-1-4Z"/>',
};
const icon = name => `<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
const stored = load();
const rules = { ...DEFAULT_RULES };
if ([4, 6, 8].includes(stored.rules?.decks)) rules.decks = stored.rules.decks;
for (const key of ['h17', 'das', 'surrender']) {
  if (typeof stored.rules?.[key] === 'boolean') rules[key] = stored.rules[key];
}
const focusTypes = { all: 'All hands', hard: 'Hard totals', soft: 'Soft totals', pairs: 'Pairs' };
const prefs = {
  sound: stored.prefs?.sound === true,
  auto: stored.prefs?.auto === true,
  focus: Object.hasOwn(focusTypes, stored.prefs?.focus) ? stored.prefs.focus : 'all',
};
const state = {
  page: location.hash === '#hints' ? 'hints' : 'practice',
  chart: 'hard',
  hand: prefs.focus === 'all' ? { cards: [8, 8], dealer: 6 } : makeHand(prefs.focus),
  answered: false,
  hint: false,
  selection: null,
  deal: 0,
};
const root = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
const announcer = document.querySelector('#announcer');
let renderedDeal = -1;
let autoTimer;
let audioContext;
let returnFocus;
const up = value => value === 11 ? 'A' : value;
const ruleSummary = () => `${rules.decks} decks · ${rules.h17 ? 'Hits' : 'Stands on'} soft 17 · ${rules.das ? 'DAS' : 'No DAS'}${rules.surrender ? ' · Surrender' : ''}`;

function persist() {
  if (!save({ rules, prefs })) announcer.textContent = 'Settings could not be saved. They will last for this visit.';
}

function header() {
  return `<header class="header">
    <a class="brand" href="#practice" aria-label="Blackjack Lab home"><span aria-hidden="true">♠</span> blackjack <span class="brand-light">lab</span></a>
    <nav aria-label="Main navigation">${[['practice', 'Practice'], ['hints', 'Hints']].map(([page, title]) => `<button class="nav-link ${state.page === page ? 'active' : ''}" data-page="${page}" ${state.page === page ? 'aria-current="page"' : ''}>${title}</button>`).join('')}</nav>
    <button class="settings-button" data-do="settings" aria-label="Settings">${icon('settings')}<span>Settings</span></button>
  </header>`;
}

function card(value, suit, hidden = false, delay = 0) {
  const suitName = { '♠': 'spades', '♥': 'hearts' }[suit];
  return `<div class="playing-card ${hidden ? 'card-back' : suit === '♥' ? 'red' : ''}" style="--delay:${delay}ms" role="img" aria-label="${hidden ? 'Dealer hole card, face down' : `${value === 11 ? 'Ace' : value} of ${suitName}`}">
    ${hidden ? '<div class="back-pattern"><span>♠</span></div>' : `<span class="card-corner">${up(value)}<small>${suit}</small></span><span class="card-suit">${suit}</span><span class="card-corner bottom">${up(value)}<small>${suit}</small></span>`}
  </div>`;
}

function practice() {
  const { cards, dealer } = state.hand;
  const best = recommend(cards, dealer, rules);
  const correct = state.selection === best;
  return `<section class="practice" aria-label="Blackjack practice">
    <div class="table-toolbar"><span>${prefs.focus === 'all' ? 'Basic strategy practice' : focusTypes[prefs.focus]}</span><button class="rules-button" data-do="settings" aria-label="Edit table rules">${ruleSummary()} <span aria-hidden="true">↗</span></button></div>
    <div class="felt">
      <div class="dealer-area"><span class="table-label">Dealer</span><div class="card-row dealer-cards">${card(dealer, '♠')}${card(0, '♠', true, 80)}</div></div>
      <div class="player-area"><div class="card-row player-cards">${card(cards[0], '♠', false, 150)}${card(cards[1], '♥', false, 220)}</div><div class="player-caption"><span>You</span><strong>${total(cards).value}</strong><span>${category(cards) === 'pairs' ? 'Pair' : total(cards).soft ? 'Soft' : 'Hard'}</span></div></div>
    </div>
    <div class="decision-heading"><h1>${state.answered ? `${correct ? 'Correct' : 'Best move'} · ${ACTIONS[best]}` : 'What’s your move?'}</h1>${!state.answered ? `<button class="text-button" data-do="hint">${state.hint ? 'Hide hint' : 'Show hint'}</button>` : `<span class="feedback-mark ${correct ? 'correct' : ''}">${icon(correct ? 'check' : 'bulb')}</span>`}</div>
    ${state.hint && !state.answered ? `<div class="hint-callout"><p><strong>${ACTIONS[best]}.</strong> ${explain(cards, dealer, rules)}</p><button class="text-button" data-do="view-hand">View in chart ↗</button></div>` : ''}
    <div class="actions">${Object.entries(ACTIONS).map(([action, name], index) => {
      const unavailable = (action === 'P' && category(cards) !== 'pairs') || (action === 'R' && !rules.surrender);
      return `<button class="action-btn ${state.answered && action === best ? 'best-action' : ''} ${state.answered && action === state.selection && action !== best ? 'wrong-action' : ''}" data-action="${action}" ${state.answered || unavailable ? 'disabled' : ''} title="${unavailable ? action === 'P' ? 'A pair is required' : 'Surrender is off in Settings' : `${name} (${index + 1} or ${action})`}"><span>${name}</span><kbd>${index + 1}</kbd></button>`;
    }).join('')}</div>
    ${state.answered ? `<div class="answer-explanation"><p>${explain(cards, dealer, rules)}</p><button class="primary-button" data-do="next">Next hand ${icon('arrow')}</button></div>` : ''}
    <div class="practice-footer"><button class="quiet-button" data-do="shortcuts">Keyboard shortcuts</button><button class="quiet-button" data-do="next">Skip hand</button></div>
  </section>`;
}

function chart() {
  const types = { hard: 'Hard totals', soft: 'Soft totals', pairs: 'Pairs' };
  const handCategory = category(state.hand.cards);
  return `<section class="chart-page" aria-label="Basic strategy hints">
    <div class="chart-heading"><h1>Basic strategy</h1><button class="text-button" data-do="view-hand">Find my hand</button></div>
    <button class="rules-button chart-rules" data-do="settings">${ruleSummary()} <span aria-hidden="true">↗</span></button>
    <div class="chart-tabs" role="group" aria-label="Strategy hand type">${Object.entries(types).map(([type, name]) => `<button data-chart="${type}" aria-pressed="${state.chart === type}" class="${state.chart === type ? 'selected' : ''}">${name}</button>`).join('')}</div>
    <div class="chart-scroll"><table class="strategy-table"><caption class="sr-only">${types[state.chart]} strategy. ${ruleSummary()}. Dealer upcards across the top.</caption><thead><tr><th scope="col">Your hand</th>${UPCARDS.map(value => `<th scope="col">${up(value)}</th>`).join('')}</tr></thead><tbody>${chartRows(state.chart).map(row => `<tr><th scope="row">${row.name}</th>${UPCARDS.map(dealer => {
      const action = recommend(row.cards, dealer, rules);
      const fallback = action === 'D' ? total(row.cards).soft && total(row.cards).value >= 18 ? 'stand' : 'hit' : '';
      const current = handCategory === state.chart && dealer === state.hand.dealer && (handCategory === 'pairs' ? row.cards[0] === state.hand.cards[0] : total(row.cards).value === total(state.hand.cards).value);
      return `<td><button class="strategy-cell cell-${action} ${current ? 'current-cell' : ''}" data-cell="${row.cards.join(',')}:${dealer}" aria-label="${row.name} vs ${up(dealer)}: ${ACTIONS[action]}${fallback ? `, otherwise ${fallback}` : ''}">${action}${fallback ? `<small>${fallback[0]}</small>` : ''}</button></td>`;
    }).join('')}</tr>`).join('')}</tbody></table></div>
    <div class="chart-legend">${Object.entries(ACTIONS).map(([key, name]) => `<span><b class="cell-${key}">${key}</b>${name}</span>`).join('')}</div>
    <p class="chart-note">Dh: double, otherwise hit. Ds: double, otherwise stand.<br>Initial two-card hands · American dealer peek · 4–8 decks.</p>
    <div class="chart-footer"><a href="https://wizardofodds.com/games/blackjack/strategy/4-decks/" target="_blank" rel="noopener noreferrer">Strategy reference ↗</a><button class="quiet-button" data-do="print">Print chart</button></div>
  </section>`;
}

function render() {
  const active = document.activeElement;
  const activeId = active?.id;
  const pageFocus = active?.dataset.page;
  const chartFocus = active?.dataset.chart;
  root.innerHTML = `${header()}<main id="main-content" tabindex="-1">${state.page === 'hints' ? chart() : practice()}</main>`;
  if (renderedDeal !== state.deal) document.querySelector('.felt')?.classList.add('dealing');
  renderedDeal = state.deal;
  if (!modalRoot.querySelector('dialog[open]')) {
    if (activeId) document.getElementById(activeId)?.focus({ preventScroll: true });
    else if (pageFocus) root.querySelector(`[data-page="${pageFocus}"]`)?.focus({ preventScroll: true });
    else if (chartFocus) root.querySelector(`[data-chart="${chartFocus}"]`)?.focus({ preventScroll: true });
  }
}

function nextHand() {
  clearTimeout(autoTimer);
  state.hand = makeHand(prefs.focus);
  state.answered = false;
  state.selection = null;
  state.hint = false;
  state.deal++;
  announcer.textContent = `New hand. ${label(state.hand.cards)} against ${up(state.hand.dealer)}.`;
  render();
}

function scheduleNext() {
  clearTimeout(autoTimer);
  if (prefs.auto && state.answered && state.page === 'practice' && !modalRoot.querySelector('dialog[open]')) autoTimer = setTimeout(nextHand, 2000);
}

function play(action) {
  if (state.page !== 'practice' || state.answered) return;
  if ((action === 'P' && category(state.hand.cards) !== 'pairs') || (action === 'R' && !rules.surrender)) return;
  state.selection = action;
  state.answered = true;
  const best = recommend(state.hand.cards, state.hand.dealer, rules);
  tone(best === action);
  render();
  announcer.textContent = `${best === action ? 'Correct.' : 'Best move:'} ${ACTIONS[best]}. ${explain(state.hand.cards, state.hand.dealer, rules)}`;
  root.querySelector('.answer-explanation button')?.focus({ preventScroll: true });
  scheduleNext();
}

function tone(correct) {
  if (!prefs.sound) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
    oscillator.connect(gain); gain.connect(audioContext.destination);
    oscillator.frequency.setValueAtTime(correct ? 580 : 220, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(correct ? 870 : 170, audioContext.currentTime + .15);
    gain.gain.setValueAtTime(.05, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .22);
    oscillator.start(); oscillator.stop(audioContext.currentTime + .23);
  } catch { /* Sound is optional. */ }
}

function navigate(page) {
  if (!['practice', 'hints'].includes(page)) return;
  clearTimeout(autoTimer);
  state.page = page;
  history.replaceState(null, '', `#${page}`);
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function toggle(key, title, detail, scope = 'rule') {
  const checked = (scope === 'rule' ? rules : prefs)[key];
  return `<label class="toggle-row" for="${scope}-${key}"><span><strong>${title}</strong>${detail ? `<small>${detail}</small>` : ''}</span><input type="checkbox" role="switch" id="${scope}-${key}" data-${scope}="${key}" ${checked ? 'checked' : ''}><span class="switch" aria-hidden="true"></span></label>`;
}

function settings() {
  modal('Settings', `<section class="settings-section"><h3>Table rules</h3>
    <label class="select-row" for="deck-count">Decks<select id="deck-count" data-rule="decks">${[4, 6, 8].map(value => `<option value="${value}" ${rules.decks === value ? 'selected' : ''}>${value} decks</option>`).join('')}</select></label>
    ${toggle('h17', 'Dealer hits soft 17', 'Draws on ace + 6; otherwise stands.')}
    ${toggle('das', 'Double after split', 'Allow doubling on a split hand.')}
    ${toggle('surrender', 'Late surrender', 'Available after the dealer checks for blackjack.')}
    <button class="quiet-button rule-details" data-do="rules-info">About these rules ↗</button></section>
    <section class="settings-section"><h3>Practice</h3><label class="select-row" for="practice-focus">Hands<select id="practice-focus" data-pref="focus">${Object.entries(focusTypes).map(([value, name]) => `<option value="${value}" ${prefs.focus === value ? 'selected' : ''}>${name}</option>`).join('')}</select></label>
    ${toggle('auto', 'Auto-advance', 'Next hand after two seconds.', 'pref')}
    ${toggle('sound', 'Sound', '', 'pref')}</section>
    <div class="settings-footer"><span id="save-state">Saved on this device.</span><button class="primary-button" data-do="close">Done</button></div>`);
}

function modal(title, content) {
  clearTimeout(autoTimer);
  if (modalRoot.querySelector('dialog[open]')) modalRoot.querySelector('dialog').close();
  returnFocus = document.activeElement;
  modalRoot.innerHTML = `<dialog class="modal" aria-labelledby="dialog-title"><div class="modal-heading"><h2 id="dialog-title">${title}</h2><button class="icon-button" data-do="close" aria-label="Close dialog">${icon('close')}</button></div><div class="modal-body">${content}</div></dialog>`;
  const dialog = modalRoot.querySelector('dialog');
  dialog.addEventListener('close', () => {
    if (modalRoot.querySelector('dialog') !== dialog) return;
    modalRoot.innerHTML = '';
    if (returnFocus?.isConnected) returnFocus.focus();
    else root.querySelector('[data-do="settings"]')?.focus();
    scheduleNext();
  });
  dialog.showModal();
}

const commands = {
  settings,
  next: nextHand,
  close: () => modalRoot.querySelector('dialog')?.close(),
  hint: () => { state.hint = !state.hint; render(); },
  'view-hand': () => { state.chart = category(state.hand.cards); navigate('hints'); },
  print: () => window.print(),
  shortcuts: () => modal('Keyboard shortcuts', `<div class="shortcut-list">${[['Hit', '1 or H'], ['Stand', '2 or S'], ['Double', '3 or D'], ['Split', '4 or P'], ['Surrender', '5 or R'], ['Next hand', 'Enter or Space'], ['Show or hide hint', '?']].map(([name, key]) => `<div><span>${name}</span><kbd>${key}</kbd></div>`).join('')}</div>`),
  'rules-info': () => modal('About the rules', `<p>Initial two-card basic strategy for 4–8 deck American blackjack. The dealer checks for blackjack before your decision; doubling is allowed on any initial two cards.</p><p>The supported deck counts share this chart. Split aces receive one card. Scenarios are balanced for practice, rather than drawn from a continuing shoe.</p><p>Single/double deck, European no-hole-card rules, composition exceptions, re-splitting, and counting deviations are outside this chart.</p><button class="text-button" data-do="settings">Back to settings</button>`),
};

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.page) navigate(button.dataset.page);
  else if (button.dataset.action) play(button.dataset.action);
  else if (button.dataset.do) commands[button.dataset.do]?.();
  else if (button.dataset.chart) { state.chart = button.dataset.chart; render(); }
  else if (button.dataset.cell) {
    const [values, dealerValue] = button.dataset.cell.split(':');
    const cards = values.split(',').map(Number), dealer = Number(dealerValue);
    modal(`${label(cards)} vs ${up(dealer)}`, `<p class="cell-answer">${ACTIONS[recommend(cards, dealer, rules)]}</p><p>${explain(cards, dealer, rules)}</p>`);
  }
});

document.addEventListener('change', event => {
  const element = event.target;
  if (element.dataset.rule) {
    rules[element.dataset.rule] = element.type === 'checkbox' ? element.checked : Number(element.value);
    state.answered = false; state.selection = null; state.hint = false;
    clearTimeout(autoTimer); persist(); render();
  } else if (element.dataset.pref) {
    const key = element.dataset.pref;
    prefs[key] = element.type === 'checkbox' ? element.checked : element.value;
    clearTimeout(autoTimer); persist();
    if (key === 'focus') nextHand();
  }
});

document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || modalRoot.querySelector('dialog[open]')) return;
  const focusedTag = document.activeElement?.tagName;
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(focusedTag)) return;
  if (state.page !== 'practice') return;
  if ((event.key === 'Enter' || event.key === ' ') && state.answered && !['BUTTON', 'A'].includes(focusedTag)) { event.preventDefault(); nextHand(); return; }
  if (event.key === '?' && !state.answered) { event.preventDefault(); commands.hint(); return; }
  const action = { '1': 'H', '2': 'S', '3': 'D', '4': 'P', '5': 'R', H: 'H', S: 'S', D: 'D', P: 'P', R: 'R' }[event.key.toUpperCase()];
  if (action) { event.preventDefault(); play(action); }
});

window.addEventListener('hashchange', () => {
  const page = location.hash.slice(1);
  if (['practice', 'hints'].includes(page)) navigate(page);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearTimeout(autoTimer);
  else scheduleNext();
});
render();
