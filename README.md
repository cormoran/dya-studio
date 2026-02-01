# DYA Studio

<p align="center">
  <img src="src/assets/dya.svg" alt="DYA Logo" width="80" height="80" />
</p>

A modern web-based configuration tool for the **DYA keyboard** — a split, trackball-embedded mechanical keyboard running [ZMK firmware](https://zmk.dev/).

## Demo Mode

**Try DYA Studio without a keyboard!** Click "Try Demo Mode" on the splash screen to explore the keymap editor with sample data. Perfect for:
- Trying the interface before purchasing a DYA keyboard
- Learning how the keymap editor works
- Testing configuration changes safely

Demo mode currently supports the Keymap page with simulated data and operations.

## Features

- 🎮 **Demo Mode** — Try the keymap editor without a keyboard
- 🔋 Battery monitoring for both keyboard halves
- 📶 Bluetooth profile management
- 🩺 Hardware diagnostics
- ⌨️ Keymap editor
- 🎯 Trackball settings (CPI, scroll speed)
- ⚙️ Device settings (power, display, timing)
- 🌙 Dark/Light mode

## Quick Start

```bash
git clone https://github.com/cormoran/dya-studio.git
cd dya-studio
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and connect your keyboard via USB.

> **Requirements**: Node.js 18+, Chromium-based browser (Chrome, Edge)

## Development

**Stack**: React 19, TypeScript, Vite, Tailwind CSS v4, Radix UI

**Commands**:

```bash
npm run dev            # Start dev server
npm run build          # Production build
npm run lint           # Lint code
npm test               # Run tests
npm run test:coverage  # Test coverage
```

**For Coding Agents**: See [Development Guide](docs/DEVELOPMENT_GUIDE.md) for design system, component patterns, and implementation guidelines.

**For Testing**: See [Testing Guide](docs/TESTING_GUIDE.md) for testing patterns and examples.

## Project Structure

```
src/
├── components/       # UI components
├── pages/            # Feature pages
├── hooks/            # React hooks
├── contexts/         # React contexts
└── layouts/          # Page layouts
```

## Acknowledgments

[ZMK Firmware](https://zmk.dev/) • [ZMK Studio](https://zmk.studio/) • [Radix UI](https://www.radix-ui.com/) • [Tabler Icons](https://tabler.io/icons)
