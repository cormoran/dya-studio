# Keymap Luna Round 3 検証

## 環境

- 対象: Demo `http://127.0.0.1:5174/keymap`（実機・外部サービスなし）
- `orca status`: runtime ready / appVersion `1.4.205`
- app revision: `db03c6e9c7d650811158ed18848d33222d2b9472`
- browserPageId: `6f99c25e-cddb-4fb6-bb6f-4782997d67a6`（専用ページ、全操作で明示）
- model/effort: `gpt-5.6-luna / low`（inherited）
- 参照仕様: KM-003〜KM-008、BIND-003〜BIND-007/BIND-010、EXPLORATORY_TESTING の Demo/confirmation/cleanup 節。仕様ファイルは作業ツリー上の更新版を読了（独立した仕様コミット番号は未確認）。

## Charter 1: modal Close-on-select OFF / draft / Escape

**Pass (KM-006, BIND-003/004)。** 初期 Base の「キー位置 0: A」をクリックし、modal の「選択時に閉じる」を OFF にして `B` を選択した。直後の snapshot は dialog「キー割り当てを選択」が残り、`param1: B`（旧値 A と区別できる）を示した。`Escape` を押した後は dialog が消え、メイン snapshot は「キー位置 0: B」、status「未保存の変更」となったため、modal の未完了ドラフトは Escape で適用されたと判定した。

## Charter 2: Save / reload / restore

**Pass (KM-007)。** Charter 1 の B を `保存` し、snapshot で status「保存済み」を確認した。ページ `再読み込み` 後はホームに戻ったため、Demo を再度開くという仕様ガイド記載の手順を追加し、再表示された keymap で「キー位置 0: B」、status「保存済み」を確認した。元の A を選択して Escape で適用し、`保存` して status「保存済み」に戻した（変更の永続化と復元を実観測）。

## Charter 3: floating mode and boundary/layer variations

**Pass (KM-003, BIND-003)。** 元の A の selector を開き、`フローティングモード`を押すと modal が floating selector に置換され、snapshot に `前のキー`、キー一覧、`選択後、自動で次のキーに移動` tooltip が現れた。これは mode switching の UI 遷移と floating 表示の実観測である。

**Not-run (KM-004/005/006、BIND-005/007)。** 今回の時間枠では floating の modifier/numeric 未完了値を作るところまで到達できず、Escape discard、Auto advance OFF の同一キー維持、最終キーの Next disabled、ON 時の apply-close/no-wrap、floating open 中の layer switch close は未実行。したがってこれらは合格扱いにしない。numeric は入力していない。

## Confirmation-dependent operation

**Blocked (KM-008)。** Native `window.confirm` を override せず、Discard の accept 経路は round2 に続いて今回も未観測。確認ダイアログを受け入れた後の Discard は blocked とし、product-candidate には分類しない。

## Preference and cleanup

実行中に modal→floating を切り替えた。終了時は元の A を保存して keymap status を「保存済み」に戻した。floating/auto-advance/close-on-select の最終値をすべて UI で再確認できる観測は不足しており、Preferences は **Not-run/cleanup gap** と明記する。mode switching の localStorage 書き込み自体も storage 値を読み取る操作は行っていないため、KM-003 の persistence は未検証である。

## Guide usability / evidence quality

Demo URL、ページ ID、fresh snapshot refs、保存後の reload→Demo 再開という具体手順は再現可能だった。snapshot は「キー位置 0: A/B」「param1: A/B」「保存済み」「未保存の変更」「フローティングモード」を直接示した。ページ reload が `/keymap` ではなくホームへ遷移するため Demo 再開が必要で、この点はガイドに明記するとよい。スクリーンショットファイルは保存していない。未実行条件は上記の通り分離し、round2 の native confirm に関する過大な product-candidate 判定を訂正した。
