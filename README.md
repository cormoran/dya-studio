# DYA Studio

<p align="center">
  <img src="src/assets/dya.svg" alt="DYA Logo" width="80" height="80" />
</p>

<p align="center">
  <strong>A modern web-based configuration tool for the DYA keyboard</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#development">Development</a> •
  <a href="#architecture">Architecture</a>
</p>

---

## About

DYA Studio is a web application for configuring the **DYA keyboard** — a self-built, split, trackball-embedded, AAA-battery powered mechanical keyboard running [ZMK firmware](https://zmk.dev/).

Built as an alternative to [ZMK Studio](https://zmk.studio/), DYA Studio provides a tailored experience specifically designed for the DYA keyboard's unique features.

## Features

- 🔋 **Battery Monitoring** — View battery levels and history for both keyboard halves
- 📶 **BLE Management** — Manage Bluetooth connection profiles
- 🩺 **Health Check** — Run diagnostics on all hardware components
- ⌨️ **Keymap Editor** — Configure key bindings and layers
- 🎯 **Trackball Settings** — Adjust CPI, scroll speed, and axis behavior
- ⚙️ **Device Settings** — Configure power management, display, and timing parameters
- 🌙 **Dark/Light Mode** — Full theme support with system preference detection

## Screenshots

_Coming soon_

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) (recommended) or npm
- A Chromium-based browser (Chrome, Edge) for Web Serial API support

### Installation

```bash
# Clone the repository
git clone https://github.com/cormoran/dya-studio.git
cd dya-studio

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Connecting Your Keyboard

1. Connect your DYA keyboard via USB
2. Click the **"Connect Keyboard"** button in the header
3. Select your keyboard from the browser's serial port picker
4. Start configuring!

> **Note**: Web Serial API requires a secure context (HTTPS or localhost) and is only supported in Chromium-based browsers.

## Development

### Tech Stack

| Category      | Technology            |
| ------------- | --------------------- |
| Framework     | React 19 + TypeScript |
| Build Tool    | Vite (rolldown-vite)  |
| Styling       | Tailwind CSS v4       |
| UI Components | Radix UI              |
| Animations    | Framer Motion         |
| Icons         | Tabler Icons          |

### Available Scripts

```bash
pnpm dev            # Start development server with HMR
pnpm build          # Build for production
pnpm preview        # Preview production build
pnpm lint           # Run ESLint
pnpm test           # Run tests with Jest
pnpm test:watch     # Run tests in watch mode
pnpm test:coverage  # Generate test coverage report
```

### Project Structure

```
src/
├── assets/           # Static assets (SVG, images)
├── components/       # Reusable UI components
├── contexts/         # React contexts (Theme, etc.)
├── hooks/            # Custom React hooks
├── layouts/          # Page layouts
├── pages/            # Feature pages
├── App.tsx           # Main app component
├── index.css         # Global styles + Tailwind
└── main.tsx          # Entry point
```

### Development Guide

For detailed implementation guidelines, design philosophy, and component patterns, see the [Development Guide](docs/DEVELOPMENT_GUIDE.md).

### Testing

DYA Studio uses **Jest** and **React Testing Library** for testing. All components and features should have corresponding tests.

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

For detailed testing guidelines and best practices, see the [Testing Guide](docs/TESTING_GUIDE.md).

## Acknowledgments

- [ZMK Firmware](https://zmk.dev/) — The keyboard firmware
- [ZMK Studio](https://zmk.studio/) — Inspiration for this project
- [Radix UI](https://www.radix-ui.com/) — Accessible UI primitives
- [Tabler Icons](https://tabler.io/icons) — Beautiful open-source icons
