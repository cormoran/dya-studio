# Luna core Settings follow-up

対象: Settingsのみ（必須charter）、Subsystems Reconnectは復元確認に使用。元レポート `pages-luna-core.md` は変更していない。

環境: 2026-09-20、app commit `7111e14478ff15f4e63a3842294b84224b54e97d`、Demo、URL `http://127.0.0.1:5181`、browserPageId `eb33a933-9f7e-4854-b5cf-3d41969afff3`、model/effort: gpt-5.6-luna / low。読み取り専用DOM評価で `document.documentElement.lang=ja`、viewport `1441x1071`。仕様IDは SET-001–004、SET-I01、Subsystems復元境界は SUB-007/SUB-I04、接続契約は CONN-001/CONN-002。

## 初期値と必須charter

Settings表示時の初期値（日本語UI）:

- `Idle Timeout` のコントロール: `5 分`
- `Sleep Timeout`: `15 分`
- `Current Settings by Device`: `Central: アイドル: 5分, スリープ: 15分`、`Peripheral 1: アイドル: 5分, スリープ: 15分`、`Peripheral 2: アイドル: 8.33分, スリープ: 15分`

操作と観測:

1. `5 分`（アイドルタイムアウト）を開き、`30 秒`を選択。約2秒待つとコントロールが`30 秒`、表示が`保存済み`となった。全sourceは `Central/Peripheral 1/Peripheral 2 = 30秒, スリープ15分`。
2. アプリケーションの`再読み込み`（Application Reload、ブラウザreloadではない）をクリックし、networkidle後に再観測。`30 秒`が維持され、全sourceは `Central: 30秒/15分`、`Peripheral 1: 30秒/15分`、`Peripheral 2: 30秒/15分`。
3. `30 秒`を`5 分`へ戻し、約2秒待つと`保存済み`。直後の全sourceは `Central/Peripheral 1/Peripheral 2 = 5分, スリープ15分`。
4. 再度アプリケーションの`再読み込み`をクリックし、networkidle後に再観測。`5 分`が維持され、全sourceは `Central: 5分/15分`、`Peripheral 1: 5分/15分`、`Peripheral 2: 5分/15分`。

期待: SET-002/003、SET-I01に従い、debounce後にSavedを表示し、Application Reload後も読み出し値が維持されること。実際: 30秒・5分とも上記を満たした。なおDemoの`setActivitySettings`は全sourceを同時に30秒/5分へ更新するため、Centralだけを設定してPeripheral 2の初期値（500000ms、UI表示8.33分）を維持する前提ではない。

結果: pass（このcharterの観測範囲）。RPC失敗、範囲外入力、Idle/Sleep同時変更はnot-run。

## Subsystems Reconnect後の復元確認

Settings操作後、Subsystemsで元のtoggle状態（`Settings zmk__settings` checked、`Fast Keymap cormoran__fast_keymap` unchecked、他の初期toggleも初期値）を確認し、`Reconnect to apply`をクリック、networkidleを待った。Settingsへ戻ると、コントロールは`5 分`/`15 分`、全sourceは `Central: アイドル5分, スリープ15分`、`Peripheral 1: アイドル5分, スリープ15分`、`Peripheral 2: アイドル8.33分, スリープ15分`（= 500000ms相当）となり、指定された初期Demo値へ復元された。結果: pass（SUB-007/SUB-I04のReconnectを反映境界として確認）。

後始末: 言語はJA、Subsystem toggleは初期状態、Idle/Sleepは初期値。外部遷移、reset、Confirm、実機、ブラウザreloadは未実行。snapshot再取得はApplication Reloadの代用にせず、各Reloadボタンのクリック応答とnetworkidle後のreadbackを記録した。
