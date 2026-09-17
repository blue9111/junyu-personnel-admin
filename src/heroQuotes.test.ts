import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getPageHeroQuote, heroQuotes, nextHeroQuote } from './heroQuotes';

test('all 100 supplied quotes appear once per round, including after restoring progress', () => {
  assert.equal(heroQuotes.length, 100);
  assert.equal(new Set(heroQuotes).size, 100);
  let saved: string | null = null;
  const storage = { getItem: () => saved, setItem: (_: string, value: string) => { saved = value; } };
  const first = Array.from({ length: 100 }, () => nextHeroQuote(storage));
  const second = Array.from({ length: 100 }, () => nextHeroQuote(storage));
  assert.deepEqual(new Set(first), new Set(heroQuotes));
  assert.deepEqual(new Set(second), new Set(heroQuotes));
  assert.notEqual(first[99], second[0]);
  saved = JSON.stringify({ remaining: [42], last: 12 });
  assert.equal(nextHeroQuote(storage), heroQuotes[42]);
  assert.ok(heroQuotes.includes(nextHeroQuote(storage) as typeof heroQuotes[number]));
});

test('invalid or blocked storage does not prevent a quote from displaying', () => {
  for (const saved of ['{broken', '{"remaining":[999],"last":1}', '{"remaining":[1,1],"last":2}']) {
    assert.ok(heroQuotes.includes(nextHeroQuote({ getItem: () => saved, setItem: () => {} }) as typeof heroQuotes[number]));
  }
  assert.doesNotThrow(() => nextHeroQuote({ getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } }));
});

test('rerenders and Strict Mode reuse one quote for the current page', () => {
  const first = getPageHeroQuote();
  for (let i = 0; i < 10; i++) assert.equal(getPageHeroQuote(), first);
});
