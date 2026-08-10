# Developer guide screenshots — light mode

These are the screenshot specifications for the keyboard-developer guide. Do not use the existing dark-mode DYA Dash Demo screenshots in `docs/images/` for this guide. Generated files are written to `public/images/developer-guide/light-mode/`, which Vite publishes for the static guide.

Capture every image in **light mode**, with the relevant screen and a realistic enabled module state visible.

| File                  | Screen                                          |
| --------------------- | ----------------------------------------------- |
| `keymap.png`          | Keymap with the target physical layout selected |
| `macro.png`           | Runtime Macro editor                            |
| `combo.png`           | Runtime Combo editor                            |
| `trackball.png`       | PMW3610 and runtime input processor controls    |
| `connection.png`      | BLE management, default layer, and OS detection |
| `settings.png`        | Sleep and physical layout settings              |
| `troubleshooting.png` | Device information and diagnostics              |

## Generate the assets

The repeatable capture job uses DYA Studio's built-in Demo keyboard. It needs no
physical keyboard or Renode firmware, while still displaying the Custom Studio
RPC feature states the guide describes.

```bash
cd e2e/renode
npm install
npx playwright install chromium
npm run screenshots:developer-guide
```

The job builds the app, opens each tab at a 1440 × 1200 viewport, fixes the UI
to English and light mode, and writes the seven PNGs in this directory. It
refuses to overwrite an existing asset. To deliberately recapture an approved
image, move it elsewhere first, run the job, review the new PNG, then replace
the approved file in a separate intentional change.

Avoid highlighting development-only controls unless the corresponding guide
section is specifically about diagnostics.
