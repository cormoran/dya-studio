# Keymap pilot 探索テスト: Luna round 1

## 結論

結果は `blocked`。仕様書だけで charter、期待値、Demo 制約、観測項目は組み立てられるが、この実行環境では Orca のブラウザ runtime と Demo URL の両方に接続できず、UI 操作・スクリーンショット・仕様 ID の実測対応は一件も実施できなかった。従って、未実行の UI 挙動を pass や product-candidate とは判定しない。

## 環境

- 実施日: 2026-09-20 (Asia/Tokyo)
- 対象 URL: `http://127.0.0.1:5174/`
- app commit: `db03c6e9c7d650811158ed18848d33222d2b9472` (`db03c6e`)
- spec commit: 未取得（作業ツリーで仕様ファイルを読了）
- 言語 / viewport / model・effort: UI 未起動のため未観測
- 接続: Demo のみを予定、実機・外部サービスは使用していない
- 参照仕様: KM-R01–R03、KM-001–KM-016、KM-I01–I04、F1–F3
- 読了資料: `AGENTS.md`, `docs/spec/README.md`, `docs/spec/EXPLORATORY_TESTING.md`, `docs/spec/pages/keymap.md`

## 起動・接続の証拠

1. `orca tab create --url http://127.0.0.1:5174/ --json` を実行。観測値は `runtime_unavailable` / `Could not connect to the running Orca app. Restart Orca and try again.`。
2. `orca status --json` の観測値は `app.running=false`, `runtime.state=stale_bootstrap`, `runtime.reachable=false`, `graph.state=not_running`。
3. `orca open --json` 後にも同じ `runtime_unavailable` が継続した。
4. `orca serve --json` は `runtime_serve_failed`、`Orca serve aborted with SIGABRT on macOS`（restricted/sandboxed environment 等が原因候補）で終了した。
5. `curl -I --max-time 5 http://127.0.0.1:5174/` は `curl: (7) Failed to connect to 127.0.0.1 port 5174`。

ブラウザ tab が生成されず、`browserPageId` は得られなかった。このため、要件の「自分の browser tab を作成し、全操作に browserPageId を指定」は、tab 作成の試行までで停止した。スクリーンショット、snapshot、画面上の label/value は取得していない。

## Charter 実行記録

### Charter A: modal / floating と切替（KM-002/003/006、KM-I03）

- 目的: Demo → Keymap → 任意キー → `Floating mode` / `Dialog mode`、Escape/Close で draft が適用されないことを確認する。
- 基準操作: Demo 接続、Keymap 入口、先頭キーを開く。
- 変形: modal と floating の往復、Escape、layer 切替。
- 実測: Demo 入口にも到達できず未実行。
- 期待値: selector の表示形式だけが変わり、切替・Escape・layer 切替では binding を書き込まない。
- 判定: `blocked`（環境）。仕様は操作と期待値を提示しているが、接続失敗時の再開手順/診断情報は不足。

### Charter B: Auto advance の先頭・末尾境界（KM-004/005、KM-I01）

- 目的: floating で Auto advance ON/OFF、先頭/末尾の Previous/Next、最後のキー適用後の閉じ方と layer 非巡回を確認する。
- 基準操作: floating を開き toolbar の `Key N / count` と auto advance 状態を記録。
- 変形: ON→次キー、OFF→同じキー、末尾→Next 無効、ON で末尾適用。
- 実測: UI 未起動のため未実行。`Key N / count`、キー数、layer 名も未取得。
- 期待値: ON は次の物理キー、OFF は同一キー、境界の矢印は無効、末尾適用後は閉じて別 layer に巡回しない。
- 判定: `blocked`（環境）。仕様上の境界条件は明確だが、異なる layout/key 数での選択方法は実測前提。

### Charter C: dirty / cancel / save / reload / layer（KM-001、007–012）

- 目的: 変更、Reset→Discard の確認キャンセル/承認、Save、Reload、layer 移動と rename の取消を確認する。
- 基準操作: 先頭キーの binding を変更し `Unsaved changes`、Save 後 `Saved`、Reload 後の値を記録。
- 変形: Discard confirm を Cancel と承認の両方、別 layer へ移動して戻る、Rename の Cancel。
- 実測: UI 未起動のため未実行。初期 layer 名・binding・Save 状態は未取得。
- 期待値: Cancel は dirty/値を保持、承認は保存値へ戻る、Save 後は `Saved`/Save 無効、Reload は device 現在値を再取得する。
- 判定: `blocked`（環境）。Demo の Reload が実 flash 永続化を検証しない点は仕様に明記され、ガイドは有用。

## 仕様だけでテストを開始できるか

部分的に可。README と探索ガイドは Demo 限定、初期値を固定しないこと、観測→操作→再観測、未実行と blocked の区別を明記しており、keymap 仕様の KM ID/F1–F3 は charter の骨格として十分だった。一方、runtime または port が利用不能な場合の切り分け（サーバー起動責任、期待する `npm run dev` の実行場所、Orca runtime 再起動の権限/手段、再試行終了条件）が仕様だけでは決められず、今回のように実測へ進めない。

## 未実行・未確認

全 UI charter、初期 layer/key values、modal/floating の表示、auto advance 境界、cancel/save/reload/layers、rename、lock、error、狭い viewport、スクリーンショット、再現性、後始末の UI 状態は未実行。アプリソースは読んでいない。Demo URL への HTTP 到達性も失敗したため、仕様と実装の一致や不具合候補は判定していない。

## 後始末・改善案

ブラウザ tab は生成されず、Demo/localStorage/device への変更はない。再試行時は Orca desktop/runtime を利用可能にし、`127.0.0.1:5174` の Demo server を起動した後、tab 作成結果の `browserPageId` を全操作へ指定する。ガイドには「URL が接続不能 / Orca runtime unavailable の場合: blocked として記録し、担当者へ server/runtime 起動を依頼する」短い手順と、viewport の取得方法を追加すると低コスト tester が停止理由を再現可能に報告できる。
