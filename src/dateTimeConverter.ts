// Sugar.js is loaded via CDN
declare const Sugar: any;

export interface ConversionResult {
  parsedDate: Date | null;
  convertedDate: string;
  timezone: string;
  error?: string;
}

export type FormatType = 'long' | 'short' | 'iso';

export class DateTimeConverter {
  /** Format a Date object into a string in the given timezone, by style */
  public static formatDate(date: Date, timezone: string, format: FormatType = 'long'): string {
    try {
      switch (format) {
        case 'short':
          return new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }).format(date);
        case 'iso': {
          // Build ISO 8601 string (with timezone offset) for the given timezone
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            timeZoneName: 'shortOffset',
            // Ensure 24-hour clock so hour values match ISO expectations
            hour12: false
          });
          const parts = formatter.formatToParts(date);
          let year = '0000', month = '01', day = '01';
          let hour = '00', minute = '00', second = '00';
          let tzRaw = '';
          for (const p of parts) {
            switch (p.type) {
              case 'year': year = p.value; break;
              case 'month': month = p.value; break;
              case 'day': day = p.value; break;
              case 'hour': hour = p.value; break;
              case 'minute': minute = p.value; break;
              case 'second': second = p.value; break;
              case 'timeZoneName': {
                const m = p.value.match(/([+-].*)/);
                tzRaw = m ? m[1] : '';
                break;
              }
            }
          }
          // Build ISO offset
          let isoOffset = 'Z';
          if (tzRaw) {
            const m2 = tzRaw.match(/^([+-])(\d{1,2})(?::?(\d{2}))?$/);
            if (m2) {
              const sign = m2[1];
              const hh = m2[2].padStart(2, '0');
              const mm = (m2[3] || '00').padStart(2, '0');
              isoOffset = `${sign}${hh}:${mm}`;
            } else {
              isoOffset = tzRaw;
            }
          }
          return `${year}-${month}-${day}T${hour}:${minute}:${second}${isoOffset}`;
        }
        case 'long':
        default:
          return new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
          }).format(date);
      }
    } catch (error) {
      return `Error formatting date: ${error}`;
    }
  }

  static parseAndConvert(input: string, targetTimezone: string): ConversionResult {
    try {
      let parsedDate: Date | null = null;
      const trimmed = input.trim();
      // Check for numeric Unix epoch (seconds or milliseconds)
      if (/^\d{9,}$/.test(trimmed)) {
        const num = parseInt(trimmed, 10);
        // If 10 digits or less assume seconds, otherwise milliseconds
        parsedDate = trimmed.length <= 10 ? new Date(num * 1000) : new Date(num);
      } else {
        // Use Sugar.js to parse natural language dates
        parsedDate = Sugar.Date.create(trimmed);
      }
      
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        return {
          parsedDate: null,
          convertedDate: '',
          timezone: targetTimezone,
          error: 'Could not parse the date/time string. Try: "tomorrow at 3pm", "next Friday", "today at 2:30pm", or standard date formats.'
        };
      }

      const convertedDate = this.formatDate(parsedDate, targetTimezone);

      return {
        parsedDate,
        convertedDate,
        timezone: targetTimezone
      };
    } catch (error) {
      return {
        parsedDate: null,
        convertedDate: '',
        timezone: targetTimezone,
        error: `Error processing date: ${error}`
      };
    }
  }

  /** Get numeric offset from UTC in minutes for the given date and timezone */
  static getTimezoneOffset(date: Date, timezone: string): number {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const parts = fmt.formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    if (!tzPart) return 0;
    const m = tzPart.value.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
    if (!m) return 0;
    const sign = m[1] === '+' ? 1 : -1;
    const hours = parseInt(m[2], 10);
    const mins = m[3] ? parseInt(m[3], 10) : 0;
    return sign * (hours * 60 + mins);
  }

  /** Return a formatted UTC offset string like "UTC+02:00" */
  static getOffsetString(date: Date, timezone: string): string {
    const offset = DateTimeConverter.getTimezoneOffset(date, timezone);
    const sign = offset >= 0 ? '+' : '-';
    const abs = Math.abs(offset);
    const hh = Math.floor(abs / 60).toString().padStart(2, '0');
    const mm = (abs % 60).toString().padStart(2, '0');
    return `UTC${sign}${hh}:${mm}`;
  }

  static getAllTimezones(): string[] {
    // Fallback list for older browsers that don't support Intl.supportedValuesOf
    const commonTimezones = [
      'UTC',
      'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Denver',
      'America/Toronto', 'America/Vancouver', 'America/Sao_Paulo', 'America/Argentina/Buenos_Aires',
      'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome', 'Europe/Madrid',
      'Europe/Amsterdam', 'Europe/Stockholm', 'Europe/Warsaw', 'Europe/Istanbul',
      'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Seoul', 'Asia/Hong_Kong', 'Asia/Singapore',
      'Asia/Mumbai', 'Asia/Dubai', 'Asia/Bangkok', 'Asia/Jakarta',
      'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth',
      'Pacific/Auckland', 'Pacific/Honolulu'
    ];

    try {
      // Use modern API if available
      if ('supportedValuesOf' in Intl) {
        return (Intl as any).supportedValuesOf('timeZone').sort();
      }
      return commonTimezones.sort();
    } catch {
      return commonTimezones.sort();
    }
  }
}
