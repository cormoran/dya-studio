# 仕様を使った探索的 UI テスト

## 開始

1. README の sitemap で対象ページを選び、ページ仕様と参照するモジュール仕様を読む。テスト中はまず仕様を判定の出発点にする。コードを読む必要が出た箇所は仕様の不足として記録する。
2. `npm run dev -- --host 127.0.0.1 --port 5173` で起動する（既存サーバーがある場合は担当者から URL を受け取る）。表示された実際の URL を使用する。
3. ブラウザで URL を開き `Try Demo Mode` から接続する。日本語環境では対応する翻訳ラベルを探す。実機の選択・外部サービスのログインは別途許可/環境があるときだけ行う。
4. 日時、アプリ commit、仕様 commit、URL、言語、viewport、モデル/effort、Demo/実機、初期値を記録する。並列 worker は別タブを作成し page ID を全操作に指定する。localStorage 等は同じ origin で共有され得るので、設定変更は担当を分ける。
5. 観測 → 操作 → 再観測を繰り返す。要素参照は snapshot 後に取得し、画面変化後は再取得する。UI 操作を DOM/React 状態への書き込みで代用しない。

この作業で Demo 内の編集・Save・Discard と復帰はテスト範囲に含まれる。Demo の Save を実機 flash や外部サービスへの書込みと混同して避けない。初期値を記録して戻す。実機・外部アカウントは別条件。

native confirm/alert は HTML dialog と別で、snapshot に現れない場合がある。確認文と accept/dismiss の操作またはツール応答を証拠に残す。メニュー項目をクリックしただけでは「承認済み」ではない。確認を観測/操作できない場合、承認後の期待は blocked とし、表示されない現象は tool/environment の可能性を付記する。`window.confirm` の上書きで pass を作らない。

Orca 1.4.205 の CLI には `orca dialog accept --page <id> --json` / `orca dialog dismiss --page <id> --json` がある（使用前に現在の `--help` を確認）。クリック後の dialog を処理し、成功応答と再 snapshot を記録する。保留 dialog がない等の失敗応答なら承認の証拠にはならない。

保存される表示設定も後始末の対象。modal → floating は localStorage を変更するので、元の mode に戻したことを観測して記録する。

言語の「復元」は最初に観測した言語へ戻すこと。英語は一律の初期値ではない。最終値が初期値と違えば「永続変更なし」と書かない。未接続なだけで Demo 接続が許可されているページを blocked にせず、Try Demo Mode と接続完了まで試し、失敗した場合はエラー/待機状態と復帰操作を残す。

並列でブラウザ設定を変えるときは、可能なら worker ごとに別 origin（例: 別 port のローカル Vite）を割り当てる。別タブだけでは localStorage/IndexedDB の分離にならない。サーバーの起動・停止は coordinator が担当し、worker は割り当てられた URL だけを使う。

観測中のアプリ版を固定する。`npm run generate`、`npm run build`（内部で generate）、source の format/edit、main の merge はブラウザセッションと同時に行わない。Vite の再読込が接続や state を変える可能性がある。必要な変更後はその影響を受けた charter を新しい初期状態からやり直し、旧版の報告を新しい版の pass に流用しない。

## 1 回のセッション

### 環境に到達できない場合

Orca では `orca-cli` skill の実行環境に従う。sandbox 内だけで `runtime_unavailable` や localhost 接続失敗が出る場合、アプリ停止と断定せず、許可された `require_escalated` 実行で `orca status --json` と指定 URL の HTTP 到達性を再確認する。制約で実行できなければ coordinator に具体的エラーを送り、環境修復を依頼する。worker は独自に runtime の serve/restart を繰り返さない。サーバーの実 URL が予定ポートと違うことも確認する。問題が解消するまで UI 結果は blocked とする。

環境情報は UI を開けなくても記録する。モデル/effort は worker launch 情報、app/spec commit は `git rev-parse HEAD` と仕様の作業ツリー差分から取得する。viewport は UI 到達後に読み取り専用の `window.innerWidth/innerHeight` で取得してよい。

低コスト実行では snapshot JSON 全体（refs と tree の重複）を何度も読み込まず、`result.snapshot` を抽出する。例: `orca snapshot --page <id> --json | jq -r '.result.snapshot'`（jq 利用可能時）。操作に使う ref はその最新 tree から取得する。screenshot の base64 を会話へ大量に出力する代わりに、ツールが提供する画像/ファイルを扱う。画像を取得しただけで保存していなければ、存在しないファイルへのリンクは報告しない。

抽出前に JSON の `ok` を確認する。さらに `rg` 等で期待語だけを抽出した結果が空でも、ブラウザや snapshot が壊れたと断定しない。絞り込みなしの `result.snapshot` と URL を再取得し、接続画面・別画面への遷移、stale ref、ツールエラーを切り分ける。画面変更後に以前の ref で Save/Reload を押さない。

15–25 分または 3–5 charter を目安とし、完了を時間だけで判断しない。charter は「何を・どのリスクについて・何を証拠に」探索するかの短い宣言。

low-effort agent への初回割当は、編集を伴うページなら 1–2 ページに絞る。複数ページを一度に渡すと、保存後再読込や後始末の省略が起こりやすい。依頼者は「変更→待機→保存（必要時）→アプリ内再読込→復帰→再読込」の必須観測をチェック項目として渡す。未完は同じモデルへ短い follow-up を出し、通った基準操作を全面的に繰り返さない。

1. 代表フローを 1 本通し、仕様の使える部分と不足を把握。
2. 各 charter で基準操作 + 少なくとも 1 つの変形（境界・戻る・キャンセル・連打・切替など）を試す。
3. 変更前後の値、状態表示、ダイアログ、再読込結果を記録。単に「クリックできた」は保存の証拠にならない。
   同じ画面の snapshot 再取得はデバイスの再読込ではない。数値の `+` 直後に `-` を押すだけでは debounce 書込みを検証できない。待機 → ページ内 Refresh/Reload → 値の比較を行ってから元値を復帰する。変形は取消・境界・別設定への切替などリスクが変わる操作とし、復帰だけを変形として数えない。
4. 不具合候補は初期状態に戻して 1 回再現を試し、期待 ID と実測差分を残す。仕様が曖昧なら仕様不足とする。
5. 変更を復帰し、できなければ残存状態を報告。Demo の再接続/ブラウザ reload は実機の電源断と同義ではない。

## 判定

| 結果              | 判定基準                                                |
| ----------------- | ------------------------------------------------------- |
| pass              | 操作と観測により、その条件下で期待を満たした            |
| product-candidate | 明示/推定要求や不変条件への違反候補。実装どおりでも記録 |
| spec-gap          | 手順・期待・条件が不足/矛盾して判定できない             |
| blocked           | 実機、権限、subsystem、ブラウザ機能等が不足             |
| not-run           | 時間・担当範囲等で未実行                                |

要素の選択失敗や古い参照はまず tool-error として再 snapshot で切り分ける。既知の受け入れ済み不具合と一致する場合は該当 ID を付け、受け入れ範囲を超える症状は新しい候補にする。Demo で起こらなかった通信失敗を pass にしない。

## 報告テンプレート

```text
対象 / charter:
環境: 日時、app/spec commit、URL、Demo/実機、言語、viewport、model/effort
初期状態:
対象仕様 ID:
操作と観測: 各操作直後の具体的な値/文言
期待 / 実際:
結果: pass / product-candidate / spec-gap / blocked / not-run
証拠: screenshot ファイル / snapshot 抜粋 /操作ログ（秘密情報を含めない）
再現性・影響:
後始末・残った変更:
未実行範囲:
仕様/ガイド改善案:
```

## ガイド自体の合格条件

低コスト agent がコードを読まず開始でき、3 つ以上の charter と変形操作を行い、仕様 ID と具体的観測を結びつけられること。blocked を pass にしないこと。仕様不足が実行を妨げた場合は修正し、同じモデルで再試行する。合格は対象フローの範囲に限り、アプリ全体の無欠陥を意味しない。

各 charter を丸ごと pass にせず、実行した操作と未実行操作を分ける。親が dialog を閉じる仕様は「開いたまま tab/layer を切替」で検証し、先に自分で閉じてから切替してもその証拠にはならない。永続化は Save → ページ内 Reload の値まで確認する。キー pilot は Close/Escape の mode 差、auto advance OFF/末尾、Save/Reload を必須観測とする。

完了前に担当一覧と report を照合し、必須操作それぞれに実際の control 名・値・判定があるか確認する。仕様 ID はコピーして存在確認し、似た prefix を創作しない。期待値、操作成功応答、UI 実測値を別物として扱う。後始末は編集フォームだけでなく影響する全 source と言語/mode を点検する。

必須ケースを時間都合で not-run にした report は、正直な途中報告ではあるが合格ではない。次セッションの対象をその未実行ケースだけに絞り、済んだ baseline を繰り返さない。曖昧な「再読み込み」は避け、アプリの Reload ボタンか browser reload コマンドかと操作後の URL/接続状態を必ず記録する。想定外の画面遷移が起きたら実際に押した ref/ラベルを再確認し、ガイドに存在しない復帰手順を存在したように記述しない。

## テスト agent への依頼ひな形

```text
対象: <仕様ファイルとroute>。URL: <起動済みの実URL>。Demo のみ。
読むもの: AGENTS.md、spec README、探索ガイド、対象ページ/共有モジュール仕様。
アプリコードを読まず、仕様を使って3つのcharter+変形操作を行う。
Orcaコマンドはsandbox外（exec_command の require_escalated）で実行する。
自分のtabを作り、browserPageIdをすべての操作に指定する。
Demo内の編集・保存・復帰は許可範囲。実機/外部サービスは操作しない。
出力: <専有するvalidation report>。操作単位で仕様ID、期待/実測、証拠、判定。
承認していないconfirm後の動作、未実行、実機依存はpassにしない。
UIの値とブラウザ設定を元へ戻し、未復帰なら残存値を報告する。
仕様/手順の不足も報告する。コード修正や勝手な要件変更は行わない。
```
