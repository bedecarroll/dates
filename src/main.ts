import { DateTimeConverter, FormatType } from './dateTimeConverter.js';
import { AutocompleteInput } from './autocomplete.js';
// Sugar.js is loaded via CDN
declare const Sugar: any;

// Map common abbreviations to IANA timezones
const TZ_ABBREVIATIONS: Record<string, string> = {
  'UTC': 'UTC',
  'GMT': 'UTC',
  'EST': 'America/New_York',
  'EDT': 'America/New_York',
  'CST': 'America/Chicago',
  'CDT': 'America/Chicago',
  'MST': 'America/Denver',
  'MDT': 'America/Denver',
  'PST': 'America/Los_Angeles',
  'PDT': 'America/Los_Angeles',
  'CET': 'Europe/Paris',
  'CEST': 'Europe/Paris',
  'IST': 'Asia/Kolkata',
  'JST': 'Asia/Tokyo',
  'AEST': 'Australia/Sydney',
  'ACST': 'Australia/Adelaide',
  'AWST': 'Australia/Perth',
  'SGT': 'Asia/Singapore',
  'HKT': 'Asia/Hong_Kong'
};

// Colors used to differentiate timezone tags
const TAG_COLORS: string[] = [
  '#ff8a80', // red
  '#8c9eff', // indigo
  '#80d8ff', // light blue
  '#a7ffeb', // teal
  '#ccff90', // light green
  '#ffff8d', // yellow
  '#ffd180', // orange
  '#ff9e80'  // peach
];

const MAX_TIMEZONES = 4;

class App {
  private datetimeInput: HTMLInputElement;
  private timezoneInput: HTMLInputElement;
  private convertBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private themeToggleBtn: HTMLButtonElement;
  private resultsDiv: HTMLDivElement;
  private startOffsetInput: HTMLInputElement;
  private endOffsetInput: HTMLInputElement;
  private incrementInput: HTMLInputElement;
  private timezoneAutocomplete!: AutocompleteInput;
  private timezones: string[] = [];
  private currentFormat: FormatType = 'short';
  private lastParsedDate?: Date;
  // Browser/home timezone for parsing context
  private homeTimezone: string;

  /** Get browser timezone with fallback to UTC */
  private static getBrowserTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }
  private resetResultsContainer(): void {
    this.resultsDiv.innerHTML = `
      <div id="timeline" class="timeline"></div>
      <div id="table-container" class="results-table-container"></div>
      <div id="conversion-list" class="conversion-list"></div>
    `;
  }

  constructor() {
    this.datetimeInput = document.getElementById('datetime-input') as HTMLInputElement;
    this.timezoneInput = document.getElementById('timezone-input') as HTMLInputElement;
    this.convertBtn = document.getElementById('convert-btn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('reset-timezones-btn') as HTMLButtonElement;
    this.themeToggleBtn = document.getElementById('theme-toggle-btn') as HTMLButtonElement;
    this.resultsDiv = document.getElementById('results') as HTMLDivElement;
    this.startOffsetInput = document.getElementById('start-offset') as HTMLInputElement;
    this.endOffsetInput = document.getElementById('end-offset') as HTMLInputElement;
    this.incrementInput = document.getElementById('increment') as HTMLInputElement;
    // Determine the browser (home) timezone
    this.homeTimezone = App.getBrowserTimezone();

    this.setupTimezoneAutocomplete();
    this.loadTimezones();
    this.renderTimezoneList();
    this.bindEvents();
    this.attachCopyHandlers();
    this.loadThemeFromStorage();
    this.bindThemeToggle();
  }

  private setupTimezoneAutocomplete(): void {
    // Prepare autocomplete options: include common abbreviations first
    const allZones = DateTimeConverter.getAllTimezones();
    const abbrevs = Object.keys(TZ_ABBREVIATIONS);
    const options = Array.from(new Set([...abbrevs, ...allZones]));
    this.timezoneAutocomplete = new AutocompleteInput(this.timezoneInput, options);
    // When selecting via autocomplete, immediately add
    this.timezoneAutocomplete.onSelect(value => {
      this.timezoneInput.value = value;
      this.addTimezone();
    });
    // Update ARIA expanded state based on dropdown visibility
    this.timezoneAutocomplete.onToggle((isOpen) => {
      this.timezoneInput.setAttribute('aria-expanded', isOpen.toString());
    });
  }

  private bindEvents(): void {
    this.convertBtn.addEventListener('click', this.handleConvert.bind(this));
    this.datetimeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleConvert();
      }
    });
    // Enter on timezone input adds a timezone
    this.timezoneInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addTimezone();
      }
    });
    this.resetBtn.addEventListener('click', () => this.resetTimezones());
  }

  /** Load saved timezones or default */
  private loadTimezones(): void {
    const stored = localStorage.getItem('timezones');
    if (stored) {
      try { this.timezones = JSON.parse(stored); } catch { this.timezones = []; }
    }
    if (!this.timezones || this.timezones.length === 0) {
      this.timezones = [App.getBrowserTimezone()];
      localStorage.setItem('timezones', JSON.stringify(this.timezones));
    }
  }
  /** Update the display of selected timezones */
  private renderTimezoneList(): void {
    const list = document.getElementById('timezone-list') as HTMLDivElement;
    list.innerHTML = '';
    this.timezones.forEach((tz, idx) => {
      const tag = document.createElement('span');
      tag.className = 'tz-tag';
      tag.setAttribute('role', 'listitem');
      tag.setAttribute('tabindex', '0');
      tag.setAttribute('aria-label', `Remove timezone ${tz}`);
      // Color-code tags
      const color = TAG_COLORS[idx % TAG_COLORS.length];
      tag.style.backgroundColor = color;
      tag.style.color = '#000';
      tag.textContent = tz;
      tag.title = 'Click to remove timezone';
      tag.style.cursor = 'pointer';
      
      const removeTimezone = () => {
        this.timezones = this.timezones.filter(t => t !== tz);
        localStorage.setItem('timezones', JSON.stringify(this.timezones));
        this.renderTimezoneList();
      };
      
      tag.addEventListener('click', removeTimezone);
      tag.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          removeTimezone();
        }
      });
      
      list.appendChild(tag);
    });
  }

  /** Add a timezone from the input field */
  private addTimezone(): void {
    const inputVal = this.timezoneInput.value.trim();
    if (!inputVal) return;
    if (this.timezones.length >= MAX_TIMEZONES) {
      alert(`Maximum of ${MAX_TIMEZONES} timezones allowed.`);
      this.timezoneInput.value = '';
      return;
    }
    // Map abbreviation if present
    let tz = inputVal;
    const abbr = inputVal.toUpperCase();
    if (TZ_ABBREVIATIONS[abbr]) {
      tz = TZ_ABBREVIATIONS[abbr];
    }
    // Validate against official list or known abbreviations
    const all = DateTimeConverter.getAllTimezones();
    const validZones = new Set<string>([...all, ...Object.values(TZ_ABBREVIATIONS)]);
    if (!validZones.has(tz)) {
      // Find similar timezones for suggestions
      const suggestions = this.findSimilarTimezones(inputVal, all);
      const suggestionText = suggestions.length > 0 
        ? ` Did you mean: ${suggestions.slice(0, 3).join(', ')}?`
        : ' Try typing a few letters to see available options.';
      alert(`Invalid timezone: ${inputVal}.${suggestionText}`);
      return;
    }
    if (!this.timezones.includes(tz)) {
      this.timezones.push(tz);
      localStorage.setItem('timezones', JSON.stringify(this.timezones));
      this.renderTimezoneList();
    }
    this.timezoneInput.value = '';
  }

  /** Find similar timezone names for suggestions */
  private findSimilarTimezones(input: string, timezones: string[]): string[] {
    const query = input.toLowerCase();
    return timezones
      .filter(tz => tz.toLowerCase().includes(query))
      .sort((a, b) => {
        // Prefer exact matches or those starting with the query
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const aStarts = aLower.startsWith(query);
        const bStarts = bLower.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.length - b.length; // Prefer shorter matches
      })
      .slice(0, 5);
  }

  /** Reset stored timezones to default */
  private resetTimezones(): void {
    localStorage.removeItem('timezones');
    localStorage.removeItem('theme');
    this.timezones = [];
    this.loadTimezones();
    this.renderTimezoneList();
    document.body.classList.remove('dark');
    this.updateThemeIcon(false);
  }

  private handleConvert(): void {
    const datetimeText = this.datetimeInput.value.trim();
    if (!datetimeText) {
      this.showError('Please enter a date/time string');
      return;
    }
    if (this.timezones.length === 0) {
      this.showError('Please add at least one timezone');
      return;
    }
    // Parse once using first timezone (for parsedDate)
    const parseResult = DateTimeConverter.parseAndConvert(datetimeText, this.timezones[0]);
    if (parseResult.error || !parseResult.parsedDate) {
      this.showError(parseResult.error || 'Error parsing date');
      return;
    }
    this.lastParsedDate = parseResult.parsedDate;
    this.displayResult(parseResult);
  }

  private displayResult(result: any): void {
    if (result.error) {
      this.showError(result.error);
      return;
    }
    this.resetResultsContainer();
    this.resultsDiv.style.display = 'block';
    if (this.lastParsedDate) {
      this.renderTable(this.lastParsedDate);
    }
  }

  private showError(message: string): void {
    this.resetResultsContainer();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    
    const errorTitle = document.createElement('h3');
    errorTitle.textContent = 'Error:';
    
    const errorText = document.createElement('p');
    errorText.textContent = message; // Safe from XSS
    
    errorDiv.appendChild(errorTitle);
    errorDiv.appendChild(errorText);
    
    // Insert error at the beginning
    this.resultsDiv.insertBefore(errorDiv, this.resultsDiv.firstChild);
    this.resultsDiv.style.display = 'block';
  }

  /** Generate a simple calendar view for the given date and timezone */

  /** Render conversion results for all selected timezones */
  private renderConversions(parsedDate: Date): void {
    const list = document.getElementById('conversion-list') as HTMLDivElement;
    list.innerHTML = '';
    this.timezones.forEach(tz => {
      const item = document.createElement('div');
      item.className = 'result-item';
      const h3 = document.createElement('h3');
      let labelText = tz;
      if (tz === this.homeTimezone) {
        labelText += ' (home)';
      }
      h3.textContent = labelText;
      item.appendChild(h3);
      const offsets = [
        { label: '-1h', hours: -1 },
        { label: '+2h', hours: 2 }
      ];
      offsets.forEach(offsetObj => {
        const offsetDate = new Date(parsedDate.getTime() + (offsetObj.hours * 60 * 60 * 1000));
        const formatted = DateTimeConverter.formatDate(offsetDate, tz, this.currentFormat);
        const p = document.createElement('p');
        p.textContent = `${offsetObj.label}: ${formatted}`;
        const pid = `conv-${tz.replace(/[^a-zA-Z0-9]/g, '_')}-${offsetObj.label.replace(/[^a-zA-Z0-9]/g, '')}`;
        p.id = pid;
        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.setAttribute('data-target-id', pid);
        btn.textContent = 'Copy';
        const wrapper = document.createElement('div');
        wrapper.className = 'result-value';
        wrapper.appendChild(p);
        wrapper.appendChild(btn);
        item.appendChild(wrapper);
      });
      list.appendChild(item);
    });
  }
  /** Render a 24-hour timeline highlighting each timezone's converted hour */
  private renderTimeline(date: Date): void {
    const timelineEl = document.getElementById('timeline') as HTMLDivElement;
    timelineEl.innerHTML = '';
    this.timezones.forEach((tz, idx) => {
      // Determine hour in target timezone (0-23)
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).formatToParts(date);
      let hour = 0;
      for (const p of parts) {
        if (p.type === 'hour') { hour = parseInt(p.value, 10); break; }
      }
      // Determine day difference relative to original date
      const dayParts = new Intl.DateTimeFormat('en-US', { timeZone: tz, day: 'numeric' }).formatToParts(date);
      let tzDay = date.getDate();
      for (const p of dayParts) {
        if (p.type === 'day') { tzDay = parseInt(p.value, 10); break; }
      }
      const localDay = date.getDate();
      const dayDiff = tzDay - localDay;
      // Determine row color based on timezone index
      const color = TAG_COLORS[idx % TAG_COLORS.length];
      // Build row
      const row = document.createElement('div'); row.className = 'timeline-row';
      const label = document.createElement('div'); label.className = 'tz-label';
      // Annotate browser timezone with '(home)'
      let labelText = tz;
      if (tz === this.homeTimezone) {
        labelText += ' (home)';
      }
      if (dayDiff === -1) {
        labelText += ' (prev day)';
      } else if (dayDiff === 1) {
        labelText += ' (next day)';
      }
      label.textContent = labelText;
      // (Optional) color label background to match tag color
      label.style.backgroundColor = color;
      label.style.color = '#000';
      const hoursWrap = document.createElement('div'); hoursWrap.className = 'timeline-hours';
      for (let i = 0; i < 24; i++) {
        const blk = document.createElement('div');
        blk.className = 'hour-block';
        blk.setAttribute('data-hour', i.toString());
        if (i === hour) {
          blk.classList.add('highlight');
          // color the highlighted hour block
          blk.style.backgroundColor = color;
        }
        hoursWrap.appendChild(blk);
      }
      row.appendChild(label);
      row.appendChild(hoursWrap);
      timelineEl.appendChild(row);
    });
  }
  /** Copy text to clipboard with fallback */
  private async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for non-HTTPS contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand('copy');
        document.body.removeChild(textArea);
        return result;
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /** Attach global listener for copy buttons and table cells */
  private attachCopyHandlers(): void {
    document.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      
      // Handle copy buttons
      if (target && target.classList.contains('copy-btn')) {
        const id = target.getAttribute('data-target-id');
        if (id) {
          const el = document.getElementById(id);
          if (el) {
            this.copyToClipboard(el.textContent || '').then(success => {
              const orig = target.textContent;
              target.textContent = success ? 'Copied!' : 'Failed';
              setTimeout(() => { target.textContent = orig || 'Copy'; }, 2000);
            });
          }
        }
      }
      
      // Handle table cell clicks (excluding headers and first column)
      if (target && target.tagName === 'TD' && 
          target.closest('.offset-table') && 
          !target.classList.contains('first-column')) {
        const text = target.textContent || '';
        if (text.trim()) {
          this.copyToClipboard(text).then(success => {
            if (success) {
              // Visual feedback for successful copy
              const originalBg = target.style.backgroundColor;
              target.style.backgroundColor = '#4CAF50';
              target.style.transition = 'background-color 0.2s';
              setTimeout(() => {
                target.style.backgroundColor = originalBg;
                setTimeout(() => {
                  target.style.transition = '';
                }, 200);
              }, 300);
            }
          });
        }
      }
    });
  }

  /** Update the theme toggle icon based on dark mode state */
  private updateThemeIcon(isDark: boolean): void {
    this.themeToggleBtn.textContent = isDark ? '\uD83C\uDF19' : '\u2600\uFE0F';
  }

  /** Load theme preference from localStorage */
  private loadThemeFromStorage(): void {
    const stored = localStorage.getItem('theme');
    const dark = stored === 'dark';
    document.body.classList.toggle('dark', dark);
    this.updateThemeIcon(dark);
  }

  /** Toggle dark/light theme */
  private bindThemeToggle(): void {
    this.themeToggleBtn.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      this.updateThemeIcon(isDark);
    });
  }
  
  /** Render a table of times in 15-minute increments from -1h to +2h */
  private renderTable(parsedDate: Date): void {
    const container = document.getElementById('table-container') as HTMLDivElement;
    if (!container) return;
    container.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'offset-table';
    // Header - timezones across the top
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    const th0 = document.createElement('th');
    th0.textContent = 'Time Offset';
    headerRow.appendChild(th0);
    this.timezones.forEach(tz => {
      const th = document.createElement('th');
      let labelText = tz;
      if (tz === this.homeTimezone) labelText += ' (home)';
      th.textContent = labelText;
      headerRow.appendChild(th);
    });
    // Body - time offsets as rows
    const tbody = table.createTBody();
    const startHours = parseFloat(this.startOffsetInput.value);
    const endHours = parseFloat(this.endOffsetInput.value);
    const incrementMin = parseInt(this.incrementInput.value);
    
    const offsets: number[] = [];
    const startMin = startHours * 60;
    const endMin = endHours * 60;
    for (let m = startMin; m <= endMin; m += incrementMin) {
      offsets.push(m);
    }
    offsets.forEach(offsetMin => {
      const row = tbody.insertRow();
      // First cell: time offset label
      const offsetCell = row.insertCell();
      offsetCell.className = 'first-column';
      const sign = offsetMin >= 0 ? '+' : '-';
      const absMin = Math.abs(offsetMin);
      const h = Math.floor(absMin / 60);
      const mm = absMin % 60;
      offsetCell.textContent = `${sign}${h}:${mm.toString().padStart(2, '0')}`;
      // Data cells: actual times for each timezone
      this.timezones.forEach(tz => {
        const cell = row.insertCell();
        const offsetDate = new Date(parsedDate.getTime() + (offsetMin * 60 * 1000));
        const formatted = DateTimeConverter.formatDate(offsetDate, tz, this.currentFormat);
        cell.textContent = formatted;
      });
    });
    container.appendChild(table);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
