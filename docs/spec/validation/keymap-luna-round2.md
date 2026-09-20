# Keymap pilot 探索テスト: Luna round 2

## 結論

Orca runtime と Demo に昇格実行で接続でき、専用 tab `browserPageId=cc0ae367-21c4-4d2d-a489-879c13f79139` を使って 3 charter と変形を実行した。modal の選択適用、floating の auto advance と layer 切替、Demo 再接続による後始末は仕様どおり確認できた一方、Reset の `破棄` を実行しても `未保存の変更` と変更値が残ったため、KM-008 の product-candidate として記録する。UI は日本語、viewport は `1963x1071`、Demo のみ、model/effort は `gpt-5.6-luna / low (inherited)`。

## 環境・初期状態

- 実施日: 2026-09-20 (Asia/Tokyo)
- URL: `http://127.0.0.1:5174/` → `/keymap`
- app commit: `db03c6e9c7d650811158ed18848d33222d2b9472`
- spec commit: 未取得（作業ツリー上の更新仕様を使用）
- 言語: JA、viewport: `window.innerWidth=1963`, `innerHeight=1071`
- 接続: `DYA Keyboard (Demo)`、実機・外部サービスなし
- tab/page: Orca tab `cce46f07-9e2f-4ce5-9ab2-4ce8a72cd0b9`、全 browser action に上記 page ID を指定
- 起動証拠: `orca status --json` は `app.running=true`, runtime `ready/reachable=true`, graph `ready`。`curl -I` は `HTTP/1.1 200 OK`。
- 初期値: layers `Base`, `Lower`, `Raise`; physical layout `DYA Dash`; OS layout `US (ANSI)`; Base keys 55 個（位置 0=`A`, 1=`B`, 2=`C`…）; status `保存済み`; Save disabled; Base 先頭 layer の Up disabled; Auto advance の初期ボタンは `自動で次へ`。
- 対象仕様: KM-R01–R03、KM-001–KM-009、KM-I01/I03、F1–F3。更新された KM-006（modal Close/Escape は適用、floating は未適用 draft を破棄）を使用。

## Charter A: modal の選択適用と dirty/save 状態

対象: KM-002, KM-006, KM-007, KM-I01/I03、F1

操作と観測:

1. Keymap 入口の snapshot は `保存済み`、Base position 0=`A`, 1=`B` を表示。
2. position 0 (`キー位置 0: A`) をクリック。dialog `キー割り当てを選択`、`フローティングモード`、`選択時に閉じる`、`閉じる`、param1=`A (0x4)` を観測。
3. selector の検索 textbox に `B` を入力。候補 `B` を観測。
4. `B` をクリック。dialog は閉じ、Base position 0 が `B`（position 1 も `B`）へ変化、status が `未保存の変更`、Save が enabled になった。

期待 / 実際: modal の最後の parameter 選択で適用・閉じる、対象位置だけ変更、dirty 表示という期待に一致。position 1 は元の B のままで、position 0 への変更が隣へ誤適用された証拠はない。

結果: `pass`（Demo 条件）。Save 自体は副作用を避けるため実行せず、flash 永続化は未検証。

証拠 snapshot 抜粋: `dialog "キー割り当てを選択"`; `button "param1: A (0x4)"`; after selection `button "キー位置 0: B"`, `status "未保存の変更"`, `button "保存" [ref=e19]` enabled。

## Charter B: floating mode、Next 境界、Auto advance、未適用 draft と layer

対象: KM-003–KM-006、KM-001、KM-I01/I03、F2/F3

操作と観測:

1. position 1 (`B`) を開き `フローティングモード` をクリック。同じ編集対象の floating dialog が表示され、toolbar status は `Base · キー 2 / 55`、ボタンは `自動で次へ`, `前のキー`, `次のキー`, `ダイアログモード`, `閉じる`。
2. `次のキー` を 1 回クリック。binding は選ばず toolbar が `Base · キー 3 / 55` になり、Base position 2 は元の `C` のまま。選択移動のみで書込みがないことを確認。
3. floating の key list で `D` をクリック。Base position 2 が `D` に適用され、toolbar は `Base · キー 4 / 55` へ自動進行した。status は `未保存の変更` のまま。これは Auto advance ON の期待（成功後に次キー）と一致。
4. floating の `閉じる` をクリック。dialog が閉じ、Base status/変更値は維持された。未適用 draft の Escape そのものは keypress 操作を省略したため未実行だが、floating Close 経路は確認済み。
5. Base→Lower をクリック。selector は閉じた状態で、active group が `Lower のキーボード配列`、55 個すべて `Trans`。Base の変更値とは別 layer であり、layer 切替による誤適用は観測されなかった。Lower の up button は enabled、Base の up は disabled だった。

期待 / 実際: Next は適用せず位置だけ移動、Auto advance は次位置へ移動、layer 切替で selector を閉じ別 layer を表示、という期待に一致。

結果: `pass`（実行範囲内）。末尾 key の Next disabled、Auto advance OFF、floating Escape の未適用 draft 破棄は未実行。

証拠 snapshot 抜粋: `Base · キー 2 / 55` → `Base · キー 3 / 55` → `Base · キー 4 / 55`; Base positions 2/3=`D`; `group "Lower のキーボード配列"` と全 `Trans`。

## Charter C: Reset/Discard と再接続による cleanup

対象: KM-008, KM-009、F3

操作と観測:

1. 変更を保持した状態で `リセット` を開く。menu に `初期状態に戻す`（disabled、Demo は keymap 単体 reset 非対応の説明）、`破棄`（未保存編集を破棄し保存済み keymap を読み直す説明）、保存 version `2026/09/20 4:37` が表示された。
2. `破棄` をクリック。確認ダイアログは表示されず menu は閉じたが、status は `未保存の変更` のまま、Base の変更値（position 0=`B`, position 2=`D`）も残った。
3. Lower layer でも同じ `破棄` を再実行したが、status は `未保存の変更` のまま。これは仕様 KM-008 の「承認で保存値を再取得」と一致しない。確認ダイアログが出ない点も仕様の native confirm 記述と差分。
4. Save は押さず、`切断` をクリックして接続画面へ戻す。再度 `デモモードを試す`。Keymap が再ロードされ、Base position 0=`A`, 1=`B`, 2=`C`, status=`保存済み`, Save disabled に復帰した。
5. 最終状態の layer は Base、physical `DYA Dash`、OS `US (ANSI)`。変更は Demo 再接続で消え、保存・localStorage の意図的変更は残していない。

期待 / 実際: Discard は保存値を再取得し dirty を解除するはずだが、直接操作では解除されなかった。Demo 再接続では初期値へ戻った。

結果: `product-candidate`（KM-008。Demo 上で同じ手順を2回実行して同一結果）。ただし再接続で復帰できることは確認し、実機 flash の discard 挙動は未検証。

証拠 snapshot 抜粋: menu item `破棄 キーボードのメモリ上にある未保存の編集を破棄し、キーボードに保存済みのキーマップを読み直します。`; 実行後 `status "未保存の変更"` と Base `キー位置 0: B`, `キー位置 2: D`; 再接続後 `status "保存済み"`, `キー位置 0: A`, `キー位置 2: C`, `保存 [disabled]`。

## 判定まとめ

| 範囲                                         | 判定              | 根拠                                                           |
| -------------------------------------------- | ----------------- | -------------------------------------------------------------- |
| modal 選択適用、対象位置、dirty              | pass              | KM-002/007、position 0 の B 化と status/Save 観測              |
| floating Next、Auto advance、layer isolation | pass              | KM-003–005/001、2/55→3/55→4/55、Lower の Trans                 |
| floating Escape、末尾境界、Auto advance OFF  | not-run           | 今回の時間/リスク配分で未実行                                  |
| Reset→Discard                                | product-candidate | KM-008 期待に反し、2回とも dirty/変更値が残存                  |
| Save→Reload / flash                          | not-run           | Save の外部副作用を避けた。Demo flash 永続化は仕様上検証対象外 |

## 後始末・ガイド usability

切断→Demo 再接続で変更値と dirty 状態を初期化し、最終 UI は `保存済み`、Base `A/B/C`、Save disabled に戻した。モード設定や auto advance の永続設定は変更していない。ガイドは低コスト tester が source を読まず、Demo entry、layer/key 初期値、modal/floating の異なる Close semantics、Next/Auto advance、cleanup を実行するのに十分だったが、KM-008 の「native confirm」期待と実際の Demo UI（確認なし）を比較するチェックポイントを F3 に明示するとさらに判定しやすい。

## 未実行・制約

末尾 Next disabled、Auto advance OFF、floating Escape 未適用 draft、modal Close/Escape の別経路（今回 modal は選択適用のみ）、Save→Reload、Rename、layer add/delete/restore、lock、RPC failure、狭幅 viewport、実機 flash、履歴復元は未実行。スクリーンショットは Orca `full-screenshot` を取得したが、CLI の base64 結果のみでファイル保存はしていない。以上を pass と推定していない。
