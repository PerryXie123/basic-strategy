import { DEFAULT_RULES, ACTIONS, UPCARDS, total, category, label, recommend, explain, chartRows, makeHand } from './strategy.js';
import { load, save, cleanHistory } from './storage.js';

const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Z"/><path d="M12 5v15"/>',
  chart: '<path d="M4 3v17h17M8 15v-4m5 4V7m5 8V4"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  flame: '<path d="M12 3c2 5-2 5 1 9 2-1 3-3 3-5 5 5 6 13-3 14-10 1-12-9-6-14 0 4 2 5 3 5-2-5 2-6 2-9Z"/>',
  cards: '<rect x="8" y="3" width="12" height="17" rx="2"/><path d="m6 7-3 1 3 14 10-2m-2-12v6m-3-3h6"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 7M3 3v7h7"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01"/>',
  keyboard: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 15h10"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  hand: '<path d="M8 12V5a2 2 0 0 1 4 0v7-8a2 2 0 0 1 4 0v8-6a2 2 0 0 1 4 0v9c0 4-3 7-7 7-3 0-5-2-7-5l-3-5a2 2 0 0 1 3-2l2 2Z"/>',
  split: '<path d="M12 21v-8m0 0L5 6m7 7 7-7M3 11V4h7m4 0h7v7"/>',
  flag: '<path d="M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
  bulb: '<path d="M9 18h6m-5 3h4M8 14a7 7 0 1 1 8 0c-1 1-1 2-1 4H9c0-2 0-3-1-4Z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  sound: '<path d="m11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  time: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.cards}</svg>`;
const stored = load();
const rules = {...DEFAULT_RULES};
if ([4,6,8].includes(stored.rules?.decks)) rules.decks = stored.rules.decks;
for (const key of ['h17','das','surrender']) if (typeof stored.rules?.[key] === 'boolean') rules[key] = stored.rules[key];
const prefs = { sound: stored.prefs?.sound === true, auto: stored.prefs?.auto === true, focus:'all', length:20 };
const state = { page:'practice', chart:'hard', rules, prefs, history:cleanHistory(stored.history), session:[], streak:0, best:Number.isInteger(stored.best)&&stored.best>=0?stored.best:0, hand:{cards:[8,8], dealer:6}, round:1, answered:false, assisted:false, hint:false, selection:null, started:performance.now(), complete:false, deal:0 };
let autoTimer;
let audioContext;
let renderedDeal = -1;
const root = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
function persist() {
  if (!save({rules:state.rules,prefs:{sound:prefs.sound,auto:prefs.auto},history:state.history,best:state.best})) document.querySelector('#save-state')?.replaceChildren('Storage unavailable — progress stays in this tab');
}
const up = n => n === 11 ? 'A' : n;
function accuracy(items) { const attempts=items.filter(x=>!x.assisted); return attempts.length ? Math.round(attempts.filter(x=>x.correct).length / attempts.length * 100) : null; }
function ruleSummary() { return `${rules.decks} decks · ${rules.h17 ? 'H17' : 'S17'} · ${rules.das ? 'DAS' : 'No DAS'} · ${rules.surrender ? 'Late surrender' : 'No surrender'}`; }
function sidebar() {
  return `<aside class="sidebar"><a class="brand" href="#practice" aria-label="Blackjack Lab home"><span class="brand-mark">♠</span><span>blackjack<span class="brand-lab">lab<span class="brand-dot">.</span></span></span></a><div class="sidebar-label">YOUR WORKSPACE</div><nav aria-label="Main navigation">${[['practice','grid','Practice','Build your instincts'],['hints','book','Strategy chart','Your table-side guide'],['stats','chart','Statistics','See your progress']].map(([page,i,title,sub])=>`<button class="nav-item ${state.page===page?'active':''}" data-page="${page}" ${state.page===page?'aria-current="page"':''}>${icon(i)}<span>${title}<small>${sub}</small></span>${state.page===page?'<span class="nav-dot"></span>':''}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="lab-note"><span class="tiny-star">✳</span><strong>A little practice.<br>A smarter player.</strong><p>Great decisions start<br>one hand at a time.</p><div class="note-cards"><span>♠</span><span>♥</span></div></div><button class="help-button" data-do="help">${icon('help')} How to play <span>↗</span></button><div class="sidebar-foot">BUILT FOR BETTER DECISIONS</div></div></aside>`;
}
function header() {
  const title = {practice:'Practice',hints:'Strategy chart',stats:'Statistics'}[state.page];
  return `<header class="topbar"><div class="breadcrumb">Your workspace <span>/</span> <strong>${title}</strong></div><div class="topbar-right"><span class="local-status"><i></i> Your personal practice space</span><button class="icon-button" data-do="shortcuts" aria-label="Keyboard shortcuts" title="Keyboard shortcuts">${icon('keyboard')}</button><span class="avatar" aria-label="Player profile">P</span></div></header>`;
}
function metrics() {
  const acc=accuracy(state.session); const unassisted=state.session.filter(x=>!x.assisted);
  return `<div class="metrics"><div class="metric"><span class="metric-icon green">${icon('target')}</span><div><div class="metric-label">Session accuracy</div><strong>${acc === null ? '—' : acc+'<span>%</span>'}</strong><small>${unassisted.filter(x=>x.correct).length} of ${unassisted.length} unassisted correct</small></div><span class="metric-decoration">↗</span></div><div class="metric"><span class="metric-icon orange">${icon('flame')}</span><div><div class="metric-label">Current streak</div><strong>${state.streak}<span> hands</span></strong><small>Personal best: ${state.best} hands</small></div></div><div class="metric"><span class="metric-icon blue">${icon('cards')}</span><div><div class="metric-label">Hands practiced</div><strong>${state.session.length}<span>${prefs.length ? ' / '+prefs.length : ' this session'}</span></strong><small>${state.history.length} total in your history</small></div></div></div>`;
}
function card(value, suit, hidden=false, delay=0) {
  const red = suit === '♥' || suit === '♦';
  return `<div class="playing-card ${hidden?'card-back':red?'red':''}" style="--delay:${delay}ms" ${hidden?'aria-label="Dealer hole card, face down"':`aria-label="${value===11?'Ace':value} of ${{'♥':'hearts','♦':'diamonds','♠':'spades','♣':'clubs'}[suit]}"`}>${hidden?'<div class="back-pattern"><span>♠</span></div>':`<span class="card-corner">${up(value)}<small>${suit}</small></span><span class="card-suit">${suit}</span><span class="card-corner bottom">${up(value)}<small>${suit}</small></span>`}</div>`;
}
function table() {
  const h=state.hand; const result=state.answered?recommend(h.cards,h.dealer,rules):null;
  const correct=result===state.selection;
  return `<section class="table-panel" aria-label="Blackjack practice"><div class="panel-top"><span><i class="live-dot"></i> THE PRACTICE TABLE</span><button class="icon-button" data-do="restart" title="Start a new session" aria-label="Start a new session">${icon('reset')}</button></div><div class="felt ${state.answered?'resolved':''}" data-deal="${state.deal}"><div class="felt-border"></div><div class="table-round">HAND ${String(state.round).padStart(2,'0')}</div><div class="dealer-area"><span class="table-label">DEALER SHOWS</span><div class="card-row dealer-cards">${card(h.dealer,'♠',false,0)}${card(0,'♠',true,100)}</div></div><div class="felt-lettering"><span>BLACKJACK PAYS 3 TO 2</span><small>DEALER ${rules.h17?'HITS':'STANDS ON'} SOFT 17</small></div><div class="player-area"><div class="card-row player-cards">${card(h.cards[0],'♠',false,180)}${card(h.cards[1],'♥',false,280)}</div><div class="player-caption"><span>YOUR HAND</span><strong>${total(h.cards).value}</strong><span class="hand-kind">${category(h.cards)==='pairs'?'PAIR':total(h.cards).soft?'SOFT':'HARD'}</span></div></div><span class="table-corner left">♣</span><span class="table-corner right">♦</span></div><div class="decision-area"><div class="decision-heading"><div><h2>${state.answered?(correct?'Nicely played.':'A moment to learn.'):"What’s your move?"}</h2><p>${state.answered?`The best play is <strong>${ACTIONS[result].toLowerCase()}</strong>.${state.assisted?' · Assisted hand':''}`:'Choose the best play for this hand.'}</p></div>${!state.answered?`<button class="hint-button" data-do="hint">${icon('bulb')} ${state.hint?'Hide hint':'Need a hint?'} <kbd>?</kbd></button>`:`<span class="result-badge ${correct?'correct':'incorrect'}">${icon(correct?'check':'bulb')} ${correct?'Correct move':'Keep practicing'}</span>`}</div>${state.hint&&!state.answered?`<div class="hint-callout">${icon('bulb')}<p><strong>${ACTIONS[recommend(h.cards,h.dealer,rules)]}</strong> — ${explain(h.cards,h.dealer,rules)}</p><button data-do="view-hand" class="text-button">View in chart ↗</button></div>`:''}<div class="actions">${[['H','plus','1'],['S','hand','2'],['D','bolt','3'],['P','split','4'],['R','flag','5']].map(([a,i,k])=>{
    const unavailable=a==='P'&&category(h.cards)!=='pairs'||a==='R'&&!rules.surrender;
    return `<button class="action-btn ${state.answered&&a===result?'best-action':''} ${state.answered&&a===state.selection&&a!==result?'wrong-action':''}" data-action="${a}" ${state.answered||unavailable?'disabled':''} title="${unavailable?(a==='P'?'Splitting needs a pair':'Surrender is off in table rules'):`${ACTIONS[a]} (${k} or ${a})`}">${icon(i)}<span>${ACTIONS[a]}</span><kbd>${k}</kbd></button>`;
  }).join('')}</div>${state.answered?`<div class="answer-explanation"><p>${explain(h.cards,h.dealer,rules)}</p><button class="primary-button" data-do="next">${prefs.length&&state.session.length>=prefs.length?'View results':'Next hand'} ${icon('arrow')}<kbd>↵</kbd></button></div>`:'<div class="keyboard-note">'+icon('keyboard')+' Use <kbd>1</kbd> – <kbd>5</kbd> to play. Build the habit, one hand at a time.</div>'}</div></section>`;
}
function toggle(key, title, sub, scope='rule') {
  const checked=(scope==='rule'?rules:prefs)[key];
  if(key==='h17')sub=rules.h17?'Dealer draws again with A + 6':'Dealer stands on all 17s';
  return `<label class="toggle-row" for="${scope}-${key}"><span><strong>${title}</strong>${sub?`<small>${sub}</small>`:''}</span><input type="checkbox" role="switch" id="${scope}-${key}" data-${scope}="${key}" ${checked?'checked':''}/><span class="switch" aria-hidden="true"></span></label>`;
}
function rulesPanel() {
  return `<aside class="right-column"><section class="rules-panel"><div class="section-heading"><h2>${icon('settings')} Table rules</h2><span class="mini-label">CUSTOMIZE</span></div><p class="section-description">Practice the game you actually play.</p><div class="field"><label for="deck-count">Number of decks</label><select id="deck-count" data-rule="decks"><option value="4" ${rules.decks===4?'selected':''}>4 decks</option><option value="6" ${rules.decks===6?'selected':''}>6 decks <span>·</span> Standard</option><option value="8" ${rules.decks===8?'selected':''}>8 decks</option></select></div><div class="rules-divider"></div>${toggle('h17','Dealer hits soft 17','Off: dealer stands on all 17s')}${toggle('das','Double after split','Double down on a split hand')}${toggle('surrender','Late surrender','Give up half your initial bet')}<div class="rules-summary"><span class="summary-icon">${icon('check')}</span><div><strong>Strategy is up to date</strong><small>Hints adapt to your table rules.</small></div></div><button class="rules-info" data-do="rules-info">American blackjack · dealer peek ${icon('help')}</button></section><div class="daily-tip"><span class="tip-icon">${icon('bulb')}</span><span class="eyebrow">A LITTLE TABLE WISDOM</span><h3>Play the hand.<br>Trust the strategy.</h3><p>A correct decision can still lose a hand. Focus on the move, not the outcome.</p><div class="tip-line"></div><span class="tip-footer">GOOD HABITS COMPOUND. <span>✳</span></span></div></aside>`;
}
function settingsPanel() {
  return `<section class="practice-settings"><div class="settings-title"><span class="metric-icon neutral">${icon('target')}</span><div><h2>Make practice your own</h2><p>Find your rhythm. Work on what matters.</p></div></div><div class="practice-options"><div><span class="field-label">PRACTICE FOCUS</span><div class="focus-pills" role="group" aria-label="Practice focus">${[['all','All hands'],['hard','Hard totals'],['soft','Soft totals'],['pairs','Pairs'],['mistakes','Mistakes']].map(([v,t])=>`<button data-focus="${v}" class="${prefs.focus===v?'selected':''}" aria-pressed="${prefs.focus===v}">${t}${v==='mistakes'?` <span>${mistakes().length}</span>`:''}</button>`).join('')}</div></div><div class="session-length"><label class="field-label" for="session-length">SESSION LENGTH</label><select id="session-length" data-pref="length" ${state.session.length?'disabled title="Start a new session to change length"':''}><option value="20" ${prefs.length===20?'selected':''}>20 hands</option><option value="50" ${prefs.length===50?'selected':''}>50 hands</option><option value="0" ${prefs.length===0?'selected':''}>Unlimited</option></select></div></div><div class="preference-row">${toggle('auto','Auto-advance','Next hand after 2 seconds','pref')}${toggle('sound','Sound effects','A little audio feedback','pref')}<span class="saved-note" id="save-state">${icon('check')} Preferences saved on this device</span></div></section>`;
}
function practice() {
  return `<div class="page-heading"><div><span class="eyebrow">A BETTER MOVE STARTS HERE</span><h1>Practice makes instinct<span class="accent-dot">.</span></h1><p>Learn the right play. Build your confidence. One hand at a time.</p></div><span class="practice-pill"><i></i> FREE PRACTICE</span></div>${metrics()}<div class="practice-layout"><div>${state.complete?summary():table()}</div>${rulesPanel()}</div>${settingsPanel()}`;
}
function chart() {
  const types={hard:'Hard totals',soft:'Soft totals',pairs:'Pairs'};
  const handCategory=category(state.hand.cards);
  return `<div class="page-heading"><div><span class="eyebrow">YOUR TABLE-SIDE GUIDE</span><h1>The right move, at a glance<span class="accent-dot">.</span></h1><p>A live basic strategy chart, matched to your table rules.</p></div><button class="secondary-button" data-do="print">${icon('download')} Print chart</button></div><div class="chart-layout"><section class="chart-panel"><div class="chart-top"><div class="chart-tabs" role="tablist" aria-label="Strategy hand type">${Object.entries(types).map(([v,t])=>`<button role="tab" aria-selected="${state.chart===v}" data-chart="${v}" class="${state.chart===v?'selected':''}">${t}</button>`).join('')}</div><span class="chart-rule-label">${ruleSummary()}</span></div><div class="chart-intro"><strong>${types[state.chart]}</strong><span>Find your hand on the left. Follow the dealer’s card across.</span></div><div class="chart-scroll"><table class="strategy-table"><caption class="sr-only">${types[state.chart]} basic strategy for ${ruleSummary()}</caption><thead><tr><th scope="col">Your hand <span>↓</span><small>Dealer upcard →</small></th>${UPCARDS.map(n=>`<th scope="col">${up(n)}</th>`).join('')}</tr></thead><tbody>${chartRows(state.chart).map(row=>`<tr><th scope="row">${row.name}</th>${UPCARDS.map(n=>{
    const a=recommend(row.cards,n,rules); const match=state.chart===handCategory&&n===state.hand.dealer&&(state.chart==='pairs'?row.cards[0]===state.hand.cards[0]:total(row.cards).value===total(state.hand.cards).value);
    const ds=a==='D'&&total(row.cards).soft&&total(row.cards).value>=18;
    return `<td><button class="strategy-cell cell-${a} ${match?'current-cell':''}" data-cell="${row.cards.join(',')}:${n}" title="${row.name} vs ${up(n)}: ${ACTIONS[a]}${a==='D'?ds?', otherwise stand':', otherwise hit':''}">${a}${a==='D'?`<small>${ds?'s':'h'}</small>`:''}</button></td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div><div class="chart-legend">${Object.entries(ACTIONS).map(([k,v])=>`<span><b class="cell-${k}">${k}</b>${v}</span>`).join('')}</div><div class="chart-footnote"><p><strong>Dh</strong> = double, otherwise hit. <strong>Ds</strong> = double, otherwise stand. Double on any initial two cards. Chart assumes dealer has checked for blackjack.</p><p>Total-dependent strategy for 4–8 decks. <a href="https://wizardofodds.com/games/blackjack/strategy/4-decks/" target="_blank" rel="noopener noreferrer">Strategy reference: Wizard of Odds ↗</a></p></div></section><div>${rulesPanel()}<button class="primary-button back-to-practice" data-page="practice">Back to practice ${icon('arrow')}</button></div></div><section class="chart-current"><div>${icon('bulb')}<span><strong>Your current hand: ${label(state.hand.cards)} vs ${up(state.hand.dealer)}</strong><small>${explain(state.hand.cards,state.hand.dealer,rules)}</small></span></div><button class="secondary-button" data-do="view-hand">Highlight my hand</button></section>`;
}
function mistakes() {
  const map=new Map();
  for(const item of state.history) {
    const key=`${item.cards.slice().sort((a,b)=>a-b).join(',')}:${item.dealer}`;
    if (!item.correct && !item.assisted) map.set(key,item);
    else if(item.correct && !item.assisted && JSON.stringify(item.rules)===JSON.stringify(rules)) map.delete(key);
  }
  return [...map.values()];
}
function historyRows(items) {
  return items.length ? items.slice(-12).reverse().map(x=>`<tr><td><span class="history-hand">${x.cards.map(up).join(' + ')}</span><small>${label(x.cards)}</small></td><td>${up(x.dealer)}</td><td>${ACTIONS[x.selection]||'—'}</td><td class="best-text">${ACTIONS[x.best]||'—'}</td><td><span class="history-badge ${x.assisted?'assisted':x.correct?'correct':'incorrect'}">${x.assisted?'Assisted':x.correct?'Correct':'Review'}</span></td><td>${(x.ms/1000).toFixed(1)}s</td></tr>`).join('') : '<tr><td colspan="6" class="empty-table">Your first hand is the start of something good.<br><button class="text-button" data-page="practice">Start practicing →</button></td></tr>';
}
function stats() {
  const acc=accuracy(state.history), clean=state.history.filter(x=>!x.assisted), avg=clean.length?clean.reduce((s,x)=>s+x.ms,0)/clean.length/1000:0;
  return `<div class="page-heading"><div><span class="eyebrow">SMALL DECISIONS. REAL PROGRESS.</span><h1>See your instincts improve<span class="accent-dot">.</span></h1><p>Your practice history, saved privately in this browser. Last 1,000 hands.</p></div><button class="secondary-button" data-do="export" ${!state.history.length?'disabled':''}>${icon('download')} Export history</button></div><div class="metrics stats-metrics">${[[icon('target'),'Overall accuracy',acc===null?'—':acc+'%','Unassisted hands only','green'],[icon('flame'),'Best streak',state.best,'Consecutive unassisted correct','orange'],[icon('time'),'Average decision',avg?avg.toFixed(1)+'s':'—','Unassisted hands only','blue'],[icon('cards'),'Hands practiced',state.history.length,`${state.history.filter(x=>x.assisted).length} assisted hands`,'neutral']].map(([i,t,v,s,c])=>`<div class="metric"><span class="metric-icon ${c}">${i}</span><div><div class="metric-label">${t}</div><strong>${v}</strong><small>${s}</small></div></div>`).join('')}</div><div class="insights-grid"><section class="insight-panel"><h2>Where you’re getting stronger</h2><p>Accuracy by hand type</p>${[['hard','Hard totals'],['soft','Soft totals'],['pairs','Pairs']].map(([v,t])=>{const items=clean.filter(x=>category(x.cards)===v),a=accuracy(items);return `<div class="skill-row"><div><strong>${t}</strong><span>${a===null?'No hands yet':`${a}% · ${items.length} hands`}</span></div><div class="skill-track"><span style="width:${a||0}%"></span></div></div>`;}).join('')}</section><section class="review-panel"><span class="eyebrow">TURN MISTAKES INTO MUSCLE MEMORY</span><h2>${mistakes().length ? `${mistakes().length} hands worth another look.` : 'A fresh start. A better next move.'}</h2><p>${mistakes().length?'Revisit missed scenarios using your current table rules. A correct, unassisted answer clears a hand from review.':'Missed hands will appear here so you can turn them into your strongest plays.'}</p><button class="primary-button" data-do="review" ${!mistakes().length?'disabled':''}>Practice mistakes ${icon('arrow')}</button></section></div><section class="history-panel"><div class="section-heading"><h2>Recent hands</h2><span class="mini-label">LAST 12 HANDS</span></div><div class="history-scroll"><table class="history-table"><thead><tr><th>Your hand</th><th>Dealer</th><th>Your move</th><th>Best move</th><th>Result</th><th>Time</th></tr></thead><tbody>${historyRows(state.history)}</tbody></table></div></section><div class="stats-footer"><p>Correct choices measure strategy knowledge, not whether a casino hand would win.</p><button class="text-button danger" data-do="clear">Clear practice history</button></div>`;
}
function summary() {
  const a=accuracy(state.session), clean=state.session.filter(x=>!x.assisted);
  return `<section class="session-summary"><div class="summary-art">${icon('check')}</div><span class="eyebrow">ONE SESSION. STRONGER INSTINCTS.</span><h2>That’s a good practice.</h2><p>${state.session.length} decisions closer to making it second nature.</p><div class="summary-score">${a===null?'—':a+'<span>%</span>'}</div><span class="summary-label">UNASSISTED ACCURACY</span><div class="summary-facts"><span><strong>${clean.filter(x=>x.correct).length}/${clean.length}</strong> correct</span><span><strong>${state.session.filter(x=>x.assisted).length}</strong> assisted</span></div><button class="primary-button" data-do="new-session">Practice another session ${icon('arrow')}</button><button class="text-button" data-page="stats">Explore your statistics →</button></section>`;
}
function render() {
  const active=document.activeElement?.id;
  root.innerHTML=`${sidebar()}<div class="workspace">${header()}<main id="main-content" tabindex="-1">${state.page==='practice'?practice():state.page==='hints'?chart():stats()}<footer class="page-footer"><span><span class="footer-spade">♠</span> BLACKJACK LAB <span class="footer-divider">/</span> Make your next move your best.</span><span>Practice only. No bets. Just better decisions.</span></footer></main></div>`;
  if(renderedDeal!==state.deal)document.querySelector('.felt')?.classList.add('dealing');
  renderedDeal=state.deal;
  for(const button of root.querySelectorAll('.nav-item')) button.setAttribute('aria-label',button.querySelector('span')?.firstChild?.textContent?.trim()||'Navigation');
  for(const button of root.querySelectorAll('.strategy-cell')) button.setAttribute('aria-label',button.title);
  if(active) document.getElementById(active)?.focus({preventScroll:true});
}
function nextHand() {
  clearTimeout(autoTimer);
  if(prefs.length&&state.session.length>=prefs.length) { state.complete=true; render(); return; }
  const missed=mistakes();
  if(prefs.focus==='mistakes'&&!missed.length){prefs.focus='all';document.querySelector('#announcer').textContent='Your mistake review is complete. Continuing with all hands.';}
  const hand=prefs.focus==='mistakes'&&missed.length?missed[Math.floor(Math.random()*missed.length)]:makeHand(prefs.focus);
  state.hand={cards:hand.cards.slice(),dealer:hand.dealer};
  state.answered=false; state.selection=null;state.assisted=state.page==='hints';state.hint=false;state.started=performance.now();state.round=state.session.length+1;state.deal++;
  render();
}
function newSession() { state.session=[];state.streak=0;state.round=1;state.complete=false;nextHand(); }
function play(action) {
  if(state.page!=='practice'||state.answered||state.complete) return;
  if(action==='P'&&category(state.hand.cards)!=='pairs'||action==='R'&&!rules.surrender) return;
  const best=recommend(state.hand.cards,state.hand.dealer,rules), correct=best===action;
  const record={cards:state.hand.cards.slice(),dealer:state.hand.dealer,rules:{...rules},selection:action,best,correct,assisted:state.assisted,ms:Math.round(performance.now()-state.started),at:Date.now()};
  state.selection=action;state.answered=true;state.session.push(record);state.history.push(record);state.history=state.history.slice(-1000);
  state.streak=correct&&!state.assisted?state.streak+1:0;state.best=Math.max(state.best,state.streak);
  persist();tone(correct);render();
  document.querySelector('#announcer').textContent=`${correct?'Correct.':'Keep practicing.'} ${ACTIONS[best]} is the best move. ${explain(state.hand.cards,state.hand.dealer,rules)}`;
  if(prefs.auto) autoTimer=setTimeout(()=>{if(state.page==='practice'&&state.answered)nextHand();},2000);
}
function tone(correct) {
  if(!prefs.sound) return;
  try {audioContext??=new (window.AudioContext||window.webkitAudioContext)(); audioContext.resume(); const o=audioContext.createOscillator(),g=audioContext.createGain();o.connect(g);g.connect(audioContext.destination);o.type='sine';o.frequency.setValueAtTime(correct?580:220,audioContext.currentTime);o.frequency.exponentialRampToValueAtTime(correct?870:170,audioContext.currentTime+.15);g.gain.setValueAtTime(.055,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.22);o.start();o.stop(audioContext.currentTime+.23);}catch{/* Sound is optional. */}
}
function navigate(page) {
  clearTimeout(autoTimer);state.page=page;
  if(page==='hints'&&!state.answered) state.assisted=true;
  render(); window.scrollTo({top:0,behavior:'instant'});
}
let returnFocus;
function modal(title, content) {
  clearTimeout(autoTimer);returnFocus=document.activeElement;
  modalRoot.innerHTML=`<dialog class="modal"><div class="modal-heading"><h2>${title}</h2><button class="icon-button" data-do="close" aria-label="Close dialog">${icon('close')}</button></div><div class="modal-body">${content}</div></dialog>`;
  const d=modalRoot.querySelector('dialog');d.addEventListener('close',()=>{modalRoot.innerHTML='';returnFocus?.focus();});d.showModal();
}
function closeModal(){modalRoot.querySelector('dialog')?.close();}
function viewHand(){ state.chart=category(state.hand.cards);navigate('hints');document.querySelector('.current-cell')?.scrollIntoView({block:'nearest',behavior:'smooth'}); }
function exportHistory() {
  const lines=[['timestamp','cards','dealer','choice','best','correct','assisted','seconds','decks','h17','das','surrender'],...state.history.map(x=>[new Date(x.at).toISOString(),x.cards.map(up).join('+'),up(x.dealer),ACTIONS[x.selection],ACTIONS[x.best],x.correct,x.assisted,(x.ms/1000).toFixed(2),x.rules?.decks,x.rules?.h17,x.rules?.das,x.rules?.surrender])];
  const blob=new Blob([lines.map(row=>row.join(',')).join('\n')],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='blackjack-lab-history.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const commands={
  hint(){ state.hint=!state.hint;if(state.hint)state.assisted=true;render(); },
  next:nextHand,
  'new-session':newSession,
  'view-hand':viewHand,
  restart(){if(!state.session.length){newSession();return;}modal('Start a fresh session?',`<p>Your history is saved. Starting again resets this session’s count and streak.</p><button class="primary-button" data-do="confirm-restart">Start new session ${icon('arrow')}</button>`);},
  'confirm-restart'(){closeModal();newSession();},
  shortcuts(){modal('A shortcut to better practice',`<p>Keep your hands on the keyboard and find your flow.</p><div class="shortcut-list">${[['Hit','1 or H'],['Stand','2 or S'],['Double','3 or D'],['Split','4 or P'],['Surrender','5 or R'],['Next hand / results','Enter or Space'],['Show / hide hint','?']].map(([l,k])=>`<div><span>${l}</span><kbd>${k}</kbd></div>`).join('')}</div>`);},
  help(){modal('Welcome to your practice table',`<p>The goal is simple: choose the best first decision for each two-card hand against the dealer’s visible card.</p><ol class="help-steps"><li><strong>Set your table.</strong> Match the dealer’s rules, double after split, and surrender options.</li><li><strong>Make your move.</strong> Choose Hit, Stand, Double, Split, or Surrender. You’ll get immediate feedback and an explanation.</li><li><strong>Build the habit.</strong> Use focused drills, review mistakes, and follow your progress in Statistics.</li></ol><p>Hints and chart visits mark the current hand as assisted. Assisted hands stay in history but do not count toward accuracy or streaks.</p><div class="info-note">This is a decision quiz: each answer starts a new scenario. Cards are not played out, and there is no money or betting.</div><button class="primary-button" data-do="close">Let’s practice ${icon('arrow')}</button>`);},
  'rules-info'(){modal('The rules behind your practice',`<p>This trainer uses initial two-card, total-dependent basic strategy for <strong>4–8 deck American blackjack</strong>.</p><ul class="rule-details"><li>The dealer peeks for blackjack with an ace or ten showing. Make your decision after blackjack is ruled out.</li><li>Doubling is allowed on any initial two cards. Double after split and late surrender follow your selected settings.</li><li>Splits follow standard rules, including one card to split aces. These are initial decisions, not re-splitting scenarios.</li><li>4, 6, and 8 decks share the decision chart used here. Deck-specific composition exceptions, counting deviations, European no-hole-card rules, and side bets are outside this chart.</li><li>Scenarios are balanced for learning rather than drawn from a continuing shoe. Never take insurance in basic strategy.</li></ul><p><a href="https://wizardofodds.com/games/blackjack/strategy/4-decks/" target="_blank" rel="noopener noreferrer">Read the strategy reference at Wizard of Odds ↗</a></p>`);},
  print(){ window.print(); },
  export:exportHistory,
  review(){prefs.focus='mistakes';state.page='practice';newSession();window.scrollTo(0,0);},
  clear(){modal('Clear your practice history?',`<p>This removes all saved hands, session results, and your best streak from this browser. Your table rules and preferences are kept.</p><button class="primary-button destructive" data-do="confirm-clear">Clear all practice history</button>`);},
  'confirm-clear'(){closeModal();state.history=[];state.session=[];state.best=0;state.streak=0;state.complete=false;state.round=1;state.answered=false;persist();nextHand();},
  close:closeModal
};
document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.page)navigate(button.dataset.page);
  else if(button.dataset.action)play(button.dataset.action);
  else if(button.dataset.do)commands[button.dataset.do]?.();
  else if(button.dataset.focus){
    if(button.dataset.focus==='mistakes'&&!mistakes().length){modal('No mistakes to review yet',`<p>Missed unassisted hands will appear here. Keep practicing and this drill will help you revisit the tricky ones.</p><button class="primary-button" data-do="close">Keep practicing ${icon('arrow')}</button>`);return;}
    prefs.focus=button.dataset.focus;
    if(state.complete)render();else nextHand();
  }
  else if(button.dataset.chart){state.chart=button.dataset.chart;render();}
  else if(button.dataset.cell){const [c,d]=button.dataset.cell.split(':');const cards=c.split(',').map(Number),dealer=Number(d);modal(`${label(cards)} vs ${up(dealer)}`,`<span class="cell-answer cell-${recommend(cards,dealer,rules)}">${ACTIONS[recommend(cards,dealer,rules)]}</span><p>${explain(cards,dealer,rules)}</p><div class="info-note">${ruleSummary()}</div>`);}
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.dataset.rule){const k=el.dataset.rule;rules[k]=el.type==='checkbox'?el.checked:Number(el.value);clearTimeout(autoTimer);persist();if(state.answered&&!state.complete){nextHand();}else{state.hint=false;state.started=performance.now();render();}}
  if(el.dataset.pref){const k=el.dataset.pref;prefs[k]=el.type==='checkbox'?el.checked:Number(el.value);if(k==='auto')clearTimeout(autoTimer);persist();render();}
});
document.addEventListener('keydown',event=>{
  if(event.ctrlKey||event.metaKey||event.altKey||modalRoot.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA','BUTTON','A'].includes(document.activeElement?.tagName))return;
  if(state.page!=='practice')return;
  const key=event.key.toUpperCase();
  if((key==='ENTER'||key===' ')&&state.answered&&!state.complete){event.preventDefault();nextHand();return;}
  if(event.key==='?'&&!state.answered&&!state.complete){event.preventDefault();commands.hint();return;}
  const action={'1':'H','2':'S','3':'D','4':'P','5':'R',H:'H',S:'S',D:'D',P:'P',R:'R'}[key];
  if(action){event.preventDefault();play(action);}
});
window.addEventListener('hashchange',()=>{const page=location.hash.slice(1);if(['practice','hints','stats'].includes(page))navigate(page);});
if(['hints','stats'].includes(location.hash.slice(1))) {state.page=location.hash.slice(1);if(state.page==='hints')state.assisted=true;}
render();
