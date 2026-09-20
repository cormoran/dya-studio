# Keymap Luna Round 5

対象 / charter: `/keymap` F1（KM-002 / KM-007 / KM-009）、単一キー変更・保存・アプリ内再読み込み・復帰

環境: 2026-09-20、app/spec HEAD `a8eeb6e522d857f5d723695b0c3a49604bb2f374`、URL `http://127.0.0.1:5180/` → `/keymap`、JA、Demo（`DYA Keyboard (Demo)`）、browserPageId `91ca9cbb-de1c-4623-9579-cc1913f9276a`、viewport は未取得、model/effort は worker 起動情報未提示。

初期状態: 「デモモードを試す」[e6] → 「キーマップ」[e7]。接続済み Demo、layer `Base`、物理レイアウト `DYA Dash`、OS 配列 `US (ANSI)`、Stream OFF。先頭は preview position 0 / `キー位置 0: A` [e53]、隣接 position 1 は B。初期 status `保存済み`、アプリ操作ラベルは `保存` [e19]（disabled）、`再読み込み` [e18]。

対象仕様 ID: F1、KM-002、KM-007、KM-009、KM-I01。

操作と観測:

1. position 0 `キー位置 0: A` [e53] をクリック。modal `キー割り当てを選択` が開き、behavior `Key Press- キーを押す`、param1 `A (0x4)`、`選択時に閉じる` [modal e5] が ON（checked 状態相当の既定表示）。
2. modal の `B` [modal e80] を選択。modal は閉じ、position 0 は `キー位置 0: B` [e53]、position 1 は B のまま。status `未保存の変更`、`保存` [e19] は enabled。KM-I01 の範囲で別位置への誤適用なし。
3. `保存` [e19] をクリック。status `保存済み`、`保存` [e19] disabled。URL は `/keymap` のまま。
4. browser reload は使わず、アプリの `再読み込み` [e18] をクリック。URL は `/keymap`、banner は `DYA Keyboard (Demo)`、接続ボタンは `切断` [e2]、position 0 は B、status `保存済み`、`保存` disabled。
5. position 0 [e53] を再度開き、modal の `A` [modal e62] を選択。position 0 は A、status `未保存の変更`。
6. `保存` [e19] をクリック。position 0 は A、status `保存済み`、`保存` disabled。初期状態へ復帰済み。

期待 / 実際: 期待どおり、modal の既定 Close-on-select で B が即時適用され dirty 表示、Save 後に Saved/Save disabled、アプリ内 Reload 後も URL・Demo 接続・B・Saved を維持し、最後に A/Saved へ復帰した。

結果: pass

証拠: 各操作直後の Orca snapshot。初期 snapshot: `キー位置 0: A`、Base、`保存済み`、`再読み込み`/`保存`。変更後 snapshot: `キー位置 0: B`、`未保存の変更`。保存後およびアプリ内 Reload 後 snapshot: B/`保存済み`/Save disabled。最終 snapshot: A/`保存済み`/Save disabled。Reload 待機時に page ID を一度 typo したため `browser_tab_not_found` となったが、操作自体は成功済みで正しい page ID の unfiltered snapshot を再取得して確認した。

再現性・影響: 1 回実行、対象 flow は再現。Demo のため実機 flash 永続化は未検証。

後始末・残った変更: binding は元の A に戻して Save 済み。mode は modal のまま、Stream OFF、layer Base、Demo 接続維持。アプリ設定・他ページは変更していない。

未実行範囲: viewport、実機、native confirmation/Discard、floating/Auto advance、他ページ編集、遅延競合は対象外。

仕様/ガイド改善案: なし。`保存`/`再読み込み` の exact label と current refs を手順に明記できる。

Coordinator 補記: worker 起動 receipt の requested/effective はいずれも `gpt-5.6-luna` / `low`。viewport はこの report の対象操作中に記録していないため後から推測で埋めない。
