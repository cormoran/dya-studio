# Macro & Combo / Trackball / Troubleshooting / Debug Tool 探索結果

対象 / charter: Macro&Combo（既存値変更・保存・復元、global Tap ms）、Trackball（numeric setting と input-processing variation）、Troubleshooting（診断展開・report）、Debug Tool（入口・log tab・close）、Versions 表示確認。

環境: 2026-09-20 JST、app commit `bcfa78616949b50f9829e770ae70b66b221e8932`、URL `http://127.0.0.1:5182`、Demo、JA、Orca browser page ID `59cb5e17-a9b0-4a1a-ae5a-844f22dae706`、model/effort: gpt-5.6-luna / low。初期 session は `DYA Keyboard (Demo)`、Macro Tap ms=30、macro Hello size=21/64、Trackball scaling=1.00x、processor `trackpad` layers 0/1/2/3、PMW3610 custom settings は「設定が報告されませんでした」。

## Macro&Combo

対象仕様 ID: MC-001, MAC-004, MC-002, MC-R02。

操作と観測: `/macro-combo` を開くと macro `Hello`/`Wait Enter`、combo 3件、toolbar `保存` disabled。`マクロのグローバル設定`を開き、`タップ時間 ms` 30→31 に fill、別見出しへ blur。直後の snapshot は `タップ時間 ms 未保存: 31`、toolbar `未保存の変更`、`保存` enabled。保存後 snapshot は値31、未保存表示なし、`保存` disabled、通知「ランタイムコンボの変更を 0 件保存しました。」。その後30へ変更して保存し、初期値へ復元。

期待 / 実際: 変更は dirty と表示され、Save 後に dirty が消え、保存値を再読できること（MAC-004/MC-002）。実際に一致。

結果: pass。変形操作として Save 前の dirty→Save と、別値から元値への復元を実施。macro name、step追加、容量超過、combo single-position/17-position、capacity full は not-run（安全に到達できる範囲では未実施）。

Versions: Macro page に履歴ボタンは表示されず、Versions 入口は確認できなかった。

## Trackball

対象仕様 ID: TRACK-R01, TRACK-R02、input-processing shared contract、HIST-011。

操作と観測: `/trackball` の processor `trackpad` を確認。初期 scaling は1.00x（slider value 67）。`スケーリングを上げる`を1回押すと snapshot が1.05xへ変化。`スケーリングを下げる`を1回押して1.00xへ戻した。input-processing variation として `有効にするレイヤー`、センサー回転、Temporary layer、axis snap、X/Y inversion、`XY をスクロールに変換`、`XY 入れ替え` の switches が表示され、初期値はいずれも unchecked。PMW3610 は「キーボードから pmw3610 ドライバーの設定が報告されませんでした。」で driver editor は unavailable。

期待 / 実際: processor numeric setting が変更・readback可能で、範囲説明（0.01x–10x）と入力処理 controls が表示されること（TRACK-R01）。実際に一致。custom driver settings は報告時のみ利用可能（TRACK-R02）のため Demo では blocked。

結果: pass（processor scaling）、blocked（PMW3610 custom settings）。Versions ボタンは表示されたが、capture/restore は未実行（復元対象の別値を作らず、安全上 not-run）。

## Troubleshooting

対象仕様 ID: DIAG-R01/DIAG-R02（ページ仕様）、SESSION-R04、探索ガイドの report/非破壊条件。

操作と観測: `/troubleshooting` 初期 snapshot で `デバイス情報`、`安定性（ウォッチドッグ）`、`キースイッチ`、`トラックボールセンサー (PMW3610)`、`スタック使用量` が折りたたみ表示。`安定性（ウォッチドッグ）`を展開すると source `中央側`/`周辺側 1`、容量16、保存件数2、履歴「フリーズ」「リセット」と詳細が表示され、`発生履歴を更新`も表示された。変形として `サポートレポートをコピー` を押すと同一画面で「コピーしました！」へ変化。

期待 / 実際: 診断 section を展開し、観測可能な診断値・更新 controls と report 操作が提供されること。実際に一致し、reset/reboot/delete は操作していない。

結果: pass（観測・report copy）。Demo の firmware failure、Report 内容を外部貼付けする実運用、削除/リセット後の復帰は not-run。Demo 固有の診断値を実機相当とみなさない。

## Debug Tool

対象仕様 ID: DEBUG-R01/DEBUG-R02（Debug Tool page spec）。

操作と観測: 接続後の表示タブ（Home, Keymap, Macro&Combo, Trackball, Connection, Settings, Troubleshooting, Subsystems, Import/Export）と Troubleshooting UI を探索したが、`Debug Tool` の入口ボタンは snapshot に現れなかった。外部URLへの移動、routeの推測、firmware reset は行っていない。

期待 / 実際: devtool capability がある Demo で Debug Tool を開き、log tab を選択して閉じること。入口がUIから到達できないため、ログタブ選択・close は実行不能。

結果: blocked（Demo capability/入口不在）。Debug Tool の不在をアプリ不具合とは断定しない。Versions の未実行も含め、実機または capability を備えた Demo 条件で再試行が必要。

## 後始末・制限

Macro Tap ms は30、Trackball scaling は1.00xへUI操作で復元済み。Troubleshooting は非破壊の展開と report copy のみ。native confirmation は発生せず、未承認操作後の成功とは扱っていない。ソース・仕様は変更しておらず、既存の作業ツリー変更（AUTHОRING/仕様ページ）は保持した。ページはDemo接続のままで、切断は実機状態を変えないため未実行。
