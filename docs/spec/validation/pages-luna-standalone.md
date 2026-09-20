# standalone pages 探索結果 (luna)

## 環境

- 日時: 2026-09-20 (Asia/Tokyo)、model/effort: gpt-5.6-luna / low
- app commit: `bcfa78616949b50f9829e770ae70b66b221e8932`、spec commit: 同一作業ツリー（spec変更あり）
- URL: `http://127.0.0.1:5183`
- Orca browserPageId: `66b39e56-688a-4680-9349-39d811a14825`（Guide/Release/Import）、OAuth専用 `9e27f0d1-f4f1-4f8e-8888-6f7474079899`
- viewport: `1441x1071`、最終 `document.lang=en`
- Demo/実機: 未接続。初期表示言語はGuideで日本語、Release切替前はJA、最終はEN。設定変更はReleaseの表示言語のみで、JA→ZH→ENへ復元。

## Developer Guide `/developer-guide`

- charter（GUIDE-001/004/007）: 直接表示。接続画面なしで「あなたの ZMK キーボードを DYA Studio に対応させる」、見出し「参照実装」「3 つの対応レベル」、breadcrumb、Related/Next、DYA Studioに戻る、TOCが表示された。TOC「参照実装」を押すとURLが `/developer-guide#section-1` になり、Backで `/developer-guide` に復帰した。結果: **pass**。
- 変形（GUIDE-002）: `/developer-guide/typo` を直接開くとURLは維持されたままroot相当のGuide内容（サイドバー/見出し）が表示された。結果: **pass（fallback実測）**。未知prefixを404にしない意図は仕様未確定のため、受入れ判断は **spec-gap** と併記。
- mobile Menu、狭幅、全11 route、外部リンク、theme切替は未実行（viewport変更機能を使っていない）。

## Release Notes `/release-notes`

- charter（REL-001/002/003）: 未接続でもstandalone一覧が表示され、`次回リリース予定`（マイナー項目2件）、空のreleased `2026.08.11.1`/`.0`（「変更はありません」）、`2026.08.09.0` の内容を確認。結果: **pass**。
- 変形（REL-004/006）: `/release-notes#2026.08.09.0` を直接開いてURL hashを維持し対象headingを表示。言語ボタンでJA→ZH（「发布说明」「即将发布」）→EN（「Release notes」/Back/Switch language）と切替、最終ENを確認。結果: **pass**。
- PR外部リンク、新規タブ、encoded/無効hash、狭幅は未実行。
- malformed percent-encoded hash（例 `%E0%A4%A`）は未実行。仕様更新のdecode例外リスクを確認できていない。

## Import/Export `/import-export`

- charter（IE-001/002、SHELL-R02）: 未接続で直接開くと `Reconnecting to your keyboard...` と `Cancel` のみ。その後Cancel操作で接続Splash（`Connect via USB`、`Connect via Bluetooth`、`Try Demo Mode`）へ戻った。結果: **blocked**（未接続環境）。
- 変形: Demo Modeを選ぶ未接続復帰までは確認したが、Demo接続後のImport/Export UI、config-missing/signed-out表示、read/export/importは未実行。認証済みが必要な操作をpassとは扱わない。

## OAuth Callback `/oauth/callback?error=access_denied&error_description=test`

- charter（OAUTH-001/005）: 専用tabでquery付きURLを開いてもHomeへ正規化されず、`Abyss sign-in failed` と `Abyss is not configured for this build.` が表示された。結果: **pass**（未設定エラー経路）。
- 変形: 見出しを押す誤操作では状態不変（tool操作の切り分け）、正しい `Back to DYA Studio` を押すと `/import-export` の接続Splashへ遷移した。結果: **pass**。
- 成功code交換、state不一致、popup relay、reload/再利用は未実行。外部ログイン・credentials・network account writeは行っていない。

## 制約・後始末

- 設定/認証情報/デバイス状態の永続変更なし。Release言語は最終ENへ復元確認。
- 未接続/未設定のためImport/Export authenticated read/export/importとOAuth成功系はblocked/not-runであり、passではない。mobile幅は専用emulator/viewport操作がなく未実行。
- 証拠: 上記browserPageIdの各直後snapshot、Guide anchor URL、Release hash URL、OAuth error URLおよび可視文言。tool error（OAuth見出しrefを押した）はアプリ不具合と判定せず、再snapshot後に正しいbutton refで再実行。
