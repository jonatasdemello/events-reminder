const { readFileSync } = require('node:fs');
const { join } = require('node:path');

function parseEvents(csv) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const input = csv.replace(/^\uFEFF/, '');

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
      row.push(field.trim());
      field = '';
      if (char !== ',') {
        if (row.some(Boolean)) rows.push(row);
        row = [];
        if (char === '\r' && input[i + 1] === '\n') i++;
      }
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);

  const headers = rows.shift() ?? [];
  for (const header of ['EventName', 'Month', 'Day']) {
    if (!headers.includes(header)) throw new Error(`Missing CSV column: ${header}`);
  }

  return rows.map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(`Incorrect number of fields in CSV record ${index + 2}.`);
    }
    const get = (name) => values[headers.indexOf(name)] ?? '';
    const month = Number(get('Month'));
    const day = Number(get('Day'));
    // Use a leap year so February 29 is a valid recurring event date.
    const date = new Date(2000, month - 1, day);
    if (!get('EventName') || !Number.isInteger(month) || !Number.isInteger(day)
      || date.getMonth() !== month - 1 || date.getDate() !== day) {
      throw new Error(`Invalid name or date in CSV record ${index + 2}.`);
    }
    return { name: get('EventName'), month, day, type: get('Type') };
  });
}

function upcomingEvents(events, today = new Date(), days = 5) {
  if (!Number.isSafeInteger(days) || days < 0) {
    throw new Error('days must be a non-negative whole number.');
  }
  const matches = [];
  // Calendar arithmetic keeps the window correct across DST and year changes.
  for (let offset = 0; offset <= days; offset++) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    for (const event of events) {
      if (event.month === date.getMonth() + 1 && event.day === date.getDate()) {
        matches.push({ ...event, date, offset });
      }
    }
  }
  return matches;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && !/^\d+$/.test(args[0]))) {
    throw new Error('Usage: node index.js [days] (a non-negative whole number).');
  }
  const days = args.length === 0 ? 5 : Number(args[0]);
  const events = parseEvents(readFileSync(join(__dirname, 'events.csv'), 'utf8'));
  const matches = upcomingEvents(events, new Date(), days);
  console.log(days === 0 ? 'Events for today:' : `Events for today and the next ${days} ${days === 1 ? 'day' : 'days'}:`);
  if (matches.length === 0) console.log('No events found.');
  for (const event of matches) {
    const date = event.date.toLocaleDateString('en-CA');
    const when = event.offset === 0 ? 'Today' : event.offset === 1 ? 'Tomorrow' : `In ${event.offset} days`;
    console.log(`${date} (${when}) - ${event.name}${event.type ? ` [${event.type}]` : ''}`);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Unable to list events: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { parseEvents, upcomingEvents };
