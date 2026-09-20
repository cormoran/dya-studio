# 共通画面・navigation・表示設定

## 範囲・根拠

全ページの consumer が共有する route、接続 gate、tab の保持、theme/language。コード確認 2026-09-20 `a8eeb6e`。UI 実測は validation report に分離。

| 根拠 | ソース / symbol                                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1   | [App](../../../src/App.tsx): `getTabs`, `AppRouter`, `AppContent`                                                                                |
| S2   | [useUrlTab](../../../src/hooks/useUrlTab.ts): pathname conversion / navigate                                                                     |
| S3   | [TabNavigation](../../../src/components/TabNavigation.tsx): visitedTabs / forceMount / TabActiveContext                                          |
| S4   | [AppLayout](../../../src/layouts/AppLayout.tsx): header / language / theme / disconnect                                                          |
| S5   | [ThemeContext](../../../src/contexts/ThemeContext.tsx), [LanguageContext](../../../src/contexts/LanguageContext.tsx): storage and initialization |
| S6   | [navigation tests](../../../src/components/__tests__/TabNavigation.test.tsx)                                                                     |

## 機能要求

| ID        | できるべきこと                                                           | 出典・確度        |
| --------- | ------------------------------------------------------------------------ | ----------------- |
| SHELL-R01 | route・tab・ブラウザ履歴が整合し、訪問済みページの編集を不用意に失わない | S1/S2/S3 から推定 |
| SHELL-R02 | 接続なしで説明資料を読み、接続中は device と編集画面を識別できる         | S1/S4 から推定    |

## 前提・状態

通常の tabs は接続中のみ。未接続は SplashScreen、再接続中は ReconnectingOverlay。Developer Guide は keyboard providers の外、Release Notes/OAuth callback は接続 gate より前に分岐する。Import/Export の登録は環境条件による。shell 自体に dirty/save はなく各ページの状態を保持する。読み込み/empty/error は各ページの責務。

## 現行の機能仕様

### モバイル表示の共通契約

2026-09-20 のユーザー要求（メインコンテンツの横スクロール防止、アイコン中心の操作、タッチでの説明表示）に基づく。根拠: [共通CSS](../../../src/index.css) の `app-page` / `responsive-action`、[ResponsiveButton](../../../src/components/ResponsiveButton.tsx)、[EditorTooltip](../../../src/components/EditorTooltip.tsx)、[InfoTip](../../../src/components/InfoTip.tsx)、[DocTip](../../../src/components/DocTip.tsx)。

- SHELL-009: 通常の全9タブはページ単位で縦スクロールし、メインコンテンツ全体は横スクロールしない。長い説明・識別子は折り返す。タブ列、キーボード、表、コード等の必要な内部要素は個別に横スクロールできる。320px 幅でも操作を単に画面外へ隠して解決したことにしない。
- SHELL-010: `ResponsiveButton` の操作（Keymap / Macro&Combo / Settings / Connection / Troubleshooting の主操作、履歴、詳細設定の Save/Discard/Reset、Subsystems の再接続、Import/Export の読取り）は640px未満でラベルを隠し、アイコンと accessible name を維持する。対象ボタンは最小44pxのタッチ領域。640px以上では文字も表示。確認ダイアログの文字だけの操作や本文リンクは文字を維持する。表示変更による書込み・保存範囲の変更はない。
- SHELL-011: 共通説明付き操作はマウスhover・キーボードfocusに加え、タッチの500ms長押しで説明を表示する。長押し終了時のclickでは操作を実行せず、次の通常タップは実行する。10px超の移動・pointercancelで長押しを取消し、外側タップ・ページscroll・Escapeで説明を閉じる。無効なボタンも説明を表示できるが実行はできない。InfoTip/DocTip の情報アイコンは通常クリック/タップでも説明を開く。説明表示だけでdevice/browserの設定を書き換えない。タブ列のnative titleや個別キーの説明はこの長押し契約の対象外。
- SHELL-012: AppLayout のヘッダーは640px未満で言語・テーマの個別ボタンを一つの「表示設定」アイコン（44px以上）に置き換える。タップでモーダルを開き、言語（English / 日本語 / 中文）とテーマ（ライト / ダーク）を選べる。変更は即時反映し SHELL-005/006 と同じ localStorage に保存する。閉じる・外側クリック・Escape は変更を取り消さず、モーダルだけ閉じてトリガーへフォーカスを戻す。640px以上のヘッダーは従来の個別ボタンを維持する。接続・端末設定には書込まない。根拠: ユーザー要求（2026-09-20）、S4、[MobileDisplaySettings](../../../src/components/MobileDisplaySettings.tsx)。SplashScreen や独立ページのヘッダーは対象外。
- SHELL-013: viewport が横向きかつ幅1023px以下・高さ500px以下のとき、固定高shell内のpage単位縦scrollを解除し、header・tab列・main contentを含むdocument全体を縦scrollする。これにより低いモバイル横画面でheaderを画面外へ移動し、main contentへ高さを使える。条件外では動的viewport高にshellを収め、header/tab列を固定したまま各pageが縦scrollし、tabごとのscroll位置を維持する。特に縦画面では、ブラウザーUIによる `vh` と表示領域の差をdocument全体の余分なscrollとして露出させない。横overflow、保存、tab保持の契約は変更しない。根拠: ユーザー要求（2026-09-20）、S1/S3/S4、[共通CSS](../../../src/index.css)。
- SHELL-014: 幅1023px以下では、テキスト入力を受ける `input`・`select`・`textarea` の実効font sizeを16px未満にしない。入力のfocusだけでモバイルブラウザーのviewportが拡大されず、値・保存範囲・focus操作は変更しない。checkbox・radio・range・fileなどテキスト入力を伴わないcontrolは対象外。根拠: ユーザー要求（2026-09-20）、[共通CSS](../../../src/index.css)。

検証: 320/390pxとデスクトップで同じページを比較し、ページ幅・scrollWidth、個別横スクロール領域、icon-onlyのaccessible nameを確認する。通常タップ/長押し/指を動かす操作を区別し、長押しで保存や削除が実行されないことを確認する。実機touch検証と合成イベントの自動テストは別の証拠として記録する。

| ID        | 前提 → 操作                                  | 観測できる結果                                                                                         | 保存範囲・副作用                                                                             | 根拠     |
| --------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | -------- |
| SHELL-001 | tab 選択                                     | 選択タブと pathname が対応。Home は `/`、他は `/<id>`。狭幅ではアイコン中心でも accessible name を持つ | history pushState。初回のみ page を mount                                                    | S1/S2/S3 |
| SHELL-002 | 訪問済み tab へ戻る                          | component は維持され、選択/編集中 state が残る。非選択 tab は hidden                                   | 自動的な再接続や device 再読込ではない。stream 等の停止はページが処理                        | S3       |
| SHELL-003 | browser Back/Forward                         | popstate で route と active tab を更新                                                                 | device の Save/Discard は実行しない                                                          | S2       |
| SHELL-004 | 未登録パス                                   | 通常ルートでは Home を選び `/` へ replace。standalone routes は別扱い                                  | query を持つ OAuth callback を Home に書換えない                                             | S1       |
| SHELL-005 | header の theme toggle                       | light/dark を切替、html class とラベルが次の操作を表す                                                 | `dya-studio-theme` localStorage。初回は保存値、なければ OS light 指定、その他 dark           | S4/S5    |
| SHELL-006 | Language toggle                              | en→ja→zh→en。html lang と翻訳ラベルを更新                                                              | `dya-studio-language` localStorage。初回は有効保存値、なければ navigator の ja/zh、その他 en | S5       |
| SHELL-007 | 接続 header / Disconnect                     | deviceName（なければ Connected）と切断操作。切断で通常 tab を離れる                                    | 接続の解除は DeviceConnectionProvider の責務                                                 | S1/S4    |
| SHELL-008 | 接続かつ devtool subsystem 対応 → Debug Tool | floating の診断 window を toggle                                                                       | devtool の詳細は診断仕様で管理                                                               | S1       |

## 代表ユーザーフロー

1. Demo で Home → Keymap。URL `/keymap` と tab を確認（SHELL-001）。
2. layer を変更、Settings へ行って戻る。元の layer 選択が残る（SHELL-002）。保存成功の証明にはしない。
3. browser Back/Forward。履歴に対応した tab を確認（SHELL-003）。
4. 元の theme/language を記録して切替し、ラベルと表示の変化を確認。元に戻す（SHELL-005/006）。他 worker とは別 origin を使用。

## 不変条件

- SHELL-I01: 非選択タブの操作 UI が選択ページと重なって利用されない（S3 hidden）。
- SHELL-I02: tab 移動だけで device flash を保存/破棄しない（S2/S3）。
- SHELL-I03: OAuth callback の query は通常ルートの正規化で破棄しない（S1）。

## エラーと復帰

route の unknown は Home へ。接続 failure は接続画面の契約。theme/language の localStorage アクセスには一律の try/catch がなく、拒否時の正常表示は保証しない。これは受け入れ済み障害ではなく未検証条件。各ページの RPC error は shell の共通 error と混同しない。

## 探索の観点

- dirty 編集のまま tab 往復と Back/Forward。
- 直接 URL、未知 path、接続前の standalone route。
- 狭幅で横スクロールできる tab と名前の判別、light/dark/3 言語での操作到達性。

## 既知の受け入れ済み不具合

承認根拠を確認できたものはなし。

## 未解決・未検証

全ページでの tab 保持、副作用停止、ストレージ拒否、system theme の動的追従は未検証。ThemeProvider は mount 時に保存値を書込むので、コメントの「手動設定がなければ OS 変更へ追従」が長期に成立するとは断定しない。
