# standalone pages 追跡探索結果 (luna-low)

## 環境・初期/最終状態

- 日時: 2026-09-20、model/effort: gpt-5.6-luna / low
- app commit: `bcfa78616949b50f9829e770ae70b66b221e8932`、URL: `http://127.0.0.1:5183`
- 主タブ page ID: `66b39e56-688a-4680-9349-39d811a14825`。変形タブ: `1dbcdc53-8cea-4234-ab25-7cadc97c574a`。OAuth既存タブ: `9e27f0d1-f4f1-4f8e-8888-6f7474079899`（今回は操作なし）。
- viewport: 主/変形とも `1441x1071`。この追跡セッション初期は `document.lang=en`、言語ボタン表示EN。
- 主タブで「Switch language」を1回押し、JA表示（`lang=ja`、`デモモードを試す`）へ変更。その後Demo接続、別タブ作成、別タブReloadを実施。最終はJA（変形タブReload後の `{"w":1441,"h":1071,"lang":"ja","path":"/import-export"}`）で、初期ENから変更された永続設定が残っている。前回レポートの「ENへ復元」は初期JAに対する復元ではなく、今回JAへの復帰をUIで実施した事実を別記する。
- Demo/実機: Demo。credentials、外部ログイン、Abyss account操作は未実施。

## Charter 1: 言語復帰とDemo接続 (SHELL-006、IE-001/002)

操作と観測:

1. 初期snapshot: `/import-export` の接続Splash、`Connect via USB`、`Connect via Bluetooth`、`Try Demo Mode`、言語ボタンEN、`document.lang=en`。
2. 言語ボタンを押すとボタン表示JA、`USB で接続`、`Bluetooth で接続`、`デモモードを試す`、`document.lang=ja`。
3. 最新refの「デモモードを試す」を押し、networkidle待機。snapshotに `DYA Keyboard (Demo)`、切断、通常タブ群（ホーム、キーマップ、マクロ&コンボ、トラックボール、接続、設定、診断、サブシステム、インポート／エクスポート）が表示された。

期待/実際: 未接続でもDemo接続を最後まで試すべきであり、実際に接続完了した。結果: **pass**（GUIDE-R01/SHELL-R02の接続不要/ Demo導線、およびIEの前提到達）。

## Charter 2: Demo後のImport/Export signed-out gate (IE-001/002/009/010)

操作と観測:

1. Demo接続完了時点でImport/Export tabは選択状態。tabpanelに見出し「インポート／エクスポート」、説明「Keyboard Abyss とキーマップを同期します」、見出し「Keyboard Abyss」を確認。
2. 未認証状態では「サインインするとキーマップのインポート／エクスポートができます。」、ボタン「Abyss でサインイン」、`abyss.keyboard-hub.com のサインイン画面が開きます。セッションはこのタブを閉じるまで有効です。`だけが表示された。Export/Import section、Read keyboard、Export、Import、Sign outは表示されなかった。

期待/実際: signed-outではsign-in cardのみでExport/Import sectionを隠す。実際にその通り。結果: **pass**（IE-001/002）。Sign-in buttonは外部認証開始になるため押していない。

## Charter 3: 別タブ・Reload変形 (IE-001/002、SHELL-003)

操作と観測:

1. 同一originの別タブ `1dbcdc53-8cea-4234-ab25-7cadc97c574a` を `/import-export` で作成。初期SplashにもJAと「デモモードを試す」が表示された。
2. 別タブでDemo Modeを押し、networkidle待機。`DYA Keyboard (Demo)`、Import/Export selected tab、同じsigned-out説明と「Abyssでサインイン」のみを確認。Export/Import操作UIはなし。
3. 別タブをbrowser Reloadし、networkidle後に同じtabpanel文言を再確認。`lang=ja`も維持された。

結果: **pass**（別tab/Reloadでもsigned-out gateを維持）。同一originで言語localStorageが共有される点は実測事実であり、タブ単位の分離は確認していない。

## 判定・未実行・制約

- Demo接続後の未認証ゲートは pass。認証済みExport/Import、Read keyboard、Abyss catalog、Write to keyboard、Sign outは credentials/外部サービスが必要なため **blocked/not-run**。未認証gateを認証済み機能のpassとは扱わない。
- OAuth成功/relay/state mismatch、Release malformed hash、mobile width、外部PRリンクは **not-run**。今回は必須Demo/Import-Export charterを優先した。
- 未認証gateではアカウント操作・ネットワーク書込みを実施していない。言語は初期ENからJAへ変更し、Reload後JAを観測したため「設定変更なし」とは記載しない。前回レポートは保存し、本ファイルに追跡結果のみ記録した。
- 証拠: 各操作直後のraw snapshot、Demo接続後の `DYA Keyboard (Demo)` とtab refs e6-e14、tabpanel refs e15-e18、変形tab Reload後のeval結果。tool errorなし。
