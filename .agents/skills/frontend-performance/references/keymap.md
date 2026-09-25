# Keymap investigation map

Read current sources; these are investigation entrypoints, not a permanent bottleneck list.

- `src/App.tsx` and `components/DeviceConnection.tsx`: connect gate, tab retention and eager imports. Separate fresh navigation, explicit connect, auto reconnect and return to visited tab.
- `src/hooks/useKeymapSource.ts` → `lib/fastKeymap/fastKeymap.ts`: official versus fast paths, device-keyed caches, first-layer preview, deferred behaviors and remaining layers. First preview is not fully loaded/edit-ready. Trace the negotiated path rather than guessing it from the Demo label.
- `src/hooks/useKeymap.ts`: `loadKeymapData`, `setBinding`, `saveChanges`, original/default maps and state updates. Save awaits RPC then updates original bindings; key editing already writes RAM. Reload is not Discard.
- `src/pages/KeymapPage.tsx`: `handleBindingSelect`, selection revision and in-flight guards, macro deferral until `isFullyLoaded`, `handleSave`/`handleReload`.
- `components/KeyboardLayout.tsx`, `PhysicalKey.tsx`: geometry, key labels/tooltips, selection/highlight updates. Verify whether unchanged keys really perform expensive work before changing props/memoization.
- `components/KeycodeSelector.tsx`, `KeycodeValueSelector.tsx`, `BehaviorDropdown.tsx`: first-open cost, search/filter and keyboard/category result rendering; test modal and floating where relevant.
- `hooks/versionHistory/useKeymapVersionHistory.ts`, `useTabVersionHistory.ts`: complete-load capture, snapshot/serialization/IndexedDB, tab retention. Keep capture correctness when deferring work.
- `vite.config.ts` client alias: RPC uses a module-level mutex. Do not recommend Promise.all or dependency dedup removal without tracing serialization and stream correctness.
- `src/lib/rpcLogging.ts` / `viteEnv.ts`: `logRpc` measures around `invoke()`, so its duration can include mutex queueing and logging overhead; it does not expose a separate wire-only timestamp. Request byte sizing/logging also runs after its start timestamp. Check `VITE_ENABLE_RPC_LOG`: PR/dev builds enable diagnostic logs while normal production release disables them. Use logging to attribute call count/order, label the instrumented build, and recheck user latency with logs off; do not compare a logged PR preview directly against an unlogged release.

Baseline journey: connect Demo → Keymap → record layer/position/binding → open selector → choose a different binding → observe target and dirty state → Save → Saved/disabled → application Reload → verify value → restore original binding → Save → Reload. Track first preview, full readiness, editor opening, search, edit acknowledgement and Save separately. Repeat editor open/close and edit/save cycles for latency/resource evidence. Preserve language, selector mode, auto advance, close-on-select, OS layout and any changed settings. Modal Close/Escape may apply changes; floating Close/Escape discards unfinished draft. Follow KM-002/006/007/009, KM-I01/I02, BIND-003/004/005/015 and SESSION-002/003/007.

Demo is useful for frontend rendering and synthetic protocol behavior. It does not validate real USB/BLE latency, flash duration or power-cycle persistence. If those are necessary, use an authorized device or the repository Renode skill; report Renode transport/ELF limits explicitly. Do not report real-device improvement from Demo speed.
