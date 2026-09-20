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
