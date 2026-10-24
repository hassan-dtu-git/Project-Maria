import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendEvents, scoreEventForInterests } from '../src/recommendations.js';

const events = [
  { id: 'music', title: 'Indie Night Live', category: 'Music', description: 'A live set.' },
  { id: 'art', title: 'Sunday Sketch Club', category: 'Art', description: 'Draw together.' },
  { id: 'chai', title: 'Board Games & Chai', category: 'Social', description: 'Board games and conversation.' },
  { id: 'neutral', title: 'Community Meetup', category: 'Social', description: 'Meet your neighbours.' }
];

test('scores a relevant event above a non-matching event', () => {
  assert.ok(scoreEventForInterests(events[0], ['Live music']) > scoreEventForInterests(events[3], ['Live music']));
});

test('recommends only events with a positive interest score', () => {
  assert.deepEqual(recommendEvents(events, ['Art & making']).map(event => event.id), ['art']);
});

test('ranks events by match score and keeps stable ordering for ties', () => {
  const result = recommendEvents(events, ['Live music', 'Art & making'], 3);
  assert.deepEqual(result.map(event => event.id), ['music', 'art']);
});

test('returns no recommendations when there are no interests or no events', () => {
  assert.deepEqual(recommendEvents(events, []), []);
  assert.deepEqual(recommendEvents([], ['Live music']), []);
});

test('does not return more than the requested number of events', () => {
  assert.equal(recommendEvents(events, ['Live music', 'Art & making', 'Board games'], 2).length, 2);
});
