import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RULES, ACTIONS, UPCARDS, recommend, total, category, chartRows, makeHand } from '../src/strategy.js';
const s17 = {...DEFAULT_RULES};
const h17 = {...s17,h17:true};

test('ace valuation stays correct as aces become hard',()=>{
  assert.deepEqual(total([11,6]),{value:17,soft:true});
  assert.deepEqual(total([11,11]),{value:12,soft:true});
  assert.deepEqual(total([11,11,9]),{value:21,soft:true});
  assert.deepEqual(total([11,6,10]),{value:17,soft:false});
  assert.equal(category([8,8]),'pairs');
  assert.equal(category([11,7]),'soft');
});

const scenarios = [
  ['hard 9 vs 2',[4,5],2,s17,'H'],['hard 9 vs 3',[4,5],3,s17,'D'],
  ['hard 10 vs 9',[4,6],9,s17,'D'],['hard 10 vs ten',[4,6],10,s17,'H'],
  ['11 vs ace S17',[5,6],11,s17,'H'],['11 vs ace H17',[5,6],11,h17,'D'],
  ['12 vs 3',[10,2],3,s17,'H'],['12 vs 4',[10,2],4,s17,'S'],
  ['16 vs 7',[10,6],7,s17,'H'],['16 vs 6',[10,6],6,s17,'S'],
  ['hard 17',[10,7],11,s17,'S'],['hard 20',[10,10],6,s17,'S'],
  ['soft 13 vs 4',[11,2],4,s17,'H'],['soft 13 vs 5',[11,2],5,s17,'D'],
  ['soft 16 vs 3',[11,5],3,s17,'H'],['soft 16 vs 4',[11,5],4,s17,'D'],
  ['soft 17 vs 3',[11,6],3,s17,'D'],['soft 17 vs 7',[11,6],7,s17,'H'],
  ['soft 18 vs 2 S17',[11,7],2,s17,'S'],['soft 18 vs 2 H17',[11,7],2,h17,'D'],
  ['soft 18 vs 8',[11,7],8,s17,'S'],['soft 18 vs 9',[11,7],9,s17,'H'],
  ['soft 19 vs 6 S17',[11,8],6,s17,'S'],['soft 19 vs 6 H17',[11,8],6,h17,'D'],
  ['aces always split',[11,11],11,s17,'P'],['eights split',[8,8],10,s17,'P'],
  ['fives double not split',[5,5],6,s17,'D'],['tens never split',[10,10],5,s17,'S'],
  ['twos vs 2 DAS',[2,2],2,s17,'P'],['twos vs 2 NDAS',[2,2],2,{...s17,das:false},'H'],
  ['threes vs 3 NDAS',[3,3],3,{...s17,das:false},'H'],['threes vs 4 NDAS',[3,3],4,{...s17,das:false},'P'],
  ['fours vs 5 DAS',[4,4],5,s17,'P'],['fours vs 5 NDAS',[4,4],5,{...s17,das:false},'H'],
  ['sixes vs 2 DAS',[6,6],2,s17,'P'],['sixes vs 2 NDAS',[6,6],2,{...s17,das:false},'H'],
  ['sixes vs 3 NDAS',[6,6],3,{...s17,das:false},'P'],['sevens vs 7',[7,7],7,s17,'P'],
  ['nines vs 7',[9,9],7,s17,'S'],['nines vs 8',[9,9],8,s17,'P'],
  ['nines vs 10',[9,9],10,s17,'S'],
  ['16 vs 9 surrender',[10,6],9,{...s17,surrender:true},'R'],
  ['15 vs 10 surrender',[10,5],10,{...s17,surrender:true},'R'],
  ['15 vs ace S17 hit',[10,5],11,{...s17,surrender:true},'H'],
  ['15 vs ace H17 surrender',[10,5],11,{...h17,surrender:true},'R'],
  ['17 vs ace H17 surrender',[10,7],11,{...h17,surrender:true},'R'],
  ['8,8 vs ace H17 surrender',[8,8],11,{...h17,surrender:true},'R'],
  ['8,8 vs ten split with surrender',[8,8],10,{...s17,surrender:true},'P'],
  ['8,8 vs ace S17 split with surrender',[8,8],11,{...s17,surrender:true},'P'],
  ['multi-card 16 cannot surrender',[4,5,7],10,{...s17,surrender:true},'H'],
  ['multi-card soft18 cannot double',[11,2,5],3,h17,'S']
];
for(const [name,cards,dealer,rules,expected] of scenarios)test(name,()=>assert.equal(recommend(cards,dealer,rules),expected));

test('all 24 supported configurations produce legal decisions across the complete chart',()=>{
  let checked=0;
  for(const decks of [4,6,8])for(const h17 of [true,false])for(const das of [true,false])for(const surrender of [true,false]){
    const rules={decks,h17,das,surrender};
    for(const type of ['hard','soft','pairs'])for(const row of chartRows(type))for(const dealer of UPCARDS){
      const a=recommend(row.cards,dealer,rules);
      assert.ok(Object.hasOwn(ACTIONS,a));
      if(a==='P')assert.equal(category(row.cards),'pairs');
      if(a==='R')assert.ok(surrender);
      checked++;
    }
  }
  assert.equal(checked,7680);
});

test('randomized drills obey their selected category and produce valid two-card hands',()=>{
  // Seeded RNG keeps failures reproducible.
  let seed=104;
  const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(const focus of ['hard','soft','pairs'])for(let i=0;i<1000;i++){
    const h=makeHand(focus,rng);
    assert.equal(category(h.cards),focus);
    assert.ok(total(h.cards).value>=4&&total(h.cards).value<=20);
    assert.ok(UPCARDS.includes(h.dealer));
    assert.ok(h.cards.every(n=>n>=2&&n<=11));
  }
});
