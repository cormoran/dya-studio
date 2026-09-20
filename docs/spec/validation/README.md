# 標準と探索ガイドの改善記録

## Round 0: draft

コードの入口とキーマップの状態を調査し、要求/現状/実測の分離、仕様 ID、状態・永続化・エラーの明記、低コスト agent がコードなしで実行できることを gate にした。

以降の round は実施モデル/effort、アプリと仕様の版、実行証拠、仕様不足、変更内容、再試行結果を記録する。承認されていない不具合を既知の受け入れ済み不具合に分類しない。

## Round 1: キーマップへの適用による draft 修正

`db09841` の page → hook → selector と page tests を照合した。modal は適用 callback の直後に閉じる経路があり、floating と失敗時挙動が異なる。また default reset は binding を順に変更してから保存するため原子的ではない。これを踏まえ、同じ UI の見た目でも presentation ごとの結果、部分失敗、RAM/flash/ブラウザの保存範囲を分ける粒度にした。layer rename の失敗時 dialog 閉鎖も「正常」として要求に昇格せず未解決として残した。

追加レビューで `KeycodeSelector.handleOpenChange` の modal 終了時自動適用を発見した。初稿の KM-006/I03 は floating の性質を modal に広げており誤りだったため修正。標準に Close/Escape/外側クリック/親画面切替を別々に追う規則を追加した。pilot worker に更新を通知し、この区別も UI 確認対象にした。

## Round 2: luna-low によるガイドの試用

[初回](keymap-luna-round1.md) は sandbox 内の Orca/localhost 接続失敗で UI 未実行。coordinator が sandbox 外の HTTP 200 と live runtime を確認し、ガイドに昇格実行での切り分けを追記。[再試行](keymap-luna-round2.md) は実 UI で modal 適用、floating Next/auto advance、layer 分離を観測。

レビューでは再試行 report に次の過大判定を発見したため、この report は最終判定ではない。Discard は native confirm の承認証拠がなく、KM-008 の承認後の挙動は **blocked**（不具合確定ではない）。Save enabled の観測だけでは KM-007 の保存は **not-run**。既に閉じた selector で layer を切替しても「layer 切替で閉じる」の検証にはならない。mode 切替は localStorage の変更なので「設定変更なし」も不正確。ガイドにこの区別、Demo Save の実行許可、設定の後始末を明記し、終了操作・境界・Save/Reload を次 round の必須にした。

## Round 3: 未実行を正しく残すだけでは合格にしない

[round3](keymap-luna-round3.md) では modal の draft → Escape 適用を観測し、Discard を blocked へ訂正できた。しかし floating 境界と設定復帰を省略しており gate 未達。Save 後の「再読み込み」はアプリ内操作か browser reload かの区別・想定外遷移の証拠が不足し、この部分は再確認が必要。新規の短いセッションで未完の 3 charter のみに絞る。標準を際限なく長くせず、テストガイドに必須ケースの未実行を未完了とする基準と Reload の操作識別を追加した。

## Round 4: 境界と観測失敗の切り分け

[round4](keymap-luna-round4.md) は auto advance OFF、末尾 Next 無効、末尾適用後の close、開いた floating からの layer 切替を確認。modifier popup 使用後の Escape は editor が残る候補として記録したが、focus/ネストした popup の条件を含め追加検証が必要であり受け入れ済みにしていない。

Save/Reload は未完。coordinator が同じ page ID で未加工 snapshot を取得すると `ok=true` で接続画面が見えたため、report の「snapshot 無出力」はブラウザ停止の証拠ではなかった。絞り込み前の出力と URL を確認する手順を追加。加えて round3 付近に coordinator の build/generate と Vite HMR が重なっていたため、その再読込観測は確定根拠にせず隔離 origin の round5 で再確認する。以降は生成/merge を UI 観測と並行しない。

古い pilot 用 5174 の 4 タブを閉じ、coordinator が起動したサーバーを停止した。これにより Demo のセッションは終了したが、5174 origin の localStorage の初期設定への完全復元は確認していない。実機・外部サービスへの変更はない。

## Round 5: 保存フローの隔離再検証と v1 判定

[round5](keymap-luna-round5.md) は新規 origin `5180`、`a8eeb6e` 上で A→B、Save、アプリ内 Reload 後の B/Saved、A へ復元保存を実観測。ページ ID typo はエラーとして再観測してから判定した。起動 receipt は luna-low。コードを読まず仕様 ID と UI 証拠を結びつけた。

v1 は、round2 の基準編集、round3 の modal Escape、round4 の floating 境界・layer 切替、round5 の Save/Reload を合わせて、低コスト agent の探索を支援し、誤判定・未実行もレビューで識別できる標準として全ページへ展開する。これは各版/条件の限定的な実測で、全アプリ・全状態の pass ではない。floating modifier 後の Escape、native confirm、実機/RPC failure は未解決/未検証として残す。全ページ展開後は新しい並列探索で別の領域も評価する。

[coordinator の再観測](coordinator-review.md) では modifier draft 後の Escape は正常に閉じ、binding を適用しなかった。round4 の候補はこの条件で再現せず、原因を断定しない。最終 mode/auto/close の復帰も観測した。

## 全ページ展開: terra-high 3 担当と source review

`bcfa786` に全ページと共通モジュールを追加。起動 receipt で3担当とも `gpt-5.6-terra` / `high` を確認した。接続・設定系、編集・診断系、外部連携・単独画面系に専有ファイルを分け、同じ標準/テンプレートを使用した。Page ソース参照漏れも CI チェックへ追加した（route 網羅性や内容の正しさを証明するものではない）。

レビューで修正した誤りと標準への反映:

- Save の disabled 条件を有効条件へ逆に文章化していたため、boolean の具体例で点検する規則を追加。
- OAuth は接続 UI gate の前だが provider の外ではないため、「未接続で表示」と内部 mount の区別を追加。
- Settings の Central 基準値から peripheral 非変更を誤って推論していた。set RPC の対象まで追う規則を追加し、全 source の復帰をテスターへ依頼。
- 履歴の「fresh read」「persistent」というコメントだけでは RPC 再読込・実機 flash の証拠にならない。consumer 実装と boolean 失敗を照合し、modal close だけでは成功としない説明を追加。
- Trackball の待ち時間・数値範囲、Refresh All の非 await、Release Notes の存在しない hash と壊れた percent encoding の差を具体化。

仕様生成 worker の完了報告はレビューの代用にならない。これらは製品コードの修正ではなく、実装事実・推定要求・未検証を正確に分けるための文書修正である。

## 全ページ探索: luna-low 3 担当 + 限定再試行

3担当とも起動 receipt の requested/effective が `gpt-5.6-luna` / `low`。別 origin 5181/5182/5183 を割り当て、コードを読まず仕様を使う条件で実施。follow-up は同じ確認済み terminal/process を再利用した。Orca は全担当に sandbox 外実行を明示した。

| 担当と証拠                                                                                   | 採用する観測                                                                                                                                             | 未確認・訂正                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [core 初回](pages-luna-core.md) / [follow-up](pages-luna-core-followup.md)                   | Home 言語往復、Connection edit Cancel/default layer 復帰、Settings timeout とアプリ内 Reload、reset Cancel、Subsystem disable→Reconnect→unavailable→復帰 | 初回 Settings の Reload は not-run。follow-up で補完。初回 `CON-` は `CONN-` の誤記。全 source 復帰は follow-up の UI 表示値まで確認、8.33分から正確な ms は直接観測していない                   |
| [editors 初回](pages-luna-editors.md) / [follow-up](pages-luna-editors-followup.md)          | Macro Tap ms Save→Refresh→復元、Reset 内の履歴、Trackball scaling/axis snap 待機→Reload→復元、診断展開・コピー成功表示                                   | 初回の snapshot は readback ではなく、単なる +/- 復帰は変形として不足。follow-up で補完。clipboard 内容自体は未確認。Debug Tool は Demo capability 不在、PMW custom setting は報告なしで blocked |
| [standalone 初回](pages-luna-standalone.md) / [follow-up](pages-luna-standalone-followup.md) | Guide anchor/back/unknown-prefix、Release 一覧・hash・言語、OAuth 未設定 error/復帰、Demo 接続後 Import/Export signed-out gate と別タブ/browser Reload   | 初回 EN は初期JAへの復元ではなかった。follow-up でJAへ戻した。単なる未接続は blocked の根拠として不足でDemo接続後を追加。Guide全11route/mobile、認証成功・import/export実行は未確認              |

初回 report は生の試用結果として残すが、過大な pass や後始末の記述はこのレビューと follow-up を優先する。低コスト向けに、編集ページの割当を1–2ページへ絞ること、操作単位の必須チェック、snapshot と実読込の差、初期言語の復帰、caller ごとの履歴入口、Demo未提供条件をガイド/仕様へ反映した。Follow-up では不足していた観測を具体値・ラベル・仕様 ID に結びつけ、到達不能な実機/認証経路を pass にしていない。

この範囲で標準と探索ガイドの v1 gate を満たす。全仕様の全境界をテストした意味ではない。特に実機永続化、通信失敗、ロータリー編集、履歴復元、macro/combo容量境界、狭幅/全localeは未検証のまま。low agent の完了報告を無審査で信用せず、必須観測のレビューを運用に残す。

別途 [不正 hash の候補](release-hash-candidate.md) は coordinator がコードレビューからブラウザ再現まで実施。製品不具合の修正や受け入れは本タスクでは行っていない。

## 自動検証

- `npm run spec:check`: ローカルリンク、必須節、299 IDs、Pageソース参照を確認。
- `npm run lint`、`npm run build`: 成功（build の既存 large-chunk warning あり）。
- `npm test -- --runInBand`: main 接続修正取込後、85 suites / 707 passed / 1 skipped。既存 console warning は残るが失敗なし。
- ブラウザ観測中に app source / generate / build を変更していない。docs 更新に伴う Vite CSS HMR はあり、見た目全般や無瞬断の保証はしていない。

後始末: 全 worker の報告を受領して専有 terminal を解放（同一 terminal の過去 dispatch は再利用履歴として残る）。今回作成した 5180–5183 の6ブラウザタブを閉じ、確認済みの4 Vite プロセスを終了した。報告に示す表示値/設定の復帰範囲は確認したが、テストで追加された localStorage override のキー有無・IndexedDB 履歴・clipboard の元内容まで完全復元したとは主張しない。
