# Trackball

## 範囲・根拠

- 種別: `/trackball`（`Trackball` タブ）。runtime input processor と PMW3610 custom settings の編集画面。共通 RPC は [Runtime input processing](../modules/input-processing.md)、capture/restore の保存先は [version history](../modules/version-history.md) を参照する。
- 確認: 2026-09-20、`8627e4d`。コード確認のみ。実機 sensor と PMW3610 firmware UI は未実測。

| 根拠 | ソースと symbol                                                                                                                                  | 根拠の内容                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| S1   | [TrackballPage](../../../src/pages/TrackballPage.tsx): `handleScalingValueChange`, `handleRotation*`, `handleTempLayer*`, `handleAxisSnap*`, JSX | processor controls と debounce   |
| S2   | [useRuntimeInputProcessor](../../../src/hooks/useRuntimeInputProcessor.ts): `set*`, `loadProcessors`                                             | processor RPC/error/notification |
| S3   | [Trackball page tests](../../../src/pages/__tests__/TrackballPage.test.tsx)                                                                      | page-level state の回帰根拠      |
| S4   | [AdvancedSettingsSection](../../../src/components/AdvancedSettingsSection.tsx)、[useCustomSettings](../../../src/hooks/useCustomSettings.ts)     | PMW3610 custom-settings consumer |

## 機能要求

| ID        | できるべきこと                                                                                                                         | 出典・確度         |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| TRACK-R01 | 対象 processor を選び、sensitivity、rotation、layer、axis と座標変換を調整できる                                                       | S1/S2 から推定     |
| TRACK-R02 | PMW3610 driver が custom settings を報告する時だけ、その section を選択・編集できる                                                    | S1/S4 から推定     |
| TRACK-R04 | #28 対応 processor の慣性 / Fast input を編集でき、旧デバイスの既存編集を維持する                                                      | 明示要求（本変更） |
| TRACK-R05 | 開閉できる浮動ウィンドウの有限エリアでスクロール・マウス移動と慣性 / Fast input の状態を確認し、上下・左右スクロールを個別に固定できる | 明示要求（本変更） |
| TRACK-R03 | mobile では processor と PMW3610 driver を共通 dropdown から選択し、直下の detail を編集できる                                         | 明示要求           |

## 前提・状態

- `cormoran_rip` subsystem がない時は `Runtime input processor subsystem is not available...`、0 processors は `No processors found`。processor と keymap layer は非同期に読込む。
- 左 pane は Processors と PMW3610 Drivers。right pane は選択 processor または driver settings。一つを選ぶと他方の detail は表示しない。
- mobile では左 pane を表示せず、ヘッダー操作列の dropdown に Processors / PMW3610 Drivers をまとめる。trigger は選択種別と項目名の二段表示で、選択対象に対応する Reload と Versions を同じ行に置く。
- field は `useDebouncedSave` で pending 表示を先に変え、`MEMORY_WRITE_DEBOUNCE_MS`（1,500 ms）の quiet 後に processor RPC を送る。コードは request の RAM/flash を区別しないため、`Versions` は firmware 保存ではなく captured version history とする。

UI の数値範囲は scaling 0.01–10、rotation -180–180°、temporary layer activation 0–1000 ms / deactivation 0–2000 ms、axis snap threshold 0–1000 / timeout 0–600 ms。HTML input の min/max は firmware 検証の保証ではない。直接入力と slider/step 操作の差は探索対象とする。

## 現行の機能仕様

モバイル幅のページ表示・共通操作・説明は[共通画面 SHELL-009/010/011](../modules/app-shell.md)に従う。下記の可用性・保存・エラー契約は画面幅で変わらない。

| ID        | 前提 → 操作                                                     | 観測できる結果                                                                                                          | 保存範囲・副作用                                                                                                         | 根拠  |
| --------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----- |
| TRACK-001 | `Reload processors` / mount                                     | Processors list、layer grid（active/temp ring）を再読込                                                                 | read RPC。tab 往復だけでは明示 reload しない                                                                             | S1/S2 |
| TRACK-002 | scaling slider、`-`/`+`、数値 input                             | 0.01–10.00 の対数 slider、表示値は fraction へ変換                                                                      | debounce 後に processor ID の multiplier/divisor RPC。fraction は約分                                                    | S1/S2 |
| TRACK-003 | Rotation switch、`-`/`+`、degree input                          | OFF は 0°、ON は -180–180° の input                                                                                     | debounce write。OFF 前の非0 rotation を復元する state はない                                                             | S1    |
| TRACK-004 | Active on Layers を All / Specific にし layer checkbox を変える | bitmask 0 は All、各 layer の active cell が変化                                                                        | debounce write。layer ID bit 演算は 32-bit 範囲に依存                                                                    | S1/S2 |
| TRACK-005 | Temporary Layer、activation/deactivation delay を変更           | enable、target layer、ms controls                                                                                       | debounce write。入力値の firmware validation は UI だけでは保証しない                                                    | S1/S2 |
| TRACK-006 | Axis snap の switch/mode/threshold/timeout を変更               | enable 時既定 Y、mode X/Y、数値 controls                                                                                | debounce write。OFF は NONE                                                                                              | S1/S2 |
| TRACK-007 | X invert、Y invert、XY to scroll、XY swap を toggle             | switch の checked state が変わる                                                                                        | debounce write。複数 toggle の原子性はない                                                                               | S1/S2 |
| TRACK-008 | PMW3610 driver row を選ぶ                                       | `CustomSettingsSectionCard` の当該 custom subsystem section                                                             | custom-settings subsystem が無い/section 0 の場合は編集不能。個別 field の保存契約は S4                                  | S1/S4 |
| TRACK-009 | `Versions` から snapshot を選ぶ                                 | diff modal を経て restore の入口                                                                                        | IndexedDB 等の履歴契約は [version history](../modules/version-history.md)。processor firmware default reset は提供しない | S1    |
| TRACK-010 | mobile dropdown で processor / PMW3610 driver を選ぶ            | menu が閉じ、選択種別と項目名を二段表示して直下の detail を切り替える。driver の未保存 dot は trigger / item に表示する | 選択だけでは書込まない。隣接 Reload は選択中の subsystem だけを再読込する                                                | S1/S4 |

### 慣性と動作確認（2026-09-26 追加）

根拠 S6: [InertiaPreviewGraph](../../../src/components/trackball/InertiaPreviewGraph.tsx)、[inertiaSimulation](../../../src/lib/inertiaSimulation.ts)、[C参照値との比較テスト](../../../src/lib/__tests__/inertiaSimulation.test.ts)。#28 commitのC関数をホストでコンパイルして生成した7ケースの全出力tick列との一致を確認（物理デバイスの検証とは別）。参照値の再生成は[ホストC検証スクリプト](../../../scripts/generate-inertia-simulation-fixtures.py)を参照する。

根拠 S5: [InertiaCard](../../../src/components/trackball/InertiaCard.tsx)、[InputTestCard](../../../src/components/trackball/InputTestCard.tsx)、[inputInertia](../../../src/lib/inputInertia.ts)。プロトコル根拠は [runtime input processor PR #28](https://github.com/cormoran/zmk-module-runtime-input-processor/pull/28) の commit `7fa97aca3fefe4212c51a53c84f7caf889476086`。

| ID        | 前提 → 操作                                                                      | 観測できる結果                                                                                                                                                                                                                                                                                                                                                                                                          | 保存範囲・副作用                                                                                                                                                                                                              | 根拠     |
| --------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| TRACK-011 | processor を選択 → コードマッピング下の `Inertia`                                | 有効な測定期間・出力間隔を報告した processor のみ checkbox と数値を編集できる。旧 firmware は未対応の案内を表示し既存カードは継続動作                                                                                                                                                                                                                                                                                   | 未対応 processor に新 RPC は送らない                                                                                                                                                                                          | S2/S5    |
| TRACK-012 | `Enable Inertia` / 慣性数値を変更                                                | 慣性とFast inputのサブセクションに分離。enable は即時、数値は1,500 ms debounce。測定期間/出力間隔1–60000 ms、入力しきい値1–65535、減衰0–100%、通常出力上限0–32767、Fast input しきい値0–65535、Fast出力100–1000%。無効時も値を編集できる。`Queued` → `Saving…` → `Saved`。空欄・不正文字列・範囲外・非整数は入力欄に維持し警告色/aria-invalidにする。その間は待機中の書込みを取消し、有効な値になってからdebounceで反映 | firmware PERSIST (write mode 0)。通常出力上限0は無制限、Fastしきい値0はFast無効。Fast checkbox OFFで0、ONでmax(慣性入力閾値×1.5,20)を切上げて65535以内の整数にする。失敗はページalert・行の失敗表示、再編集またはReloadで復帰 | S2/S5    |
| TRACK-013 | ヘッダーのVersions左の `Input test` スイッチ → 浮動ウィンドウ エリアでスクロール | 24000×24000 px の有限グリッドが移動。座標と最新ブラウザ入力Δを表示。上下・左右のcheckboxをOFFにすると当該軸の現在スクロール位置を固定し、エリア内wheelは親ページへ伝播しない。`Center`は中央へ戻す                                                                                                                                                                                                                      | ブラウザ画面内のみ、保存なし。wheel deltaModeはpixel/line/page別に換算                                                                                                                                                        | S5       |
| TRACK-014 | エリアを左クリック → マウス移動 → Escape/左クリック/右クリック                   | Pointer Lock対応環境ではキャプチャ表示と仮想マーカーの移動、Escape・左/右クリックで解除。エリア外クリックで開始しない。未対応/拒否はalert、スクロールテストは継続                                                                                                                                                                                                                                                       | 実機の設定を書込まず、browser inputのみ。マーカーは有限領域内に制限。processor切替/unmountでキャプチャを解除                                                                                                                  | S5       |
| TRACK-015 | 対応processorのタブを開く                                                        | 通知を自動で有効化し、成功後、慣性停止/動作/Fast inputを文字と枠色で表示し、停止理由を表示。別processor/driver/タブへ離れると通知OFF。手動OFFボタンなし                                                                                                                                                                                                                                                                 | 診断通知のセッション設定。実際の通知だけを表示し、wheelから慣性を推定・生成しない。ブラウザ入力は全ポインティングデバイスから来るため選択processor専用測定ではない                                                            | S2/S5    |
| TRACK-016 | 新しい設定をVersionsでcapture/restore                                            | 慣性設定もdiff/restoreの対象。旧snapshotは慣性を変更せず、旧processorへ慣性restoreを送らない                                                                                                                                                                                                                                                                                                                            | 履歴はブラウザ、restoreはfirmware PERSIST。状態通知・capture・スクロール位置は履歴対象外                                                                                                                                      | S1/S2/S5 |

| TRACK-017 | 慣性カードのグラフを見る | 3.2秒で頂点となり5秒で途中停止する固定放物線入力（20ms周期、スケーリング前の最大40）と、同じ入力に対する通常慣性/Fast inputの合計出力を0–15秒で表示。紫は想定実入力、青実線はFast無効の通常出力、橙破線は設定したFastしきい値/倍率での出力。縦軸は20msあたりの入出力量。表示は慣性整数出力を200ms区間平均して直線で結び、入力は非量子化の二次曲線。5秒の入力停止は垂直に描き、平均でぼかさない。両モードONを仮定。Fastしきい値0ではON操作と同じceil(max(入力閾値×1.5,20))（上限65535）をプレビューだけに使用し、デバイス設定は変更しない。倍率100%かFastしきい値未到達では2線が一致し得る。リアルタイム値は表示しない | 一方向・active layer・既定64測定窓分割/66バケット・同時刻の入力を出力より先に処理する固定シミュレーション。#28のQ16整数測定、整数出力、端数繰越、入力区間の減衰スキップ、出力後減衰、通常上限、Fast発動/継続、停止条件を移植。15秒以降の継続出力は省略する。Kconfig差・実機スケジューラー・逆方向/軸/layer変化は対象外。デバイスRPC/保存なし | S5/S6 |
| TRACK-018 | Input testを開く/ドラッグ/閉じる | ヘッダーでドラッグ可能。×で閉じ、ページ右上Versions左のStreamと同じ枠付きラベル＋スイッチで開閉。×で閉じたときもスイッチはOFF。左に上下入力の時間を縦軸にしたリアルタイムグラフ、下に左右入力の時間を横軸にしたリアルタイムグラフ。直近10秒・最大1000点をブラウザ入力は紫、通知で慣性中は青、Fast中は橙に分類 | 閉じる/他タブ・driverへ離れるとキャプチャ解除。通知はウィンドウ開閉と独立して対象processorタブの間維持。ブラウザのみ、永続化なし | S5 |

## 代表ユーザーフロー

### F1: processor tuning（TRACK-001/002/003/007）

1. 接続して Trackball を開き、processor 名、layer grid、初期 scaling/rotation を記録する。
2. scaling を `+` で一段変更して debounce 完了を待ち、Reload 後の表示を比較する。
3. Rotation を ON、適当な degree にしてから OFF にし、表示が 0° になることを確認する。
4. X/Y/scroll/swap は一つずつ変え、対象外 toggle が変化しないことを比較して元へ戻す。

### F2: layer / axis boundary（TRACK-004/005/006）

1. All → Specific で一つの layer を選び、grid と selected processor の範囲を記録する。
2. Temporary Layer を ON、target と delay を変更する。keymap layer 0/最終 layer で選択肢を確認する。
3. Axis snap を ON/OFF、mode X/Y、threshold と timeout の最小/最大 UI 値で試す。firmware の有効範囲は RPC error と Reload で確認する。

### F3: PMW3610 availability（TRACK-008）

1. PMW3610 Drivers の `Reload`。unavailable、loading、`No pmw3610 driver settings...`、section list を区別して記録する。
2. section を選び、dirty dot と custom setting の保存/取消を該当 module の実装で確認する。ここでは flash 成功を推定しない。

### F4: 慣性・有限エリア（TRACK-011–016）

1. Demoの初期値（enable OFF、window 200、interval 20、threshold 10、decay 8、limit 0、fast threshold 0、fast output 200）を記録する。intervalを変更 → debounce完了 → ページのReloadで読戻し → 元値へ復帰 → Reloadで確認する。
2. inertia OFFでもFast値を編集できることを確認する。旧deviceでは未対応案内と既存Scaling編集が使え、通知RPCを送らない。
3. エリア内の左右/上下scrollを試し、各checkbox OFF後に当該軸が固定されることを確認する。再度ON、Centerで中央に戻し、端までscrollして有限な端で停止する。
4. 左クリック→キャプチャ→移動Δ/マーカー→Escape解除。未対応のブラウザでは具体的なalertを記録しcapture成功としない。
5. タブを開く→実機の慣性/Fast input発動と逆方向停止→表示を比較し別タブへ離れて通知OFFを確認。Demoは設定読戻しまでで、物理入力による状態通知は生成しない。

### F5: 固定シミュレーションとリアルタイム表示（TRACK-017/018）

1. 慣性カードでは想定入力が0から放物線で増減し、まだ正の値がある5秒で突然0になり、合計出力の尾が続くことを確認。ブラウザを動かしても固定グラフは変わらない。
2. decay 0/100、通常出力上限、Fastしきい値0/有効、intervalを変更し、保存後に固定グラフだけが設定に応じて変わることを確認。Fastしきい値0でも、ON操作と同じしきい値でFastの比較線が出ることを確認（倍率200%、しきい値到達条件）。倍率100%や未到達なら一致し得る。元の値へ復帰しページReloadで確認。
3. Input testをONにしてキャプチャ/移動すると、floating内の左右/上下グラフだけが流れる。×で閉じ、表示スイッチOFFを確認する。通知購読は別タブへ移動するまで維持される。

## 不変条件

- TRACK-I01: processor 切替時に前 processor の pending debounce を新 processor に送らない。切替前後の ID/値を比較する（S1）。
- TRACK-I02: activeLayers 0 は「layer 0 だけ」ではなく All layers（S1 `LayerGrid`）。
- TRACK-I03: scale の divisor 0 で UI が Infinity/NaN を表示しない（S1/S2）。
- TRACK-I04: PMW3610 custom settings が無い時に unrelated custom subsystem をこの page に出さない（S1）。

## エラーと復帰

- input processor `error` は red alert。RPC error は optimistic display の後でも起こり得るので `Reload processors` で current notification を確認する（S1/S2）。
- PMW3610 custom settings は unavailable/no section/loading/error を別表示にする。driver write の失敗復帰は S4 の契約で、Trackball 固有に保証しない。
- `Versions` restore 中は busy/disabled。restore failure と device partial state の UX は version history の未検証事項。

## 探索の観点

1. debounce 中の processor 切替、Reload、tab 往復、接続切断。
2. scaling 0.01/10、rotation -180/180、All/Specific、32 layer 境界。
3. 全座標 switch の組合せと axis snap を同時に変更した時の表示/RPC 順序。
4. processor 0 件、複数 processor、custom setting 0/複数 section、狭い表示。
5. mobile dropdown が Reload / Versions と同じ高さ・同じ行に収まり、processor / driver 切替後に直下の detail と二段 trigger 表示が一致するか。driver の未保存 dot が menu と trigger に残るか。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

- #28 firmwareの物理入力による慣性/Fast input通知、USB/BLE実機での設定読戻し、Pointer Lockの全ブラウザ対応は別途検証。Demoは物理慣性をシミュレーションしない。
- processor RPC の power-cycle persistence、sensor の物理的 tracking 品質、custom settings の flash 境界、遅延 failure rollback は未検証。
