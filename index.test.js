const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseEvents, upcomingEvents } = require('./index');

test('includes today and day five, excludes past dates and day six, ignoring years', () => {
  const events = parseEvents('EventName,Year,Month,Day,Type\nPast,2000,10,21,birthday\nToday,,10,22,birthday\nFifth,1990,10,27,holiday\nSixth,,10,28,birthday');
  assert.deepEqual(upcomingEvents(events, new Date(2026, 9, 22, 23)).map(e => e.name), ['Today', 'Fifth']);
});

test('supports omitted Year column, quoted names, escaped quotes, BOM, and CRLF', () => {
  const events = parseEvents('\uFEFFEventName,Month,Day,Type\r\n"Doe, ""Jane""",1,1,birthday\r\n');
  assert.equal(events[0].name, 'Doe, "Jane"');
});

test('uses the requested inclusive window and supports today only', () => {
  const events = parseEvents('EventName,Month,Day\nToday,10,22\nTomorrow,10,23\nSeventh,10,29\nEighth,10,30');
  const today = new Date(2026, 9, 22);
  assert.deepEqual(upcomingEvents(events, today, 0).map(e => e.name), ['Today']);
  assert.deepEqual(upcomingEvents(events, today, 7).map(e => e.name), ['Today', 'Tomorrow', 'Seventh']);
  for (const days of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => upcomingEvents(events, today, days), /non-negative whole number/);
  }
});

test('sorts chronologically across a year boundary', () => {
  const events = parseEvents('EventName,Month,Day\nNew Year,1,1\nYear end,12,31\nToo late,1,4');
  const matches = upcomingEvents(events, new Date(2026, 11, 29));
  assert.deepEqual(matches.map(e => e.name), ['Year end', 'New Year']);
  assert.equal(matches[1].date.getFullYear(), 2027);
});

test('only lists February 29 in leap years and handles month boundaries', () => {
  const events = parseEvents('EventName,Month,Day\nLeap day,2,29\nMarch,3,1');
  assert.deepEqual(upcomingEvents(events, new Date(2027, 1, 27)).map(e => e.name), ['March']);
  assert.deepEqual(upcomingEvents(events, new Date(2028, 1, 27)).map(e => e.name), ['Leap day', 'March']);
});

test('rejects invalid data and returns no matches for an empty event list', () => {
  assert.throws(() => parseEvents('EventName,Month,Day\nInvalid,2,30'), /Invalid/);
  assert.throws(() => parseEvents('EventName,Month\nMissing,1'), /Missing CSV column/);
  assert.throws(() => parseEvents('EventName,Month,Day\n"Unclosed,1,1'), /unclosed/);
  assert.deepEqual(upcomingEvents([]), []);
});
