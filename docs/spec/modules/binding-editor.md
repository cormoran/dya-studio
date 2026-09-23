# 共通 binding editor

## 範囲・根拠

利用者: [キーマップ](../pages/keymap.md)、sensor rotation、macro/combo、入力処理の binding 選択。コード確認 2026-09-20 `db09841`。UI 実測は validation の各 report を参照。

| 根拠 | ソース / symbol                                                                                                                                                        |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1   | [KeycodeSelector](../../../src/components/KeycodeSelector.tsx): `handleOpenChange`, `handleBehaviorSelect`, `handleParam1Change`, `handleParam2Change`, `handleRevert` |
| S2   | [KeycodeValueSelector](../../../src/components/KeycodeValueSelector.tsx): search, modifiers, viewMode                                                                  |
| S3   | [selector tests](../../../src/components/__tests__/KeycodeSelector.test.tsx)                                                                                           |
| S4   | [BehaviorDropdown](../../../src/components/BehaviorDropdown.tsx): behavior search, selected label, quick selects                                                       |
| S5   | [behavior dropdown tests](../../../src/components/__tests__/BehaviorDropdown.test.tsx)                                                                                 |

## 機能要求

| ID       | できるべきこと                                                                                            | 出典・確度                                                         |
| -------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| BIND-R01 | behavior とその parameter 型に応じた値を選択できる                                                        | S1/S2 から推定                                                     |
| BIND-R02 | 編集対象や presentation が変わっても、別対象の draft を誤って送らない                                     | S1/S3 から推定                                                     |
| BIND-R03 | editor の表示だけから、現在編集する caller 固有の対象を判定できる                                         | [#211](https://github.com/cormoran/dya-studio/issues/211) 明示要求 |
| BIND-R04 | 終了操作の accessible name と実際の適用/破棄を一致させ、無変更では callback を送らない                    | [#210](https://github.com/cormoran/dya-studio/issues/210) 明示要求 |
| BIND-R05 | Runtime Macro が使える keyboard で、登録済み macro を名前から直接キーへ割り当て、必要時は editor を開ける | 2026-09-23ユーザー要求                                             |

## 前提・状態

caller が open、currentBinding、behaviors、layers と onSelect を渡す。`targetLabel` は caller が持つ対象 ID（keymap の layer/position/binding、sensor の回転方向、macro step、combo 等）で、modal/floating の header に表示する。parameter 型で keycode、layer、数値等の入力が変わる。候補は device の behavior metadata と fallback に依存する。未接続/unsupported は caller の表示条件で制御し、この component 単独の接続画面はない。busy 時 fieldset 無効、error prop があると editor 内に alert。保存は caller の責務。

## 現行の機能仕様

BIND-011: floating editor は680pxを上限にviewport幅内へ収まり、狭幅でも左右のtoolbarへ到達できる。keyboard候補は内部で横スクロールし、検索結果はモバイルで2列、640px以上で4列、tabletで5列になる。表示幅によってmode・draft・device値を変更しない。各操作の長押し説明は[共通画面 SHELL-011](app-shell.md)に従う。根拠はS1/S2。ユーザーのモバイル最適化要求（2026-09-20）による。

BIND-012: behavior 検索inputは狭幅で16px以上のfont sizeを使い、モバイルブラウザのfocus時自動拡大を避ける。modalの選択済みbehavior名と説明は1行を維持し、利用可能幅を超える部分をellipsisで省略する。完全な文言はaccessible nameに保持する。根拠はS4/S5。ユーザーのモバイル最適化要求（2026-09-20）による。

BIND-013: caller が `targetLabel` を渡すと、modal/floating の header はその値を表示する。caller は keymap 固有の名前に制限されず、自身の layer/position/step/direction 等を表現できる。表示形式の切替や keymap の次キー移動では現在の target に更新され、target 表示だけでは binding を送らない。根拠はS1/S3、[#211](https://github.com/cormoran/dya-studio/issues/211) 明示要求。

BIND-016: modal/floating の parameter タブは、firmware が単一の名前を定義していればその名前を表示し、複数の名前がある場合は `param1` / `param2` に戻す。タブ列の右側には現在選択中の parameter の説明を一つだけ表示し、param1/param2 を切り替えると更新する。標準 behavior は操作の意味（例: Layer-Tap の layer は「長押し中のレイヤー」）、それ以外は parameter 型に応じた選択案内を表示する。modal の `Parameters` 見出しには説明を重複表示しない。根拠はS1/S3、2026-09-23ユーザー要求。

BIND-017: floating の header は選択中 behavior の説明を表示する。behavior を変更すれば説明も更新される。操作アイコン群（caller の toolbar、Revert、Close）は右端にまとめる。modal は behavior dropdown の選択表示で説明を示す。説明を持たない未知の behavior には説明を追加しない。根拠はS1/S4、2026-09-23ユーザー要求。

BIND-018: keycode selector は開くたびにキー配列表示から始める。配列下に「その他のキーは右上のカテゴリ別表示ボタンから選択できます」と案内し、右上の表示切替ボタンは通常色にする。修飾キー表示ボタンは選択中の修飾キー名を含めず、修飾キーが一つ以上選択されている場合だけ修飾キートグルと同じ紫で示す。behavior dropdown の「選択したカテゴリを維持」は未設定時 ON で、明示的に OFF にした設定は保持する。根拠はS2/S4/S3/S5、2026-09-23ユーザー要求。

BIND-019: `Runtime Macro`、`Trans`、`None` は behavior dropdown の `Key Press` category に表示する。keyboard が Runtime Macro behavior を公開し、登録済み macro が一つ以上ある場合は、各 macro を `Macro` category の個別項目として表示する。個別項目を選ぶと Runtime Macro behavior とその slot を `param1` にした binding を caller に渡す。Runtime Macro の param1 候補には `New macro` を置き、選ぶと caller が渡した macro editor を開く。parameter の下の `Edit macros` は active binding の `param1` slot を開く。`Create macro` が成功すると editor は閉じる。editor を閉じると caller は macro list を再読込し、param1 候補は最新の list を使う。根拠はS1/S4、2026-09-23ユーザー要求。

| ID       | 前提 → 操作                                                                                                        | 観測できる結果                                                                                                                                                                                                                                                          | 保存範囲・副作用                                                                                 | 根拠                       |
| -------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------- |
| BIND-001 | editor を開く / selectionKey 変更                                                                                  | currentBinding の behavior/param1/param2 を初期値とし param1 を選択                                                                                                                                                                                                     | draft を初期化                                                                                   | S1 handleOpenChange/effect |
| BIND-002 | behavior を変更                                                                                                    | 両 parameter を 0 に戻す。不要なら最終値扱い、必要なら該当入力を表示                                                                                                                                                                                                    | Close on select 有効時、parameter 不要 behavior は即 callback                                    | S1                         |
| BIND-003 | modal、Close on select ON で最後の parameter を選ぶ                                                                | callback 後閉じる。OFF なら draft に保持                                                                                                                                                                                                                                | `keycodeSelectorCloseOnSelect` localStorage。callback と flash 保存は別                          | S1                         |
| BIND-004 | modal の Apply changes and close / Escape / 外側クリック                                                           | draft が開始値と異なる時だけ callback に渡して閉じる。終了 button の accessible name/tooltip は `Apply changes and close`                                                                                                                                               | OFF でも変更済み draft は終了時に適用。開始値と同じなら callback を送らない                      | S1 handleOpenChange        |
| BIND-005 | floating の Close without applying unfinished edits / Escape                                                       | 未完 draft を適用せず閉じる。終了 button の accessible name/tooltip は `Close without applying unfinished edits`。外側クリックだけでは閉じない                                                                                                                          | 完了済み callback の変更は取り消さない                                                           | S1                         |
| BIND-006 | Revert                                                                                                             | 開いた時の値と param1 選択へ戻る                                                                                                                                                                                                                                        | component draft の復帰。device Discard ではない                                                  | S1 handleRevert            |
| BIND-007 | floating の数値 parameter を入力                                                                                   | 入力途中では送らず Enter で確定。2 parameter なら次の parameter へ                                                                                                                                                                                                      | caller に完成 binding を渡す                                                                     | S1 editingNumber           |
| BIND-008 | Search keycodes に入力、Clear search                                                                               | 空白以外の検索は category を越えて検索、クリアで通常表示へ                                                                                                                                                                                                              | UI のみ                                                                                          | S2                         |
| BIND-009 | layout/category 表示を切替                                                                                         | keyboard 表示と category 候補表示を切替。新しく開いた selector は常に keyboard 表示から開始                                                                                                                                                                             | 表示形式は editor 内だけで切替え、localStorage には保存しない                                    | S2/BIND-018                |
| BIND-010 | modifier を toggle → keycode 選択                                                                                  | modifier flags と base keycode を合成。toggle 自体は shouldNotClose を付けて draft 更新。修飾キー表示ボタンの色は選択の有無を示す                                                                                                                                       | Clear modifiers は shouldNotClose を付けないので確定を誘発し得る                                 | S2/BIND-018                |
| BIND-014 | caller が `targetLabel` を渡して editor を開く                                                                     | modal/floating の header で現在対象を読める。`selectionKey` により対象が変われば label も追従する                                                                                                                                                                       | 表示だけでは callback / device 書込みなし                                                        | S1/S3/BIND-013             |
| BIND-015 | modal を開始値のまま終了                                                                                           | `onClose` は呼ぶが `onSelect` callback は送らない                                                                                                                                                                                                                       | caller の RPC / dirty 状態を増やさない                                                           | S1/BIND-R04                |
| BIND-019 | Runtime Macro の param1 候補で `New macro` / `Edit macros` を選ぶ、または `Macro` category の登録済み macro を選ぶ | `New macro` は editor を開く。`Edit macros` は active binding の `param1` slot を editor に渡す。`Create macro` 成功時と Close 時は macro list を再読込し、param1 は最新の候補を表示する。登録済み macro を選ぶと Runtime Macro + 選んだ slot を完成 binding として扱う | editor を開く操作だけでは binding を送らない。個別 macro の選択は通常の parameter 完了規則に従う | S1/S4/BIND-R05             |

## 代表ユーザーフロー

1. Demo → Keymap → preview の任意キー。初期 binding を記録（BIND-001）。
2. modal で Close on select を OFF → Search keycodes で別キーを選択 → 開いたまま（BIND-003/008）。
3. Revert → 初期値 → Apply changes and close。初期 binding を再表示し、callback が増えないことを確認（BIND-006/004/015）。
4. 再度開き OFF で別キーを選択 → Escape → 選択値が適用される（BIND-004）。floating の Close/Escape は未完 draft を破棄する（BIND-005）。
5. caller の Discard または元 binding への変更で復帰し、Close on select を元に戻す。
6. Runtime Macro 対応時、`Key Press` 内の Runtime Macro を選び、param1 の `New macro` と `Edit macros` が editor を開くことを確認する。macro を作成して閉じ、param1 の候補にその名前があることを確認する。behavior dropdown の `Macro` category から同じ名前を選び、Runtime Macro と slot が選択されることを確認する（BIND-019）。

## 不変条件

- BIND-I01: 表示切替だけでは binding を送らない。caller の mode 切替前後で dirty/値比較（BIND-R02）。
- BIND-I02: 検索語の変更だけでは binding を送らない（S2）。
- BIND-I03: component を閉じたことだけを device 永続化成功と見なさない。caller の結果を確認（S1 callback 契約）。
- BIND-I04: target 表示は caller の target を示し、presentation 切替・次対象への移動で古い target を残さない（BIND-R03/BIND-013）。
- BIND-I05: modal の終了 button は適用、floating の終了 button は未完 draft の破棄を示す name を持ち、無変更終了だけでは caller callback を送らない（BIND-R04/BIND-015）。

## エラーと復帰

エラーは caller の error prop を表示するだけで通信 retry/rollback は行わない。modal は callback 成否を待たず閉じる経路を持つ。floating の成功後移動/失敗時保持はキーマップ caller の契約。別 consumer にそのまま当てはめない。localStorage 利用不能時の一部設定アクセスには try/catch がなく、回復は未保証。

## 探索の観点

- Close on select ON/OFF × modal/floating × Close/Escape を組合せる。
- 0/1/2 parameter behavior 間の切替で古い parameter が残らないか。
- 検索ゼロ件、クリア、modifier の toggle と clear の確定差。
- 数値編集中の Enter、別 key への移動、mode 切替。
- Runtime Macro subsystem がない場合、`Macro` category を表示しないこと。対応時の新規作成後、editor close 後の param1 list 更新と個別 macro shortcut を確認する（BIND-019）。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

behavior ごとの firmware validation、ストレージ拒否、全 consumer での失敗復帰は未検証。modifier clear が自動適用を誘発する挙動は現行実装の記録であり、望ましさの承認は確認していない。
