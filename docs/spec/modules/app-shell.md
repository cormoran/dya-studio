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
