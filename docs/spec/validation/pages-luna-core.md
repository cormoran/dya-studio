# Luna core ページ探索記録

対象: Home、Connection、Settings、Subsystems（Demoのみ、外部リンクは開いていない）
環境: 2026-09-20、app commit `bcfa78616949b50f9829e770ae70b66b221e8932`、URL `http://127.0.0.1:5181`、browserPageId `eb33a933-9f7e-4854-b5cf-3d41969afff3`、初期言語 日本語、表示後に英語へ切替して日本語へ復元、model/effort: gpt-5.6-luna / low、Demo、viewport値は未取得。
初期設定: Demo接続、Home表示、ConnectionのMacBook Pro active、MacBook Pro default layer=`Follow OS detection`、Idle=`5 minutes`、Sleep=`15 minutes`、Subsystem Settings=`checked`、Fast Keymap=`unchecked`。

## Home

対象仕様: HOME-R01、HOME-001–004（`pages/home.md`）、app-shellの言語契約。

- Charter（内容と外部リンクを開かずに確認）: `Welcome to DYA Studio`、Features、DYA Dash/DYA2、Q&Aと複数リンクが表示された。リンクはクリックせず、外部遷移は未実行。結果: pass（表示範囲のみ）。
- 変形（言語）: ヘッダーの「言語を切り替え」で日本語→中国語（`首页`、`欢迎使用 DYA Studio`）→英語（`Home`、`Welcome to DYA Studio`）を観測し、再クリックで日本語（`ホーム`、ボタン表示「言語を切り替え」、`JA`）へ復元。結果: pass。リンク先安全性・画像altの網羅は未実行。

## Connection

対象仕様: CON-R01、CON-001/002/003、CON-I01–03（`pages/connection.md`）。

- Charter（profile rename cancel）: MacBook Proの`Edit name`でtextbox（初期値 `MacBook Pro`）を開き、Saveせず`Cancel editing`を操作。最新snapshot後の再観測で通常表示へ戻り、名称は変化なし。結果: pass。
- 変形（default layer）: `MacBook Pro default layer`を`Follow OS detection`→`Base`へ変更し、表示が`Base`になることを確認。`Follow OS detection`へ戻し、`Refresh profiles`後も同値を確認。結果: pass。Save/flash永続化は未検証。
- Unpairは仕様指示により未実行。profile renameの保存成功、OS override、priority切替はnot-run。

## Settings

対象仕様: SET-001–007、SET-I01–04（`pages/settings.md`）、settings-write共有契約。

- Charter（timeout/debounce）: `Idle Timeout`初期`5 minutes`をメニューから`30 seconds`へ変更。約2秒後に値`30 seconds`と`Saved`を観測。メニューを再度開き`5 minutes`へ復元し、値`5 minutes`を観測。`Sleep Timeout`は初期`15 minutes`を維持。初期表示ではCentral=`5m/15m`、Peripheral 1=`5m/15m`、Peripheral 2=`8.33m/15m`だった。結果: pass（成功経路）。Demo実装が全sourceへ書く可能性のある復元結果は再確認できず、flash永続化・RPC失敗・範囲外・同時変更は未実行。
- 変形（Reload/reset cancel）: Settings初期表示では`Reload`が一時disabled、ロード後はenabled。`Reset all settings`を開くとHTML dialogに「keymap and all custom settings」「This cannot be undone」、`Cancel`、`Reset all settings`を表示。`Cancel`をクリックしdialog閉鎖、Idle=`5 minutes`を再確認。結果: pass。Confirmは未実行。
- `Advanced Settings`の展開、Reload押下後の全source値、debounce中Reload競合はnot-run。Peripheral 2の初期値差分を含む完全復元は未保証として残った。

## Subsystems

対象仕様: SUB-001、SUB-002、SUB-007、SUB-I01/04（`pages/subsystems.md`）。

- Charter（Demo toggle）: 初期はDemo: Subsystem Toggles、`Settings zmk__settings` checked、`Fast Keymap` unchecked、`Reconnect to apply`表示。Settingsをuncheckedにした直後も一覧は同じで、再接続前の境界を観測。`Reconnect to apply`後もcheckboxはunchecked。結果: pass（再接続境界の表示）。
- 変形（feature unavailable/restore）: 再接続後にSettingsタブを開くと`Settings RPC subsystem is not available for your keyboard.`が表示され、Power ManagementとDanger Zoneは残存。Subsystemsへ戻りSettingsをcheckedへ戻してReconnectし、初期状態を復元。結果: pass（仕様のunsupported表示を確認）。失敗時のreconnect error表示は未実行。
- 外部Web UIのwarning/Open/Cancel、trust保存、実外部遷移は安全制約により未実行。invalid URLと空subsystem listもnot-run。

## 判定・制約

観測できた範囲はpass。product-candidate/spec-gapは確認なし。未実行をpassに含めていない。UI操作中に1回古いrefでCancelクリックが失敗したが、直後に最新snapshotで編集が既に閉じていることを確認し、tool-error（アプリ不具合とは判定しない）として扱った。Demo設定はIdle、default layer、Settings toggle、言語を初期値へ復元済み。仕様・ソース・設定値の直接書換え、build、server起動、commit、外部 navigationは行っていない。
