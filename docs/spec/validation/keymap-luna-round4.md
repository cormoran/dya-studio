# Keymap Luna Round 4 検証記録

対象: `/keymap`。実施日: 2026-09-20 JST。URL: `http://127.0.0.1:5174/keymap`、Demo、JA、viewport 1963x1071、app commit `ea9234cd20ef02c5c7307053c748004f7bea302d`。専用タブ browserPageId: `aa08b328-b77d-4d4c-a925-d86d5369bd3f`。初期 localStorage は `keymapSelectorMode=floating`, `keymapAutoAdvance=true`, `keycodeSelectorCloseOnSelect=false`。

## Charter A: floating の連続編集境界

- A-01 (KM-003/004/005): キー位置 0 `A` を開き、表示 `Base · キー 1 / 55` を確認。ラベル「自動で次へ」を押して `keymapAutoAdvance=false` を確認し、候補 `S` を押した。観測は同じ `Base · キー 1 / 55` のまま、ダイアログは開いたまま、preview は「キー位置 0: S」、ページ status は「未保存の変更」、Save は有効。結果: pass。
- A-02 (KM-005): エディタを閉じ、preview の最後の物理キー「キー位置 54: F19」を直接選択。観測 `Base · キー 55 / 55`、`次のキー` は disabled。`自動で次へ` を ON に戻して候補 `A` を選ぶとダイアログが閉じ、`Base` のまま「キー位置 54: A」、別 layer へ wrap しなかった。結果: pass。

## Charter B: modifier draft / Escape / layer 切替

- B-01 (BIND-010/005): Base の元 binding `B` を開き、「修飾キー」→「LCtrl」を toggle。観測はエディタ開いたまま、`param1: LC(B) (0x1070005)`。Escape を送ると modifier メニューは閉じたがダイアログは残り、再度 Escape を送ってもダイアログは残った。一方 preview の「キー位置 1: B」は変化しなかった。要求された 1 回の Escape で floating を閉じることは確認できず、結果: product-candidate（Escape close 条件未達、binding 自体は未適用）。
- B-02 (KM-001/006): 同じ floating editor を開いたまま layer ボタン「Lower」を押した。観測は `Lower のキーボード配列` に切り替わり、dialog は消えた。結果: pass。

## Charter C: Demo Save / application Reload / 復元

- C-01 (KM-007): A-01/A-02 の変更を元に戻す操作を行い、Base key 0 を `A` に戻した。最後の key を `F19` に戻すため editor の検索欄へ `F19` を入力し候補を選択したが、再レンダー後の参照更新中に候補選択が不安定になり、key 54 の観測値が `A` のまま残った。
- C-02 (KM-007/009): Save → application の「再読み込み」→ `B` 維持、URL/connection 維持、最後に `A` へ戻して Save、の一連は、上記の復元途中に product の「破棄」を開き、native confirmation を `orca dialog accept` した直後から指定 browserPageId の snapshot/reload が無出力になったため、実行継続不能。結果: blocked（Save/Reload の成功証拠なし）。

## 後始末

「リセット」→「破棄」を選択し、表示された native confirmation に対して `orca dialog accept --page aa08b328-b77d-4d4c-a925-d86d5369bd3f --json` を実行した。accept 後の snapshot が無出力となり、mode/auto advance/close-on-select の最終値および keymap の残存値を再観測できなかったため、完全復元は未確認（coordinator に引き継ぎ）。初期値として記録した mode=floating、auto=true、close=false を UI で復元する操作は未完了。

## 仕様・証拠

対象仕様: KM-001〜006, KM-007, KM-009, KM-I01, BIND-003, BIND-005, BIND-010。証拠は各操作直後の `orca snapshot --page ... --json | jq -r '.result.snapshot'` 抜粋と read-only `localStorage` eval。実機、外部 account、実デバイスは使用していない。C の not-run 相当範囲が残るため、本 report は完全合格ではない。
