# キーマップ: rotary encoder

## 範囲・根拠

親: [キーマップ](keymap.md)。入口 `/keymap` の preview 下 `Rotary Encoder Configuration`。共通入力は [binding editor](../modules/binding-editor.md)。コード確認 2026-09-20 `db09841`、UI 未検証。

| 根拠 | ソース / symbol                                                                                                             |
| ---- | --------------------------------------------------------------------------------------------------------------------------- |
| S1   | [SensorRotationConfig](../../../src/components/SensorRotationConfig.tsx): `handleBindingSelect`, `handleTapTimeChange`, JSX |
| S2   | [useRuntimeSensorRotate](../../../src/hooks/useRuntimeSensorRotate.ts): `setLayerCwBindings`, `setLayerCcwBindings`         |
| S3   | [component tests](../../../src/components/__tests__/SensorRotationConfig.test.tsx)                                          |

## 機能要求

| ID      | できるべきこと                                                                  | 出典・確度                                                         |
| ------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| ROT-R01 | 選択中 layer の sensor ごとに時計/反時計方向の binding と tap time を変更できる | S1/S2 から推定                                                     |
| ROT-R02 | 同じ値の複数 sensor 操作でも、sensor、layer、方向を名前から識別できる           | [#212](https://github.com/cormoran/dya-studio/issues/212) 明示要求 |

## 前提・状態

runtime sensor rotation 対応 device と current layer が必要。非対応は親で警告、対応かつ sensor 0 件では section 内のカードが空。sensor ごとに ID/name と選択 layer を名前に持つ fieldset 内で 2 方向を表示し、各 binding button と tap time input も sensor/layer/方向を含む accessible name を持つ。初期読込は全 sensor の layer bindings を取得。未接続は親の接続 gate。独立した Save/dirty 状態はない。UI は選択時リアルタイム保存と説明するが、flash 永続化の firmware 契約はこの frontend だけでは断定しない。

## 現行の機能仕様

| ID      | 前提 → 操作                                               | 観測できる結果                                                                                                                                                                   | 保存範囲・副作用                                                                    | 根拠                     |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------ |
| ROT-001 | 対象 sensor の clockwise/counter-clockwise binding を選択 | modal で behavior を編集。成功応答ならその方向の表示を更新、反対方向は保持                                                                                                       | sensor index + selected layer ID + binding を即 RPC。キーの Save と同一と仮定しない | S1/S2                    |
| ROT-002 | Tap time を変更                                           | 入力値と `pending to save...`、最後の変更から 1500ms 後に存在する両方向の tapMs を書込                                                                                           | 方向ごとに順次 RPC。HTML min=1, step=5、handler は Number 値を受ける                | S1 handleTapTimeChange   |
| ROT-003 | binding が未設定/ID=0                                     | `Trans` 表示。未知 behavior は `Behavior <id>`                                                                                                                                   | 表示 fallback                                                                       | S1 getBindingDisplayName |
| ROT-004 | tap time が短い                                           | scroll/mouse move は trigger period（説明中 default 16ms）より長くする注意を表示する条件あり                                                                                     | 注意表示は入力の拒否ではない                                                        | S1 JSX                   |
| ROT-005 | 複数 sensor / 同じ binding 値                             | card は sensor name/ID と selected layer の named fieldset。方向 button はその sensor/layer/direction/binding、tap time input は sensor/layer/tap time の accessible name を持つ | 命名だけでは RPC / 値を変更しない                                                   | S1/S3/ROT-R02            |

## 代表ユーザーフロー

1. Demo → Keymap、section と sensor 名、選択 layer、両方向と tap time の元値を記録。複数 card があれば group と各操作名から sensor/layer/direction を区別できることを確認（ROT-005）。
2. clockwise を開き別 keypress を選択。戻ったカードの時計方向のみ変更を確認（ROT-001）。
3. 元 binding に戻す。tap time を元値+5 にし pending 表示の後で値を確認。別 layer に切替し、別 layer の値まで変わっていないことを確認（ROT-002）。
4. 元 layer に戻り元 tap time を入力、pending が終わるまで待つ。実機では必要な操作範囲を合意してから実行。

## 不変条件

- ROT-I01: sensor/方向/layer の異なる設定を誤って変更しない（ROT-R01）。基準値を 2 方向・2 layer で比較する。
- ROT-I02: UI の pending 消失だけを device/flash 保存成功と判断しない。後述の失敗時挙動がある。
- ROT-I03: 同じ binding 値や tap time を持つ sensor でも、操作の name と fieldset から対象 sensor/layer/direction を区別できる（ROT-R02/ROT-005）。

## エラーと復帰

S2 は非接続/未対応や RPC failure を error state に設定して false を返す。S1 の binding selector は失敗でも閉じるが、成功時のみ表示を更新する。tap time は方向別 setter の false を判定せずローカル表示を更新して pending を消す。S1 は hook.error を独自 alert に表示していないため、失敗が見えない可能性がある。未承認の不具合候補として扱う。再読込で device の値を確認し、部分成功時は両方向を確認して復帰する。通常 Demo の成功経路だけで検証済みにしない。

## 探索の観点

- debounce 完了前の layer 切替、連続入力、tab 往復。
- 1 / 0 / 空文字 / 負数の入力と実際の RPC 後表示。HTML min だけを validation 保証にしない。
- sensor 2 個の片方、両方向で異なる binding を保持したまま tap time 変更。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

実機の永続化時点、両方向の途中失敗、短い tap time の物理動作は未検証。error が画面に出ない可能性、debounce 中の layer 切替と復帰後表示の整合性を優先して確認する。
