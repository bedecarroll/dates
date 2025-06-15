# Dates

A simple tool for converting dates and times across multiple timezones. Enter any date/time (natural language or timestamp), select up to four timezones, and view a table showing the corresponding times from one hour earlier through two hours later in 15-minute increments.

## Features
- Parse natural-language date/time (via Sugar.js) or Unix timestamps
- Add up to four IANA timezones (with autocomplete for abbreviations)
- Generate a table of times at 15-minute intervals from –1h to +2h per timezone
- Dark/light mode toggle and persistent timezone selection (localStorage)
- Copy any table cell to clipboard with a single click

## Contents
- **index.html**: Main HTML entry point
- **styles.css**: Styling for theme, layout, and table
- **src/**: TypeScript source (main.ts for UI, dateTimeConverter.ts for parsing/formatting, autocomplete.ts)
- **package.json**, **tsconfig.json**: Build scripts and compiler options
- **LICENSE**: MIT license
- **README.md**: This documentation

## Getting Started
1. Clone or download the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```
4. Serve the **public/** folder locally:
   ```bash
   npm run serve       # via 'serve'
   npm run serve:python # via Python HTTP server on port 8000
   ```
5. Open your browser at `http://localhost:5000` (or `:8000` for Python) and use the interface:
   - Enter a date/time string (e.g., "tomorrow at 3pm" or a Unix timestamp).
   - Add up to four timezones via the autocomplete input.
   - Click **Convert** to display the offset table.

## License
This project is licensed under the MIT License; see the **LICENSE** file for details.

Enjoy building your site!
