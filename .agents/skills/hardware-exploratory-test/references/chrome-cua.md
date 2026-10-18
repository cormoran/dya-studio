# Physical Chrome through CUA

Read only when actual Chrome and `mcp__cua_repl` are available. Load current tool documentation and use supported APIs. This is one proven chooser path, not a browser-install requirement.

Create a named tab; record exact ID, URL and display state. Freshly observe native Chrome and select only that tab before native input: the DOM-controlled tab may be in the background. A new app document may auto-connect a granted serial port through `DeviceConnectionProvider`; wait for it. Use an already connected DYA2 session and do not open duplicate tabs as a reset. Distinguish pending, connected and error states.

If disconnected after auto-connect settles, use native clicks on USB and Agree, inspect the native chooser, and select the verified DYA2 row. A pilot's DOM clicks dismissed the notice without opening the chooser. After handshake, use the bound tab's DOM/locator APIs for ordinary UI controls/readback; use native input for browser-owned chooser/download surfaces. Record actual permission failures without bypassing them.

Screenshot APIs return bytes, whose actual signature determines the extension. One run returned JPEG despite a PNG assumption. Retain originals and record any conversion; never relabel bytes or alter the scene. With already-bound app/tab and an owned evidence directory, persist screenshots and DOM evidence through the CUA Node REPL:

```js
var fs = await import("node:fs/promises");
var dir = "/private/tmp/your-owned-run";
await fs.mkdir(dir, { recursive: true });
var save = async (stem, bytes) => {
  var png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e;
  var jpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!png && !jpg) throw new Error("Inspect capture encoding");
  var path = `${dir}/${stem}.${png ? "png" : "jpg"}`;
  await fs.writeFile(path, bytes);
  return path;
};
await save("native", await ownedChromeApp.getScreenshot({ emit: false }));
await save("page", await ownedTab.screenshot({ fullPage: false }));
await fs.writeFile(`${dir}/page.txt`, await ownedTab.playwright.domSnapshot());
```

Check current method names and replace example bindings. Verify nonempty files before linking; report a real persistence error precisely. An emitted image alone is not a saved artifact, and missing old bytes cannot be reconstructed.

For style/value readback, use supported read-only evaluation on visible nodes (`getClientRects()` and computed visibility); hidden visited panels do not count. Pair screenshots with route, theme, selected state and rendered values. After macro rename, reacquire the textbox because its accessible name may change.

Inspect ambiguous Reset/restore controls before acting. In Settings, `ResetVersionMenu` opens a menu of saved timestamps plus a separate destructive reset item. For history-only work select a timestamp, inspect diff, then Cancel; do not Apply or select reset. Preserve permission errors without raw-event bypasses. Finish observations and restoration before closing the owned tab; verify closure with fresh tab inventory and never close unrelated tabs or restart the browser to free a port.
