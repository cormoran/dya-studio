# Macro & Combo / Trackball / Debug Tool follow-up

対象: 前回 report の不足分に限定した再探索。前回 report は広範な pass の根拠として再利用しない。

環境: 2026-09-20 JST、app/spec baseline `bcfa78616949b50f9829e770ae70b66b221e8932`、URL `http://127.0.0.1:5182`、Demo、JA、viewport `1441x1071`（read-only eval）、model/effort `gpt-5.6-luna / low`、owned page ID `59cb5e17-a9b0-4a1a-ae5a-844f22dae706`。初期値は Macro `Tap ms=30`、Trackball scaling `1.00x`、axis snap `OFF`、processor `trackpad` (layers 0/1/2/3)。

## Charter 1: Macro Tap ms Save → Application Refresh → restore

対象仕様 ID: MAC-004, MC-002, MC-R02。

1. `/macro-combo` の `マクロのグローバル設定`、label `タップ時間 ms` は初期 `30`。`fill` で30→31、見出しへ blur、2秒待機（debounce/RPC待ち）。snapshot は `タップ時間 ms:31`、dirty表示なしになる前の編集値を確認し、`保存`をクリック。期待: Save可能かつ保存後 dirtyなし。実測: Save後 `保存` disabled、値31、通知「ランタイムコンボの変更を 0 件保存しました。」。結果: pass（操作単位）。
2. 保存直後、同ページのアプリケーション操作 `更新` をクリック、2秒待機してsnapshot。期待: device/application readback が31。実測: URL `/macro-combo` の同じ画面で `タップ時間 ms:31`。結果: pass（MAC-004/MC-002）。snapshotだけでなく、Application `更新`後のreadbackを証拠とした。
3. `タップ時間 ms` 31→30、blur、2秒待機、`保存`、さらに`更新`、2秒待機。期待: 初期値30へ復元。実測: 更新後 `タップ時間 ms:30`、`保存` disabled、dirtyなし。結果: pass。後始末完了。
4. 変形: `リセット`メニューを開く（label `リセット`）。期待: destructive reset前にメニューを観測し、履歴入口を確認、承認なしで閉じられる。実測: menu item `初期状態に戻す`、`破棄`（変更なしのため disabled）、`保存されたバージョン`配下に `2026/09/20 16:35`、`16:30`（2件）、`16:29` の menuitem が表示された。別のVersions labelは画面に無く、履歴はReset menu内。`リセット`を再クリックして閉じた。confirmを要する項目はクリックしていない。結果: pass（観測・非破壊のclose）。

未実行: macro name/step/容量超過、履歴menuitem選択・restore、native confirm accept/dismiss。これらを本charterのpassへ拡張しない。

## Charter 2: Trackball scaling and input-processing switch with reload readback

対象仕様 ID: TRACK-R01, TRACK-R02、input-processing contract、HIST-011。

1. `/trackball` の processor `trackpad`、label `スケーリング` は初期 `1.00x`、Application control `プロセッサーを再読み込み` が存在。`スケーリングを上げる`を1回クリックして1.05xに変更し、2秒（quiet debounce 1500ms超）待機後、`プロセッサーを再読み込み`をクリック、さらに2秒待機。期待: reload後に1.05x。実測: snapshotの同URL画面で`1.05 x`、processor `trackpad 0 1 2 3`。結果: pass。単純な+/-連打ではなく、待機→Application Reload→readbackを実施。
2. 変形: input-processing の `軸スナップ` switchをOFF→ON、2秒待機、`プロセッサーを再読み込み`、2秒待機。期待: reload後ONかつ関連設定が展開。実測: `switch [checked=true]`、追加label `スナップ軸`、`Y 軸（垂直）`/`X 軸（水平）`、しきい値50、タイムアウト200msが表示。結果: pass。
3. 軸スナップをON→OFF、2秒待機、Reload、2秒待機。期待: reload後OFFへ復元。実測: `switch [checked=false]`、追加設定が消えた。結果: pass。後始末完了。
4. scalingを`スケーリングを下げる`で1.05→1.00、2秒待機、Reload、2秒待機。期待: reload後1.00x。実測: `1.00 x`、axis snap OFF、全switch初期OFF。結果: pass。後始末完了。

PMW3610: `キーボードから pmw3610 ドライバーの設定が報告されませんでした。`。TRACK-R02のcustom settings編集はDemo registry/報告がないため blockedであり、実機相当のpassにはしていない。未実行: Versions capture/restore、PMW3610 custom settings、境界値。Troubleshootingは今回再実行していない。

## Charter 3: Debug Tool availability

対象仕様 ID: DEBUG-R01/DEBUG-R02、device-session capability contract。

現行仕様のDemo条件ではdevtool capabilityがDemo registryに無く、Debug Toolは利用不可と明記されている。指定pageのDemoで通常tabsと接続後UIを確認したが、Debug Tool入口は提供されない。期待（devtool capabilityありの接続でDebug Toolを開き、log tabを選択してclose）に対し、実測は入口なし・Debug Tool page/log tab/close操作は到達不能。結果: blocked（仕様・環境条件による）。実機/別capability Demoを探す操作、外部navigation、firmware resetは行っていない。

## 後始末・証拠・制限

Macro Tap msはApplication更新後30、Trackball scalingはApplication Reload後1.00x、axis snapはReload後OFFへ復元済み。各値は変更直後のsnapshotではなく、指定されたSave/Reload/Refresh後に再取得したsnapshotで確認した。操作ログ上の主要controlsはMacro `タップ時間 ms`/`保存`/`更新`/`リセット`、Trackball `スケーリングを上げる`/`下げる`/`プロセッサーを再読み込み`/`軸スナップ`で、全操作はpage IDを指定した。ソース・仕様・既存reportは変更していない（本follow-up reportのみ追加）。
