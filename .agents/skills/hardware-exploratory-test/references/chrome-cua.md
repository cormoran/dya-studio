# Physical Chrome through CUA

Read only when `mcp__cua_repl` and actual Chrome are available. Load the tool's
current documentation first; use its supported APIs and browser-selection rules.
This is an adapter for a proven physical chooser path, not a requirement to
install a browser/extension or replace an otherwise working tool.

## One owned session and a real user gesture

Create a named test tab and record its exact ID, URL and initial display state.
Before a native action, freshly observe the native Chrome window and select only
that owned tab. A DOM-controlled tab can be in the background while the native
window shows unrelated user content; never assume the visible tab is yours.

A new app document may automatically connect to a previously granted serial
port: `DeviceConnectionProvider` checks paired ports even without a stored method.
Wait for that attempt to settle. If DYA2 is already connected, use that session;
do not click USB again. Do not open duplicate app tabs as a reset. Observe
pending, connected and error states separately and keep the planned connection
budget. The source behaviour does not prove the cause of any particular error.

If still disconnected with no pending auto attempt, use native CUA clicks on
USB and the normal Agree button, inspect the native chooser, then select only
the verified DYA2 row. A pilot's DOM clicks closed the notice without reaching
the chooser; native input did. After the actual handshake, prefer the bound
Chrome tab's DOM/locator APIs for ordinary controls and scoped readback. Native
window automation is still useful for browser-owned chooser/download surfaces.

## Persist evidence instead of only displaying it

The documented screenshot APIs return PNG bytes (`Uint8Array`). They do not
require a guessed `saveScreenshot` method or an unsupported `path` option.
In the CUA Node REPL, local filesystem persistence of those returned bytes was
used successfully in the hardware pilot:

```js
var evidenceFs = await import("node:fs/promises");
var evidenceRoot = "/private/tmp/your-owned-run";
await evidenceFs.mkdir(evidenceRoot, { recursive: true });
var nativePng = await ownedChromeApp.getScreenshot({ emit: false });
await evidenceFs.writeFile(evidenceRoot + "/native.png", nativePng);
var pagePng = await ownedTab.screenshot({ fullPage: false });
await evidenceFs.writeFile(evidenceRoot + "/page.png", pagePng);
await evidenceFs.writeFile(
  evidenceRoot + "/page.txt",
  await ownedTab.playwright.domSnapshot(),
);
```

Use your actual already-bound app/tab and owned directory; do not paste unknown
binding names. Confirm current runtime methods before using the example. Local
file writes persist tool-returned evidence, not another input mechanism. If an
actual permission/capability error prevents persistence, report it precisely.
Do not label saving unavailable merely because a screenshot was only emitted.
Verify nonempty files before linking them. If bytes were never retained, an old
image cannot be reconstructed or replaced with another run's screenshot.

For style/value observations use the tab's read-only `playwright.evaluate` or a
freshly observed locator's `evaluate`. Filter to visible nodes, for example
nonempty `getClientRects()` and non-hidden computed visibility. The app retains
hidden visited tab panels; their headings and styles are not visual evidence.
Pair each stable screenshot with the selected theme, route, visible state and
rendered values; font-family or theme class alone does not prove final rendering.
After a macro rename, reacquire the textbox: its accessible name may be the
current macro name rather than the visible Name label.

Complete live observations and cleanup before closing the tab or settling the
worker. Preserve exact error details before closing a failed connection page.
Verify owned-tab closure through a fresh inventory; do not close unrelated tabs
or restart the whole browser to release a port.
