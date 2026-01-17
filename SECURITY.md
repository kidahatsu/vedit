# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2   | :x:                |

## Architecture Security

VEdit is a **client-side only** application:

- ✅ **No server uploads** — All video processing happens in-browser via WebAssembly
- ✅ **No analytics** — No tracking, telemetry, or data collection
- ✅ **No cookies** — Stateless operation
- ✅ **No external API calls** — Works entirely offline after initial load
- ✅ **Local storage only** — Project data stored in IndexedDB on user's device

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public issue**
2. Email details to: [security contact TBD]
3. Or use [GitHub's private vulnerability reporting](https://github.com/kidahatsu/vedit/security/advisories/new)

### What to include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response timeline:
- **Acknowledgment:** Within 48 hours
- **Initial assessment:** Within 7 days
- **Resolution:** Depends on severity, typically within 30 days

## Scope

The following are **in scope** for security reports:

- Cross-site scripting (XSS) via malformed video files
- Memory safety issues in FFmpeg WASM processing
- IndexedDB data exposure to other origins
- Service worker cache poisoning

The following are **out of scope**:

- Browser vulnerabilities (report to browser vendor)
- FFmpeg WASM core vulnerabilities (report to [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm))
- Issues requiring physical device access

## Security Best Practices

When using VEdit:

1. Only load video files from trusted sources
2. Use a modern, updated browser (Chrome 94+, Safari 16.4+, Firefox)
3. Clear browser storage if processing sensitive content
