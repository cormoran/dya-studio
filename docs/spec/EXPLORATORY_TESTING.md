# 仕様を使った探索的 UI テスト

## ブラウザツールを選ぶ

ユーザーの指定と実行環境で利用できるブラウザツール/skill を確認し、対象 UI に到達できるものを使う。このガイドはツール非依存の判定基準を扱う。コマンド、権限、タブ識別、dialog 操作は選んだツールのドキュメントに従う。

- Orca 環境で組込みブラウザを使う場合は、開始前に [Orca 向けガイド](browser-tools/orca.md) を読む。
- `playwright-cli` を使う場合は、開始前に [Playwright CLI 向けガイド](browser-tools/playwright-cli.md) を読む。
- その他の環境では、提供されているブラウザ操作ツールとその skill/手順を使う。別ツールのコマンドや戻り値の形式を流用しない。必要な操作ができなければ制約を報告する。
- Demo では再現できない firmware capability、RPC、保存・再読込を対象にする場合は repository の `renode-exploratory-test` skill を読み、shim を初回 navigation 前に注入できるブラウザツールを選ぶ。Renode を実機 WebSerial と同一視せず、ELF と emulator の条件を記録する。
- DYA2 実機テストを依頼された場合は [hardware-exploratory-test](../../.agents/skills/hardware-exploratory-test/SKILL.md) を使う。実 transport、容量・resource 負荷、flash/再起動、split/sensor の観点を選び、実機は worker 一人ずつ占有する。RPC reboot と物理電源断の証拠は分ける。

coordinator は worker にも利用するツールと環境別手順を渡し、同じ URL に到達できることを確認する。ブラウザが別ホストで動く場合、その localhost はアプリのホストと同じとは限らない。

## 開始

1. README の sitemap で対象ページを選び、ページ仕様と参照するモジュール仕様を読む。テスト中はまず仕様を判定の出発点にする。コードを読む必要が出た箇所は仕様の不足として記録する。
2. `npm run dev -- --host 127.0.0.1 --port 5173` で起動する（既存サーバーがある場合は担当者から URL を受け取る）。表示された実際の URL を使用する。
3. 通常はブラウザで URL を開き `Try Demo Mode` から接続する。日本語環境では対応する翻訳ラベルを探す。Renode を割り当てられた場合は `renode-exploratory-test` skill が出力した URL と shim を使う。実機の選択・外部サービスのログインは別途許可/環境があるときだけ行う。
4. 日時、アプリ commit、仕様 commit、URL、言語、viewport、モデル/effort、Demo/Renode/実機、初期値を記録する。Renode では DUT ELF の出典・commit、locking/topology、Renode version、shim 境界、boot/connection 回数も記録する。並列 worker は専用のタブ/ブラウザセッションを持ち、各操作の対象を明示する。localStorage 等は同じ origin で共有され得るので、設定変更は担当を分ける。
5. 観測 → 操作 → 再観測を繰り返す。要素参照は snapshot 後に取得し、画面変化後は再取得する。UI 操作を DOM/React 状態への書き込みで代用しない。

全体探索では [skill の計画・受入手順](../../.agents/skills/exploratory-ui-test/references/whole-app.md) に従い、全入口の batch と必須観測を dispatch 前に決める。同時実行数と総 batch 数は別であり、最初の2〜3 workerが終了しても未着手の計画済み batch を残して完了にしない。各 worker の最初の charter 後に途中レビューし、`worker_done` 前にも report/checklist の受入確認を依頼する。15〜25分は計画の目安で、必須操作を省くための打切り期限ではない。利用者の明示予算・期限は優先する。

変更集中型も含め、[証跡・レビュー protocol](../../.agents/skills/exploratory-ui-test/references/evidence-protocol.md) を worker brief に含める。coordinator が dispatch 前の原本 checklist と SHA-256 を保持し、結果 copy を `check-coverage.mjs --plan ... --plan-sha256 ...` で照合する。元の ID・必須条件・対象・仕様 ID の削除や差替えは構造エラー。全 source の初期値と UI 復元経路を `check-state.mjs before-mutation` で確認し、経路不足ならその書込みを実行しない。復元は同じ session の全対象値を比較し、Saved 表示だけで判断しない。これらは入力された記録の構造検査であり、coordinator の実証跡レビューを置き換えない。

レビュー ask は一つだけ保持し、timeout 後も同じ ID を再開する。coordinator は status 送信ではなく該当 ask に reply し、worker は受信した回答を記録する。`CONTINUE` は追加実行の指示で、終了許可ではない。現在の dispatch・成果物に対する明示的な `ACCEPT` または `SETTLE FAILED` を受信するまで `worker_done` を送らない。未実行は not-run とし、具体的な capability/権限/tool エラーなしに blocked へ変えない。

この作業で Demo または割当済み Renode DUT 内の編集・Save・Discard と復帰はテスト範囲に含まれる。Demo の Save や Renode の一時 NVS を実機 flash や外部サービスへの書込みと混同して避けない。初期値を記録して戻す。Renode の再起動後は erased NVS から始まるため、物理的な電源断をまたぐ永続性の証拠にはしない。実機・外部アカウントは別条件。

native confirm/alert は HTML dialog と別で、snapshot に現れない場合がある。確認文と accept/dismiss の操作またはツール応答を証拠に残す。メニュー項目をクリックしただけでは「承認済み」ではない。確認を観測/操作できない場合、承認後の期待は blocked とし、表示されない現象は tool/environment の可能性を付記する。`window.confirm` の上書きで pass を作らない。

保存される表示設定も後始末の対象。modal → floating は localStorage を変更するので、元の mode に戻したことを観測して記録する。

report の言語・theme と screenshot が食い違う場合は、同じ page ID の新しい DOM/選択値と画像を照合する。食い違いが未解決なら復帰確認・見た目の pass を保留し、ツールの対応付けを含む証拠不足として記録する。画像取得時に生ログとローカル画像を保存し、terminal 終了後の transcript 回収だけに依存しない。

言語の「復元」は最初に観測した言語へ戻すこと。英語は一律の初期値ではない。最終値が初期値と違えば「永続変更なし」と書かない。未接続なだけで Demo 接続が許可されているページを blocked にせず、Try Demo Mode と接続完了まで試し、失敗した場合はエラー/待機状態と復帰操作を残す。

並列でブラウザ設定を変えるときは、可能なら worker ごとに別 origin（例: 別 port のローカル Vite）を割り当てる。別タブだけでは localStorage/IndexedDB の分離にならない。サーバーの起動・停止は coordinator が担当し、worker は割り当てられた URL だけを使う。

観測中のアプリ版を固定する。`npm run generate`、`npm run build`（内部で generate）、source の format/edit、main の merge はブラウザセッションと同時に行わない。Vite の再読込が接続や state を変える可能性がある。必要な変更後はその影響を受けた charter を新しい初期状態からやり直し、旧版の報告を新しい版の pass に流用しない。

## 1 回のセッション

### 環境に到達できない場合

ブラウザツールの接続失敗をアプリ停止と断定しない。ツールの稼働状態、実行権限、ブラウザ側から指定 URL への到達性、サーバーの実ポートを環境別手順で確認する。制約で実行できなければ coordinator に具体的エラーを送り、環境修復を依頼する。worker は独自に runtime/server の再起動を繰り返さず、権限制約を回避しない。問題が解消するまで UI 結果は blocked とする。

環境情報は UI を開けなくても記録する。モデル/effort は worker launch 情報、app/spec commit は `git rev-parse HEAD` と仕様の作業ツリー差分から取得する。viewport は UI 到達後に読み取り専用の `window.innerWidth/innerHeight` で取得してよい。

低コスト実行ではツール応答の重複や巨大な出力を避け、操作に必要な最新の画面情報を読む。screenshot の base64 を会話へ大量に出力する代わりに、ツールが提供する画像/ファイルを扱う。画像を取得しただけで保存していなければ、存在しないファイルへのリンクは報告しない。

出力を絞る前にツールの成功/失敗を確認する。期待語だけを抽出した結果が空でも、ブラウザや snapshot が壊れたと断定しない。絞り込みなしの画面情報と URL を再取得し、接続画面・別画面への遷移、古い要素参照、ツールエラーを切り分ける。画面変更後に以前の参照で Save/Reload を押さない。

15–25 分または 3–5 charter を目安とし、完了を時間だけで判断しない。charter は「何を・どのリスクについて・何を証拠に」探索するかの短い宣言。

low-effort agent への初回割当は、編集を伴うページなら 1–2 ページに絞る。複数ページを一度に渡すと、保存後再読込や後始末の省略が起こりやすい。依頼者は「変更→待機→保存（必要時）→アプリ内再読込→復帰→再読込」の必須観測をチェック項目として渡す。未完は同じモデルへ短い follow-up を出し、通った基準操作を全面的に繰り返さない。

1. 代表フローを 1 本通し、仕様の使える部分と不足を把握。
2. 各 charter で基準操作 + 少なくとも 1 つの変形（境界・戻る・キャンセル・連打・切替など）を試す。
3. 変更前後の値、状態表示、ダイアログ、再読込結果を記録。単に「クリックできた」は保存の証拠にならない。
   同じ画面の snapshot 再取得はデバイスの再読込ではない。数値の `+` 直後に `-` を押すだけでは debounce 書込みを検証できない。待機 → ページ内 Refresh/Reload → 値の比較を行ってから元値を復帰する。変形は取消・境界・別設定への切替などリスクが変わる操作とし、復帰だけを変形として数えない。
4. 不具合候補は初期状態に戻して 1 回再現を試し、期待 ID と実測差分を残す。仕様が曖昧なら仕様不足とする。
5. 変更を復帰し、できなければ残存状態を報告。Demo の再接続/ブラウザ reload は実機の電源断と同義ではない。

## テーマの一貫性確認

UIレビュー・探索テストでは、担当ページと共有部品を**利用可能な全カラーテーマ**で実際に表示して比較する。現在は Light / Dark / Pop / Neutral。選択肢は実UIと [SHELL-005](modules/app-shell.md)、配色・書体の意図は [テーマのデザイン方針](../../src/themes/README.md) を基準にし、テーマが増えたら対象も増やす。変更集中型は影響ページと共有consumer、全体探索は割当ページが対象。配色確認だけのために保存・RPCの基準フローを全テーマで繰り返す必要はない。

1. 元のテーマを記録し、テーマメニューから切り替える。非同期フォント読み込み・画面遷移・色のtransitionが落ち着いてから、可視画面のスクリーンショットと必要なcomputed styleを新しく取得する。html classだけが変わった状態や切替前のcomputed styleを合格証拠にしない。描画が安定しなければtool/environmentの制約としてblockedを記録する。
2. 各テーマで通常・選択/active・hover・keyboard focus・disabledを確認し、開いたdropdown/dialog/tooltipも含める。警告・成功・エラーは安全に到達できる状態で確認し、未到達はnot-run/blockedとする。表示専用要素は操作可能に見えるhover色を付けず、仕様上のtooltipは残ることを確かめる。
3. **配色と面の区別:** 背景、カード、入力、キー、アイコン背景、状態ラベル、タブ下線、枠、スクロールバーがテーマの役割・明るさ・彩度と整合するか。固定色や枠線用tokenの背景流用によるくすみ、別テーマ由来の色、強すぎる枠/影、背景と同化するキー・浮動メニュー、隣接キーの境界消失を探す。意味色は文字・アイコン/状態とも対応し、単に全要素を同色へ揃えない。
4. **書体と切替漏れ:** 見出し、本文/説明、ボタン/タブ、ロゴ、入力、キー刻印、コードのfont-family・weightと実際の表示を確認する。Popの丸ゴシックはロード後の適用を確認し、意図した入力/キー/コードの例外を不具合扱いしない。Popから他の全テーマへ切り替えて元の書体へ戻ることも確認する。CSSのfont-family指定だけでCDNフォントの読み込み成功とはしない。フォント未取得時のfallbackとロード後を区別し、offline未実施を合格にしない。
5. 各テーマについて「ページ/部品・状態・期待するテーマの役割・観測した色/書体/境界・証拠・判定」を残す。DOM snapshotや自動テストの成功だけで見た目を確認済みにしない。見た目の好みや新しい提案と、文書化されたコンセプト/仕様との不一致は分ける。
6. 元のテーマへUIで戻し、選択値と表示を再観測する。同一originのlocalStorageを共有する他worker/userと競合させない。担当者ごとの別originを優先し、各テーマの未実施状態や未復帰を報告する。

テーマ確認の結果は `テーマ × ページ/部品 × 状態` の表で要約する。全テーマを一括passにせず、確認した範囲と、source-only・blocked・not-runを分ける。予算や時間で省いたテーマは省略理由と残作業を明示する。

## 判定

| 結果              | 判定基準                                                |
| ----------------- | ------------------------------------------------------- |
| pass              | 操作と観測により、その条件下で期待を満たした            |
| product-candidate | 明示/推定要求や不変条件への違反候補。実装どおりでも記録 |
| spec-gap          | 手順・期待・条件が不足/矛盾して判定できない             |
| blocked           | 実機、権限、subsystem、ブラウザ機能等が不足             |
| not-run           | 時間・担当範囲等で未実行                                |

要素の選択失敗や古い参照はまず tool-error として再 snapshot で切り分ける。既知の受け入れ済み不具合と一致する場合は該当 ID を付け、受け入れ範囲を超える症状は新しい候補にする。Demo で起こらなかった通信失敗を pass にしない。

## 検証記録の置き場所と寿命

- 操作ログ・snapshot・試行ごとの report は作業用の一時ディレクトリへ出力し、通常は commit しない。`docs/spec/validation/` のような履歴置き場を検証のたびに増やさない。
- レビューに必要な結果は PR 本文/コメントまたは作業の完了報告に要約する。対象 commit、仕様 ID、実測、未実行、後始末を残す。詳細証拠が必要なら、利用可能な CI artifact 等を使い、期限・アクセス範囲・機密情報に注意する。外部公開を自動で行わない。
- GitHub Issue 登録が許可されている場合（定期 automation を含む）は [Issue 報告手順](../../.agents/skills/exploratory-ui-test/references/issue-reporting.md) に従い、coordinator が既存 Issue を検索して新規登録または追記し、公開内容と URL を確認する。全体 coverage の未完了や変更なしを理由に省略しない。製品候補・仕様不足と、繰り返す skill/実行・復帰の障害を区別し、各所見の処置と URL または登録 blocker を完了報告へ残す。これは Issue 本文/コメントの許可であり、生ログや artifact の自動公開の許可ではない。
- HEAD に残すのは現在の判断に必要な内容だけ。再利用できる教訓は標準/ガイドへ統合し、未解決の不具合候補は対象仕様の「未解決・未検証」に最小再現条件・期待/実測・確認版・復帰方法を記す。解決時は更新し、試行を追記し続けない。
- 既に commit した試行ログは通常の削除 commit で HEAD から除いてよい。必要時は過去 commit から参照でき、履歴の書換えは不要。ただし squash merge では中間 commit が main の履歴に残らないため、今後も必要な根拠は仕様または PR 等へ要約しておく。

## 報告テンプレート

```text
対象 / charter:
環境: 日時、app/spec commit、URL、Demo/Renode/実機、言語、viewport、model/effort（Renode は DUT/ELF 出典、version、shim、boot/connection 回数も）
初期状態:
対象仕様 ID:
テーマ別確認: テーマ × ページ/部品 × 状態、色/書体/境界の期待と実測、証拠・判定
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

worker は未実行の必須操作を残したまま成功 settlement を送らない。active Task 内の途中レビューで不足を解消し、完了前に coordinator の受入 reply を得る。実行不能なら具体的 blocker と残存値を示して失敗 settlement とする。settlement 後の狭い証拠補足は run 全体で1回（利用者指定があれば優先）とし、事前に割り当てた未着手 batch の初回実行とは区別する。終了した担当の抜けを新しい初回 batch と呼び替えたり、worker ごとに補足回数を増やしたりしない。

## テスト agent への依頼ひな形

```text
対象: <仕様ファイルとroute>。URL: <起動済みの実URL>。Demo のみ。
読むもの: AGENTS.md、spec README、探索ガイド、対象ページ/共有モジュール仕様。
ブラウザツール: <この環境で利用するツールと環境別手順>。開始前に手順を読む。
アプリコードを読まず、仕様を使って3つのcharter+変形操作を行う。
専用tab/セッションを使い、すべての操作の対象を明示する。
担当ページ/共有部品を全テーマで確認する。探索ガイドのテーマ一貫性確認に従い、色・書体・各状態と切替漏れの表を残す。
Demo内の編集・保存・復帰は許可範囲。実機/外部サービスは操作しない。
出力: <一時ディレクトリ内の専有report>（通常commitしない）。
必須観測: <coordinatorがdispatch前に確定したchecklist。baseline、独立した変形、保存/復帰の各段階、theme/state、初期/最終表示設定>。
最初のcharter後に進捗と証拠を送り、active Task中に不足を修正する。
worker_done前にreport/checklistのレビューをaskし、coordinatorの受入replyを待つ。必須not-runを残して成功終了しない。
操作単位で仕様ID、期待/実測、証拠、判定。完了報告/PRには要約を残す。
承認していないconfirm後の動作、未実行、実機依存はpassにしない。
UIの値とブラウザ設定を元へ戻し、未復帰なら残存値を報告する。
仕様/手順の不足も報告する。コード修正や勝手な要件変更は行わない。
```
