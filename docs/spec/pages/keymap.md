# キーマップ

## 範囲・根拠

入口: `/keymap` または `Keymap` タブ。接続前はアプリの接続画面を表示する。コード確認: 2026-09-20、`db09841`。以下はコード根拠の仕様であり、全状態の UI 検証済みを意味しない。実測結果は PR 等の検証報告で条件と範囲を分ける。

共通契約: [binding editor](../modules/binding-editor.md)。モード固有の終了/適用条件、検索、modifier はこのモジュール仕様を参照する。

子仕様: [rotary encoder](keymap-sensors.md)。キー編集と sensor 設定では適用・保存の経路が異なる。

| 根拠 | ソースと symbol                                                                                                                                                                                             |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| S1   | [KeymapPage](../../../src/pages/KeymapPage.tsx): `handleBindingSelect`, `closeSelector`, layer handlers, JSX                                                                                                |
| S2   | [useKeymap](../../../src/hooks/useKeymap.ts): `setBinding`, `saveChanges`, `discardChanges`, `resetToDefault`, `loadKeymapData`                                                                             |
| S3   | [KeycodeSelector](../../../src/components/KeycodeSelector.tsx): `handleBehaviorSelect`, `handleParam1Change`, `handleOpenChange`, presentation                                                              |
| S4   | [page tests](../../../src/pages/__tests__/KeymapPage.test.tsx): floating editing, reset menu, layers, lock tests                                                                                            |
| S5   | [PhysicalKey](../../../src/components/PhysicalKey.tsx), [KeyboardLayout](../../../src/components/KeyboardLayout.tsx): key tooltip/reset affordances                                                         |
| S6   | [history hook](../../../src/hooks/versionHistory/useKeymapVersionHistory.ts), [ResetVersionMenu](../../../src/components/versionHistory/ResetVersionMenu.tsx)                                               |
| S7   | [useRuntimeCombo](../../../src/hooks/useRuntimeCombo.ts)、[useComboEditor](../../../src/components/macroCombo/useComboEditor.ts)、[ComboEditorCard](../../../src/components/macroCombo/ComboEditorCard.tsx) | combo の読込・編集・RAM/flash 保存 |
| S8   | [comboPreview](../../../src/components/comboPreview.ts)、S5                                                                                                                                                 | combo の隣接判定・preview・tooltip |

## 機能要求

| ID     | できるべきこと                                                                  | 出典・確度                                                         |
| ------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| KM-R01 | レイヤーと物理位置を識別して目的のキーの binding を変更できる                   | S1/S2 から推定                                                     |
| KM-R02 | 未保存と保存済みを見分け、保存・破棄・初期状態への復帰を意図して選べる          | S1/S2 から推定                                                     |
| KM-R03 | 連続編集で別キーへの誤適用や意図しないレイヤー移動を起こさない                  | S1/S4 から推定                                                     |
| KM-R04 | editor 内でも layer、0始まりの物理位置、開始時 binding を確認できる             | [#211](https://github.com/cormoran/dya-studio/issues/211) 明示要求 |
| KM-R05 | Keymap で combo の一覧・追加・編集を行い、preview 上で combo と割当を識別できる | 2026-09-23 ユーザー明示要求                                        |

## 前提・状態

- Demo はトップの `Try Demo Mode` → `Keymap`。表示される layer 名、キー数、初期 binding を観測して記録する。初期値を固定して探さない。
- 位置の表記を混同しない。preview と selector header の key position は 0 始まり。キーボード上の文字が同じでも position で区別する。
- selector の header は `layer · Key position 0: binding` のように、preview と同じ0始まりの位置と、開いた時点の binding を示す。floating の右側には選択中 behavior の説明を表示する。
- loading: 進行ラベルを表示。キーが先に見えても背景の behavior/layer 読込が終わるまで待つ。Reload は読込中無効。
- ready: layer ボタン群と keyboard preview。dirty: `Unsaved changes`、Save 有効。保存済みは `Saved`（初期値から変更された保存済み binding は別の色/tooltip）。
- locked: Save/Reset に代えて `Locked`。閲覧/Reload は可能。編集は共有 unlock prompt を経由する。Demo で任意の lock/RPC failure を起こす UI は未確認。
- unsupported: Stream は対応時のみ。物理 layout の select は複数 layout 時のみ。sensor rotation 非対応は警告と導入リンク。空の keymap/geometry は主コンテンツ条件から外れる（専用 empty 表示は未確認）。
- combo subsystem があるときだけ sensor 設定の下に `Combos` card を表示する。keymap の全読込後に combo を読込む。未対応時は card と preview の combo 表示を出さない。combo の RAM 編集は keymap binding と別だが、Keymap header の Save/Discard/Reset が両方の保存・復帰境界になる（S1/S7）。

## 現行の機能仕様

KM-017: ページ全体の横スクロール防止と主要操作の狭幅表示は[共通画面 SHELL-009/010/011](../modules/app-shell.md)、floating editor のviewport内配置は[binding editor BIND-011](../modules/binding-editor.md)に従う。モバイルでもlayer切替列とプレビューの個別横スクロールを保持し、bindingの座標・保存契約は変更しない（S1/S5、2026-09-20ユーザー要求）。

| ID     | 前提 → 操作                                                  | 観測できる結果                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 保存範囲・副作用                                                                                                                                                                                                 | 根拠                                                                                        |
| ------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| KM-001 | layer ボタンを選ぶ                                           | 押下状態と preview の layer が変わり、開いていた selector は閉じる                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 選択だけでは binding を書かない                                                                                                                                                                                  | S1                                                                                          |
| KM-002 | preview のキーをクリック、behavior と必要な parameter を選ぶ | modal が開く。初期は `Close on select` ON で最後の parameter 選択時に適用・閉じる                                                                                                                                                                                                                                                                                                                                                                                                                                                  | binding をデバイス RAM に書く。Save は別操作                                                                                                                                                                     | S1/S2/S3                                                                                    |
| KM-003 | modal の `Floating mode` / floating の `Dialog mode`         | 同じ編集対象で表示形式を切替。切替そのものでは binding を適用しない                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `keymapSelectorMode` を localStorage に保存                                                                                                                                                                      | S1/S4                                                                                       |
| KM-004 | floating で binding 適用、`Auto advance` ON                  | 成功したら物理位置の次キーへ。最後のキーでは閉じる。別 layer に巡回しない                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 初期 ON。設定は `keymapAutoAdvance` に保存                                                                                                                                                                       | S1/S4                                                                                       |
| KM-005 | `Auto advance` OFF で適用、または Previous/Next key          | OFF なら成功後も同じキー。矢印は適用せず移動。先頭の Previous / 末尾の Next は無効                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 選択移動のみでは書込みなし                                                                                                                                                                                       | S1/S4                                                                                       |
| KM-006 | selector で Escape / Close、layer / tab / connection 切替    | floating の `Close without applying unfinished edits` / Escape は未適用 draft を破棄。modal の `Apply changes and close` / Escape / 外側クリックは変更済み draft を適用して閉じる。開始値のまま modal を閉じても書込み/dirty は増やさない。親による layer/tab/connection 切替は selector を閉じる                                                                                                                                                                                                                                  | modal の取消は Revert で開始値へ戻してから閉じる。既適用 RAM を破棄するには Discard                                                                                                                              | S1/S3 handleOpenChange                                                                      |
| KM-007 | keymap または combo が dirty → header Save                   | 成功後 `Saved`、Save 無効、未保存 highlight が解消。Combos card 自身に Save はない                                                                                                                                                                                                                                                                                                                                                                                                                                                 | keymap と combo の queued RAM 編集を flush し、それぞれデバイス flash へ保存。Demo は実 flash の検証ではない                                                                                                     | S1/S2/S7、2026-09-24ユーザー要求                                                            |
| KM-008 | keymap または combo が dirty → Reset → Discard               | native confirm。キャンセルは変更なし。承認で keymap と combo の保存値を再取得                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 両方の RAM 未保存編集を破棄。Combos card 自身に Discard はない                                                                                                                                                   | S1/S2/S7、2026-09-24ユーザー要求                                                            |
| KM-009 | Reload                                                       | device の現在値を再取得。RAM に残る未保存編集は破棄しない                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 保存操作ではない                                                                                                                                                                                                 | S1/S2                                                                                       |
| KM-010 | Reset → Reset to initial state                               | fast-keymap 非対応では無効。対応時は `Reset to default keymap?` 確認に key binding と runtime combo の reset 対象を箇条書きし、Cancel は変更なし                                                                                                                                                                                                                                                                                                                                                                                   | 承認で現在の active layers の取得済み default binding と各 runtime combo を初期値へ戻して flash に保存。全設定の factory reset ではない                                                                          | S1/S2/S7、2026-09-24ユーザー要求                                                            |
| KM-011 | layer の up/down, Add, Delete, Restore                       | 先頭 up/末尾 down 無効。追加は新 layer 選択。最後の 1 layer は削除不可。削除に confirm。Restore は削除済み ID を選択して末尾復元、全復元は ID 順                                                                                                                                                                                                                                                                                                                                                                                   | デバイス layer 操作。未保存/保存表示も観測する                                                                                                                                                                   | S1/S2                                                                                       |
| KM-012 | Rename layer → 入力 → Rename / Enter                         | 現在名で開く、max length は device 値。Escape/Cancel は閉じる                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | デバイス layer 名更新。失敗時も dialog を閉じる経路がある                                                                                                                                                        | S1 handleRenameConfirm/S2                                                                   |
| KM-013 | OS Layout を変更                                             | preview/selector の表示ラベルが変わる                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | ブラウザ設定。OS 設定/firmware mapping は変更しない                                                                                                                                                              | S1                                                                                          |
| KM-014 | Physical Layout を変更（複数時）                             | active physical layout と keymap を更新、selector は閉じる                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | device RPC。geometry は必要時取得                                                                                                                                                                                | S1/S2 setActiveLayout                                                                       |
| KM-015 | Stream を ON、別タブへ移動                                   | device 入力の highlight と active layer 追従。離れると stream OFF                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | firmware 入力が必要。ブラウザ key overlay と device stream は別                                                                                                                                                  | S1                                                                                          |
| KM-016 | Reset の保存版を選ぶ                                         | diff を確認してから復元                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | IndexedDB の履歴。メニュー選択だけでは device を書き換えない                                                                                                                                                     | S6                                                                                          |
| KM-018 | 639px以下で保存操作列の右端にある `Keymap settings` を開く   | viewport全体のmodalを表示。`Layer editing` の現在layerは横並びボタン、並べ替え・名前変更・追加・削除はtooltip付きのアイコン1行で表示する。削除済みlayerは先頭3件をボタン表示し、残りを `Other` menu（内部scroll）へ格納する。`Layout and display` に物理配列（複数時）・OS配列・Stream（対応時）を表示。元ページではこれらの管理操作を隠す。layer切替列は元ページに残す                                                                                                                                                            | 各操作の保存先と即時適用条件はKM-011〜015と同じ。Close/Escapeはmodalを閉じるだけで、すでに適用した設定を戻さない。640px以上は従来配置                                                                            | S1、2026-09-20ユーザー要求                                                                  |
| KM-019 | preview のキーを開く、mode/次キーを切替                      | modal/floating のheaderが `layer · Key position {{0始まり}}: {{開始時 binding}}` を示す。mode/次キーで選択が変われば現在対象へ更新する。floating の重複する `Layer · Key N / count` は表示せず、選択中 behavior の説明を示す                                                                                                                                                                                                                                                                                                       | 表示だけでは binding を適用しない。既存の選択・順序・適用契約は変わらない                                                                                                                                        | S1/S3/S4、[#211](https://github.com/cormoran/dya-studio/issues/211)、2026-09-23ユーザー要求 |
| KM-020 | `Combos` card の横並び item / `New combo` を選ぶ             | 各 item は link icon と slot順の 1 始まり番号、name、positions、レイヤー名を列挙する独立行、割当を示す。item は 14rem を基準にカードの空き幅まで伸び、収まらない item は次行へ折り返す。RAM にのみ反映され flash 未保存の item は key switch と同じ緑の背景・文字・`Unsaved` dot を示す。保存済みで既定値と異なる item は青 dot、既定 item は dot なし。既存 item は `Combo Editor` modal を開く。+ は空 slot に既定 combo を RAM 作成して modal を開く。空きがなければ拒否を表示する。Escape/外側クリック/Close は modal を閉じる | editor の有効 draft は既存の [COMBO-001〜003](macro-combo.md) と同じ RAM 自動書込。閉じるだけでは巻き戻さない。スロット単位の未保存表示は、この画面で成功した RAM 書込みを追跡し、header Save/Discard で解除する | S1/S7、2026-09-24ユーザー要求                                                               |
| KM-021 | preview の combo 表示を確認する                              | 有効で現在 layer 対象の combo のうち、辺で隣接する２キーは境界中央に通常背景の0.5U四方の不透明な combo button（番号なし）を重ねて表示する。中央には combo の割当ラベルを表示し、小型 link icon は左上に絶対配置してラベルと干渉させない。hover/focus でも背景は不透明のまま、combo 名と割当の tooltip を表示する。その他は対象キー上部に link icon と slot順の 1 始まり番号を表示し、対象キー tooltip の key binding の下に combo 名と割当を表示する。無効/他 layer の combo は出さない                                            | button/badge/tooltip の閲覧だけでは書き込まない                                                                                                                                                                  | S5/S8、2026-09-24ユーザー要求                                                               |
| KM-022 | preview 内の combo control を選び、behavior を変更する       | 対象 combo の `KeycodeSelector` が Combo Editor より前面に開き、`Floating mode` / `Dialog mode` で表示形式を切替できる。combo と通常キーの selector は同じ floating anchor に表示し、どちらかを開くともう一方は閉じる。適用した割当が preview/card に反映される。通常の key binding は変更しない                                                                                                                                                                                                                                   | combo RAM に書く。header Save で combo flash 保存。header Discard で combo の保存済み値へ復元                                                                                                                    | S1/S7/S8、2026-09-24ユーザー要求                                                            |

## 代表ユーザーフロー

削除済みlayerの復元メニューもviewport端から8px以上を確保し、高さを超える項目はメニュー内で縦スクロールする。外側タップ/Escapeで閉じ、項目選択まで復元を実行しない（KM-011/017、S1のPopover）。

### F1: 単一キーの変更と保存（KM-002/007/009）

1. Demo → Keymap。layer 名、先頭キーの label と tooltip の binding、`Saved` 状態を記録。
2. 先頭キーをクリック。既存の behavior が key press なら、元と異なるキーを selector の keyboard から選ぶ。必要なら behavior を key press に変更し、parameter のキーを選ぶ。表示された実ラベルを報告に書く。
3. selector が閉じ、対象キーの表示と `Unsaved changes` を確認。別位置のキーが変わっていないことも比較。
4. Save → `Saved`、Save 無効を確認。Reload → 選んだ binding が維持されることを確認。
5. 元 binding に戻して Save。初期値が不明なら勝手に reset せず残存状態を記録。

### F2: 連続編集の境界（KM-003/004/005/006）

1. キーを開き `Floating mode`。header の対象 `Key position` と behavior 説明を記録。
2. Auto advance の押下状態を確認し ON にする。異なる binding を選ぶ → `Key position` が次へ進み、selector は開いたまま。
3. OFF にして別 binding を選ぶ → `Key position` が変わらない。Next → 次の `Key position`（binding は適用しない）。
4. preview の最後のキーを選び、Next 無効を確認。ON で適用 → selector が閉じ、layer は変わらない。
5. 再度開いて mode を往復し、floating の状態で Escape → 未適用値が書かれていないことを確認。modal の Close/Escape は適用して閉じるため取消として使わない。編集は Reset → Discard で破棄し、元の mode/auto advance を復帰。

### F3: layer と取消（KM-001/008/010/011/012）

1. 先頭 layer の up 無効を確認。Rename を開き仮名を入力、Cancel → 元の名前。
2. binding を変更、Reset → Discard の confirm をキャンセル → dirty のまま。再度 Discard を承認 → 保存値。
3. 対応していれば Reset to initial state の確認を開く。警告を読み Cancel → keymap 不変。実機では承認しない。
4. 別 layer を選んで戻り、正しい選択と binding を確認。

### F4: モバイル設定の集約（KM-011〜015/018）

1. 639px以下で Keymap を開き、layer切替列は見えるが、layer管理ボタン・物理配列・OS配列・Stream switch は元ページに表示されないことを確認する。
2. 保存操作列の右端にある `Keymap settings` を押す。全画面modalに `Layer editing` と `Layout and display` が表示され、Closeに到達できることを確認する。
3. `Current layer` を別layerへ変更し、並べ替えの端の無効状態と、名前変更のCancelを確認する。削除や復元を実行する場合はF3と同じ復帰手順を使う。
4. 複数の物理配列がある場合は別配列へ変更してpreviewとの同期を確認する。OS配列を変更し、閉じて再度開いた後も選択が維持されることを確認してから初期値へ戻す。
5. Stream対応時はmodal内でON/OFFできることを確認する。CloseまたはEscapeでmodalを閉じても選択済みの設定は巻き戻らず、triggerへfocusが戻ることを確認する。

### F5: combo 表示・編集（KM-020〜022）

1. combo 対応の Demo/実機で Keymap を開き、`Combos` card と既存 item を確認する。対応しない場合はここで未実施と記録する。
2. 隣接２キーと離れた/3キー以上の combo がある場合、前者の0.5U・不透明な通常背景 button の中央に割当ラベル、左上に小型 icon があり、両者が干渉しないことを確認する。hover/focus しても下のキーが透けず、combo 名・割当の tooltip が出ることを確認し、後者は対象キー tooltip の binding の下にある名前・割当を確認する。card の icon 番号・positions・レイヤー名の独立行と比較する。card 幅を超える item が次行に折り返すことも確認する。ない場合は作成後に確認する。
3. item を開き、Behavior を選ぶ。selector が Combo Editor の前面に表示されることを確認し、名前・位置・割当のいずれかを編集する。対応する item が緑の背景・文字・`Unsaved` dot になり、header Save 後に緑表示が消えることを確認する。modal を閉じても RAM 変更が残ること、header Save 後に Refresh/タブ往復で残ることを確認する。実機の電源断後は別途確認する。
4. preview の combo control から `Floating mode` を開く。通常キーを開くと combo selector が閉じ、再び combo control を開くと通常キー selector が閉じ、同じ位置に一つだけ表示されることを確認する。`Dialog mode` を往復しても同じ combo を編集し続けること、通常キーの binding が変わらないことを確認する。header Reset の確認に keymap と combo の対象が列挙されることを確認してCancelし、元値に戻して Save、または header Discard で復元する。

## 不変条件

- KM-I01: 別の layer/position に binding を誤適用しない。前後 2 キーと別 layer を比較（KM-R01、S1）。
- KM-I02: floating の失敗時は選択を進めない。先行 RPC 完了で後から選んだキーを移動させない。二重適用を抑止する（S1 applyingBindingRef/selectionRevision、S4）。通常 Demo の即時応答だけでは検証できない。
- KM-I03: mode 切替・矢印・floating の Escape だけで draft を書き込まない（S4）。modal は変更済み draft を Close/Escape で適用するが、無変更 Close/Escape では書き込まない（S3 handleOpenChange）。
- KM-I04: OS Layout の変更だけで device binding を変更しない（S1 の説明、表示用 context）。
- KM-I05: editor header の layer/position/binding は現在選択中のキーと一致し、同じ binding の別キーを区別できる（KM-R04/KM-019）。
- KM-I06: combo preview の対象と editor slot は一致し、非隣接 badge はキー binding のクリック対象を奪わない。combo の番号は card と preview で同じ slot順の 1 始まり、header Save/Discard は keymap と combo のどちらかが dirty なら両方を扱う（KM-007/008/020〜022）。

## エラーと復帰

- RPC/保存失敗: keymap の `role=alert`、floating 内にも error。S2 の通常エラーは約 5 秒で消去、成功 RPC でも消去。消えたことを成功と解釈しない。値・dirty 状態を再確認し、再試行/Reload で確認。
- floating の適用失敗は開いたまま同じキーを保持。modal は S3 が `onSelect` 後に直ちに閉じる経路があり、失敗しても開いたままとは保証しない。
- Rename は hook の boolean 成否を待って判定せず閉じる。入力保持を保証しない。不具合として受け入れた根拠はなく未解決。
- Reset default は途中失敗なら未保存の部分変更が残り得る。成功と表示されなければ Reload で現状確認、必要なら Discard。原子的 rollback を保証しない。
- physical module preview 読込失敗は黄色の警告。Stream error は別 alert、Dismiss で消せる。実機/RPC error 注入は今回の通常 Demo 手順外。
- combo RPC error は `Combos` card の alert に表示する。無効 draft は editor の validation error に表示して書かず、修正して header Save を再試行できる。keymap reset と combo reset/save は transaction ではないので、途中失敗時は部分変更を想定して Reload と dirty/alert を確認する（S7）。

## 探索の観点

1. modal/floating を繰り返し切替し、選択・draft・保存を混同しないか。
2. 先頭/末尾、auto advance ON/OFF、別 layer への切替の組合せ。
3. dirty のまま tab 往復・Reload、Save 後の再読込との違い。
4. Rename の空文字/上限、取消、layer 並替後の position。
5. 狭い viewport でページ全体が横スクロールせず、プレビュー内部だけを横に動かせるか。floating の左右toolbar・閉じる操作に到達できるか（KM-017、BIND-011）。
6. 639px境界の前後で管理操作が二重表示・全消失しないか。モバイルmodalでlayerボタン・アイコン操作のtooltip・削除済みlayer先頭3件と `Other` menu・Closeへ到達でき、削除済みlayer数が増えても復元欄が2行を超えて伸びないか（KM-018）。
7. 横/縦の隣接、離れた２キー、３キー以上、回転キー、layer mask、disabled combo、長い割当で preview が重ならず操作できるか（KM-021/022）。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

実機 flash 永続化、lock と失敗後復帰、遅延競合、sensor rotation の詳細、履歴復元の詳細は通常 Demo のキーマップ pilot で未検証。combo preview の全配置・実機 persistence は未検証。共有 selector / history / connection の詳細はモジュール仕様の展開時にリンクする。Rename 失敗後の dialog 閉鎖と default reset の部分変更はコード上の注意点で、承認済み不具合ではない。
