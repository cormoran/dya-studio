# Pilot reviewer の再観測

2026-09-20、source `a8eeb6e`（その後は docs の変更のみ）、Demo `http://127.0.0.1:5180/keymap`、JA、専用 page `91ca9cbb-de1c-4623-9579-cc1913f9276a`。終了時 viewport は 1441×1071。これは coordinator 自身の観測であり luna の観測として数えない。

## Modifier draft の Escape（BIND-005/010、KM-006）

round5 後の A/Saved から実施。preview `キー位置 0: A` → modal → `フローティングモード` → `修飾キー` → `LCtrl`。snapshot の editor 値は `param1: LC(A) (0x1070004)`、preview は A、status は保存済み。`orca keypress --page <id> --key Escape --json` は `pressed: Escape` を返し、その直後の snapshot で dialog が消え、A/Saved を維持した。

この条件では round4 の Escape 候補は再現しなかった。round4 のフォーカス、実際の ref、画面幅などの条件差を十分に特定できていないため、候補をアプリの確定不具合にも受け入れ済み不具合にも分類しない。modifier の展開はこの実測では editor 内の inline controls だった。

## 復帰

A を再び開き `ダイアログモード` → Escape。modal は現在値を送るので dirty となり、Save を押して復帰した。最終 snapshot は A、保存済み、Save disabled、dialog なし。読み取り専用 eval は mode=`modal`, auto=`true`, close=`true` を返した。キーの raw parameter はこのセッション開始時/終了時とも `A (0x70004)`。Demo 初期 boot の A と同じ表示でも内部表現が同一とは限らないため、round5 の「復帰」は UI 表示と保存状態についての証拠と解釈する。
