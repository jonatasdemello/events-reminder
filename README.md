# Events Reminder

A simple Node.js console application that reads `events.csv` and lists events for
today through a configurable number of days ahead, in date order. Defaults to five
days ahead (six calendar dates, inclusive).

Requires Node.js 18 or newer. No dependencies or installation needed.

```sh
npm start
```

You can also run `node index.js`. The CSV is loaded from the application's folder,
even when the command is run from another directory.

Pass an optional `days` argument to change the window:

```sh
node index.js 10
npm start -- 10
```

`days` must be a non-negative whole number. `0` lists only today's events.
Omitting the argument uses `5`. Both today and the final day are included.

CSV format:

```csv
EventName,Year,Month,Day,Type
Example birthday,,10,22,birthday
Example anniversary,2001,10,25,anniversary
```

`EventName`, `Month`, and `Day` are required. `Year` can be blank or its column
omitted; it is ignored when matching events. Matching uses **month and day**,
treating events as annual occurrences. `Type` is optional. Quote names containing
commas, and escape quotes inside quoted fields by doubling them.

Dates use the computer's local timezone. The window works across month and year
boundaries; February 29 events appear only in leap years. Holiday dates are matched
as recorded, so update the CSV for holidays whose month/day changes each year.

Run checks with `npm test`.
