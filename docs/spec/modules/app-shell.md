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
| S8   | [route tests](../../../src/__tests__/App.legacyRoutes.test.tsx): 旧 URL の置換、接続 gate、履歴、tab 保持、standalone routes                     |
| S7   | [LanguageToggle](../../../src/components/LanguageToggle.tsx): 言語ドロップダウン（SplashScreen / AppLayout / ReleaseNotesPage 共通）             |

## 機能要求

| ID        | できるべきこと                                                           | 出典・確度                     |
| --------- | ------------------------------------------------------------------------ | ------------------------------ |
| SHELL-R01 | route・tab・ブラウザ履歴が整合し、訪問済みページの編集を不用意に失わない | S1/S2/S3 から推定              |
| SHELL-R02 | 接続なしで説明資料を読み、接続中は device と編集画面を識別できる         | S1/S4 から推定                 |
| SHELL-R03 | 言語をアプリ独自のドロップダウンの一覧から直接選べる                     | ユーザー明示要求（2026-10-17） |

## 前提・状態

通常の tabs は接続中のみ。未接続は SplashScreen、再接続中は ReconnectingOverlay。Developer Guide は keyboard providers の外、Release Notes/OAuth callback は接続 gate より前に分岐する。独立 Import/Export タブは廃止し、Keymap 内の共有メニューへ移転。旧 `/import-export`（末尾 `/` 付きも含む）は接続前・接続中とも `/keymap` に置換遷移し、query / hash を保持する。history entry を追加せず、Back は旧 URL に戻らない。同じセッションの Keymap が既に mount 済みなら編集中 state を保持する。shell 自体に dirty/save はなく各ページの状態を保持する。読み込み/empty/error は各ページの責務。

## 現行の機能仕様

### モバイル表示の共通契約

2026-09-20 のユーザー要求（メインコンテンツの横スクロール防止、アイコン中心の操作、タッチでの説明表示）に基づく。根拠: [共通CSS](../../../src/index.css) の `app-page` / `responsive-action`、[ResponsiveButton](../../../src/components/ResponsiveButton.tsx)、[EditorTooltip](../../../src/components/EditorTooltip.tsx)、[InfoTip](../../../src/components/InfoTip.tsx)、[DocTip](../../../src/components/DocTip.tsx)。

- SHELL-009: 通常の全9タブはページ単位で縦スクロールし、メインコンテンツ全体は横スクロールしない。長い説明・識別子は折り返す。タブ列、キーボード、表、コード等の必要な内部要素は個別に横スクロールできる。320px 幅でも操作を単に画面外へ隠して解決したことにしない。
- SHELL-021: 幅640px未満では、Keymap / Macro&Combo / Trackball / Connection / Settings / Troubleshooting / Subsystems のページ見出し左側の装飾アイコンを背景・枠・占有幅ごと非表示にし、640px以上では表示する。旧 Import/Export ページの見出しも同じ契約に従う。見出し・説明文と操作ボタンは維持する。Home には対象アイコンがない。根拠: ユーザー明示要求（2026-10-18）、各 Page の見出し JSX。表示のみの変更で保存・可用性・エラー処理に影響しない。
- SHELL-022: 幅640px未満では、通常タブと旧 Import/Export のページタイトル直下の説明文を非表示にする。タイトルは左端、ページ主操作は右端にまとめ、操作同士の間隔を8pxに揃える。タイトルと操作の間で余白を吸収し、幅が足りない操作だけ次の行へ折り返して、その行も右揃えとする。タイトル・操作を隠したりタッチ領域を縮めたりして1行に固定しない。Macro&Combo / Trackball の項目選択欄は、操作ボタンの後の独立行で幅を確保し、選択中の項目を識別できるようにする。640px以上は説明文・操作列とも従来の配置を維持する。Home の冒頭説明も対象だが、本文の説明・注意・エラーや各操作のtooltipは維持する。根拠: ユーザー明示要求（2026-10-18）、各 Page の `page-header` と[共通CSS](../../../src/index.css)。表示のみで可用性・保存・エラー処理は変えない。
- SHELL-010: `ResponsiveButton` の操作（Keymap / Macro&Combo / Settings / Connection / Troubleshooting の主操作、履歴、詳細設定の Save/Discard/Reset、Subsystems の再接続、Keymap sharing の入口）は640px未満でラベルを隠し、アイコンと accessible name を維持する。対象ボタンは最小44pxのタッチ領域。640px以上では文字も表示。確認ダイアログの文字だけの操作や本文リンクは文字を維持する。表示変更による書込み・保存範囲の変更はない。
- SHELL-011: 共通説明付き操作はマウスhover・キーボードfocusに加え、タッチの500ms長押しで説明を表示する。長押し終了時のclickでは操作を実行せず、次の通常タップは実行する。10px超の移動・pointercancelで長押しを取消し、外側タップ・ページscroll・Escapeで説明を閉じる。無効なボタンも説明を表示できるが実行はできない。InfoTip/DocTip の情報アイコンは通常クリック/タップでも説明を開く。説明表示だけでdevice/browserの設定を書き換えない。タブ列のnative titleや個別キーの説明はこの長押し契約の対象外。
- SHELL-012: AppLayout のヘッダーは640px未満で言語・テーマの個別ボタンを一つの「表示設定」アイコン（44px以上）に置き換える。タップでモーダルを開き、言語（English / 日本語 / 中文）とテーマ（Light / Dark / Pop / Neutral）を、それぞれラベル付きのネイティブ `select` で選べる。テーマは言語と同じ全幅・最小44px高・16px文字の選択欄とし、カスタムポップオーバーを重ねない（2026-10-18ユーザー明示要求）。変更は即時反映し SHELL-005/006 と同じ localStorage に保存する。閉じる・外側クリック・Escape は変更を取り消さず、モーダルだけ閉じてトリガーへフォーカスを戻す。640px以上のヘッダーは言語・テーマそれぞれのアイコンからカスタムメニューを開く。ヘッダー操作間と両アイコン間の gap は8px、SplashScreen の言語・テーマ間は6pxとする。接続・端末設定には書込まない。根拠: ユーザー要求（2026-09-20）、S4、[MobileDisplaySettings](../../../src/components/MobileDisplaySettings.tsx)。SplashScreen や独立ページのヘッダーは対象外。
- SHELL-013: viewport が横向きかつ幅1023px以下・高さ500px以下のとき、固定高shell内のpage単位縦scrollを解除し、header・tab列・main contentを含むdocument全体を縦scrollする。これにより低いモバイル横画面でheaderを画面外へ移動し、main contentへ高さを使える。条件外では動的viewport高にshellを収め、header/tab列を固定したまま各pageが縦scrollし、tabごとのscroll位置を維持する。特に縦画面では、ブラウザーUIによる `vh` と表示領域の差をdocument全体の余分なscrollとして露出させない。横overflow、保存、tab保持の契約は変更しない。根拠: ユーザー要求（2026-09-20）、S1/S3/S4、[共通CSS](../../../src/index.css)。
- SHELL-014: 幅1023px以下では、テキスト入力を受ける `input`・`select`・`textarea` の実効font sizeを16px未満にしない。入力のfocusだけでモバイルブラウザーのviewportが拡大されず、値・保存範囲・focus操作は変更しない。checkbox・radio・range・fileなどテキスト入力を伴わないcontrolは対象外。根拠: ユーザー要求（2026-09-20）、[共通CSS](../../../src/index.css)。
- SHELL-015: AppLayout のヘッダーは1024px以上かつ Home タブ選択時、ロゴと「DYA Studio」を一体として左右中央に表示する。他のタブでは同じグループを左端へ移動する。1024px未満では全タブで初めから左揃えとし、タブ切替による位置移動を行わない。640px未満では全タブで元の左端のロゴのみを表示する。接続状態・表示設定は常に同じ段の右側に置き、長い端末名は省略する。タブ移動・ブラウザー履歴で位置が切り替わる際は420msのCSS transitionで素早く移動して滑らかに停止し、移動途中の再切替でも現在位置から反転する。`prefers-reduced-motion: reduce` では即時切替とする。接続・設定操作と保存範囲は変更しない。根拠: ユーザー要求（2026-10-17）、S1/S4、[共通CSS](../../../src/index.css)。

- SHELL-021: 接続中ヘッダーの端末表示は、上段に Studio の接続方式（USB / Bluetooth / Demo、10px・行高10px、1行）、下段にキーボード名（16px・行高20px、省略時は全文を native title に保持）を表示する。端末名が未取得なら下段は `Connected` の翻訳を表示する。2行の合計行高は30px、上段と下段の縦の表示域を約1:2とし、ヘッダーの既存の余白・操作ボタン寸法を維持して、変更前と同程度の高さに収める。接続方式はキー入力の出力先ではなく現在の Studio セッションの方式を使い、自動再接続にも追従する。表示だけで接続・設定・保存状態は変えない。根拠: ユーザー明示要求（2026-10-18）、S4、[device session SESSION-003](device-session.md)。

検証: 320/390pxとデスクトップで同じページを比較し、ページ幅・scrollWidth、個別横スクロール領域、icon-onlyのaccessible nameを確認する。通常タップ/長押し/指を動かす操作を区別し、長押しで保存や削除が実行されないことを確認する。実機touch検証と合成イベントの自動テストは別の証拠として記録する。

| ID        | 前提 → 操作                                         | 観測できる結果                                                                                                                                                                                                                                                                                                                                                | 保存範囲・副作用                                                                                                      | 根拠     |
| --------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------- |
| SHELL-001 | tab 選択                                            | 選択タブと pathname が対応。Home は `/`、他は `/<id>`。狭幅ではアイコン中心でも accessible name を持つ                                                                                                                                                                                                                                                        | history pushState。初回のみ page を mount                                                                             | S1/S2/S3 |
| SHELL-002 | 訪問済み tab へ戻る                                 | component は維持され、選択/編集中 state が残る。非選択 tab は hidden                                                                                                                                                                                                                                                                                          | 自動的な再接続や device 再読込ではない。stream 等の停止はページが処理                                                 | S3       |
| SHELL-003 | browser Back/Forward                                | popstate で route と active tab を更新                                                                                                                                                                                                                                                                                                                        | device の Save/Discard は実行しない                                                                                   | S2       |
| SHELL-004 | 未登録パス                                          | 通常の未知ルートでは Home を選び `/` へ replace。旧 `/import-export` は接続前から `/keymap` へ replace し query / hash を保持。standalone routes は別扱い                                                                                                                                                                                                     | query を持つ OAuth callback を Home に書換えない                                                                      | S1       |
| SHELL-005 | header の Theme dropdown                            | Light / Dark / Pop / Neutral を選択し、配色・html class・現在値を即時更新                                                                                                                                                                                                                                                                                     | `dya-studio-theme` localStorage。初回は有効な保存値、未知値/未保存は OS light 指定、その他 dark。再読込後も選択を維持 | S4/S5    |
| SHELL-006 | 言語ドロップダウンで English / 日本語 / 中文 を選択 | 言語アイコンだけのボタン（言語名・下矢印は表示しない、accessible nameは言語と現在値）でカスタムメニューを開く。選択中の項目にチェックを表示し、選択すると閉じて html lang と翻訳ラベルを即時更新。開くと現在の項目にfocus。上下矢印/Home/Endはfocusのみ移動しEnter/Spaceで確定。Escape・外側クリックは言語を変更せず閉じ、Escape・選択後はボタンへfocusを戻す | `dya-studio-language` localStorage。初回は有効保存値、なければ navigator の ja/zh、その他 en                          | S5/S7    |
| SHELL-007 | 接続 header / Disconnect                            | deviceName（なければ Connected）と切断操作。切断で通常 tab を離れる                                                                                                                                                                                                                                                                                           | 接続の解除は DeviceConnectionProvider の責務                                                                          | S1/S4    |
| SHELL-008 | 接続かつ devtool subsystem 対応 → Debug Tool        | floating の診断 window を toggle                                                                                                                                                                                                                                                                                                                              | devtool の詳細は診断仕様で管理                                                                                        | S1       |

全テーマ共通で、ページ本体・浮動メニュー・内部スクロール領域・Homeの商品ギャラリーのスクロールバーは縦横とも4pxとし、WebKit scrollbar非対応ブラウザでは`scrollbar-width: thin`を使う。色は各テーマの定義を維持する（2026-10-18ユーザー明示要求、SHELL-005）。

2026-10-17 ユーザー要求に基づくテーマ追加。Pop のコンセプトは「クリーミーパステル × ポップ」。灰色を混ぜてくすませず、白を混ぜたような明るい発色と、小面積の鮮やかなアクセントを両立する。配色意図は [テーマのデザイン方針](../../../src/themes/README.md) に記録する。Pop は白い画面にアイスブルー（#f2faff）のカードを配置し、カードは枠線を表示せず背景との色差で区切る。通常の本文・説明文・アイコンは柔らかいチャコール系とし、通常の境界・hover背景もスカイブルー系に揃え、無効な操作はグレーで区別する。通常の白いキーも枠線を表示せず背景との色差で形を示し、hover・選択・変更状態の意味色とfocus outlineは維持する。ページ見出しアイコンと通常の説明パネルは淡い青（#e4f5ff）の背景とし、枠線は表示しない。補助操作・変更状態には明るいミント（#9ee5bd）を使う。説明に装飾的な黄色を使わず、緑・青の操作のhoverも同系色を維持する。主要ボタン・接続ボタンは塗りで区別し、濃い輪郭や太い枠を使わない。入力欄は白と薄い青の1px枠とする。警告は明るいクリームイエロー（#ffecad）、エラーは薄い赤（#fff0ee）の面と意味色の文字・アイコンで区別し、これらも強い外枠を付けない。Homeの注意書きやwarning tokenを使う操作も、濃い警告文字色の半透明背景ではなく同じ不透明クリーム色を使う。入力欄は白背景、主要ボタンと選択中の項目はミルキーなスカイブルー（#65cafa）と濃い文字で示す。主要操作は青系を維持し、選択中タブの下線には差し色として柔らかいクリーミーピンクを使う。Popの削除アイコンやwarning tokenを使う文字・枠・診断の警告ラベル、警告バナーの文字は、選択中タブの下線と同じクリーミーピンク（#ff91a6）に統一する（ユーザー明示要求、2026-10-18）。警告背景のクリームイエローは維持する。削除・エラーは意味色と文言・アイコンで区別する。カード・ボタン・入力欄・見出しアイコン等の共通部品にもこの配色を適用し、半透明のくすんだアクセントや装飾的な影・発光を使わない。メインタブは背景を塗りつぶさず、選択中の下辺に5pxのクリーミーピンク（#ff91a6）のラインを表示する。入力欄・select等のfocusとキーボードfocusは影に依存せず、スカイブルー（#3797c4）の2px outline・offset 1pxで示す。明るい塗りの上は濃い文字・アイコン、白地のリンクやアクセント文字は同系統の濃色を使い、配色の明るさと可読性を両立する。Pop の本文・説明文は M PLUS Rounded 1c の400、見出しと選択中メインタブは700、通常タブ・ボタン・ヘッダーのDYA STUDIO文字は500を使い、入力欄・物理キーの刻印・コードは既存フォントを維持する。Pop が選択された時（保存済みPopでの起動を含む）だけ Google Fonts CDN の stylesheet を非同期で読み込み、font-display: swap により読み込み中・失敗時も既存フォントで操作できる。初期テーマが他のテーマの場合はPop用フォントをCDNへ要求しない（既存のInter等の読み込みは維持）。同一ページ内では読み込み中・成功済みのstylesheetを再利用し、stylesheet取得失敗後は次回Pop選択時に再試行する。別テーマへ切り替えると即座に既存フォントへ戻し、Pop用stylesheet自体も無効化する。Popへ戻すと再有効化して再利用する。Neutral は Light の青みを抜いた白主体の配色で、カード・ヘッダーは白とする。主要ボタンと選択中の操作は白背景と明瞭な黒枠で示し、グレーの塗りを選択のアクセントに使わない。無効な操作はグレーで区別する。選択レイヤーや接続画面のUSB・BLE・Demo等のアクセントボタンは、既存枠に内側の線を重ねず、細い1pxの枠とする（有効時は白背景と黒枠）。ページ見出しアイコンの枠は薄いグレーとし、アイコン本体も無彩色とする。選択中のメインタブの下線も無彩色とし、線幅は既存の2pxを維持する。ページ見出し・接続先のアイコン背景は白、説明パネルは白またはごく薄いグレーとし、警告・エラーの意味色は維持する。Pastel は削除し、旧保存値 `pastel` は未知値と同様に OS 設定へ fallback する。SHELL-005 のデスクトップ等の共通 selector は [ThemeSelect](../../../src/components/ThemeSelect.tsx)。接続前の SplashScreen・接続中の AppLayout、モバイル表示設定、Developer Guide で同じ選択肢を提供する。選択確定で即時保存し、dropdown を開くだけでは変更しない。トリガーはカラーパレットアイコンのみを表示し、テーマ名や下矢印は表示しない。accessible name は「Theme / テーマ」、title は現在のテーマ名を含む。カスタムポップオーバー内に4テーマ名と選択中のチェックを表示する。開くと選択中の項目へ focus し、上下矢印・Home/End で項目移動、Enter/Space で選択・保存して閉じる。項目移動だけでは保存しない。Escape・外側クリックで変更せず閉じ、選択・Escape 後はトリガーへ focus を戻す。モバイル表示設定内は SHELL-012 のネイティブ `select` を使用し、同じ4テーマを提供する。追加テーマはいずれも light color-scheme とし、GitHub ロゴは黒版を使用する。

### 公開ページの検索メタ情報

- SHELL-018: トップの初期 HTML は ZMK キーボードのキーマップ・設定エディターであることを title / meta description / OGP で説明する。JavaScript 実行後はトップ・既知の開発者ガイド11 route・リリースノートの title / description / og:title / og:description / og:url が現在のページと言語に追従し、SPA 遷移、Back/Forward、言語変更後にも前ページの値を残さない。guide の中文選択時は本文と同様に英語へ fallback する。根拠: ユーザー明示要求（2026-10-18）、[issue #303](https://github.com/cormoran/dya-studio/issues/303)、[metadata](../../../src/lib/seo.ts) `getPageMetadata`、[hook](../../../src/hooks/usePageMetadata.ts) `usePageMetadata`、S1/S2。
- SHELL-019: canonical は既知の公開ページにだけ1個設定し、`https://studio.dya.cormoran.works` と現在の公開 pathname を使用する。query / hash は含めない。OAuth callback・接続必須画面・未知 route では前ページの canonical を削除し、OG URL は本番トップにする。初期 HTML に全 route 共通のトップ canonical を埋めず、JavaScript 実行後に設定する。本段階では本文の静的生成・言語別 URL / hreflang は提供しない。根拠: 同 issue、同 metadata/hook。
- SHELL-020: `/sitemap.xml` は本番 URL のトップ・既知の開発者ガイド11 route・リリースノートのみを掲載する。接続必須画面・OAuth callback・未知 route・query / hash は含めない。`/robots.txt` は crawl を許可して本番 sitemap を案内する。sitemap 非掲載は noindex / アクセス制御を意味しない。ファイルは Web build に含まれるが、検索エンジンの登録・順位は保証しない。根拠: 同 issue、[sitemap](../../../public/sitemap.xml)、[robots](../../../public/robots.txt)、[metadata tests](../../../src/hooks/__tests__/usePageMetadata.test.tsx)。route 追加時には sitemap と公開 route 一覧も更新する。

これらは document head と公開静的ファイルの表示契約であり、device RAM / flash や外部サービスへ書込まない。言語設定の保存範囲は SHELL-006 のまま。metadata の network fetch・loading・saving・retry UI は存在しない。検索エンジンによる JavaScript rendering / indexing は別途実測が必要。

SHELL-023: モバイル（640px未満）のKeymapでsheetを表示している間、app headerとtab列を非表示にし、main/tab contentの高さをviewportからsheetの45dvhを引いた範囲に収める。上側はその範囲内で縦scrollし、sheetの裏にcontentを重ねない。横向き・短いviewportでも通常のdocument scrollへの切替（SHELL-013）よりこの配置を優先する。sheetを閉じる、Dialog modeへ戻す、別tab/routeへ移動する、切断する、640px以上へ広げると通常のshellに戻る。tabの保持・binding・保存状態は変更しない。Keymap固有の非表示領域は[KM-028](../pages/keymap.md)。根拠は2026-10-18ユーザー明示要求、[共通CSS](../../../src/index.css)の `data-mobile-sheet-open` によるshell配置、S3/S4。

## 代表ユーザーフロー

1. Demo で Home → Keymap。URL `/keymap` と tab を確認（SHELL-001）。
2. layer を変更、Settings へ行って戻る。元の layer 選択が残る（SHELL-002）。保存成功の証明にはしない。
3. browser Back/Forward。履歴に対応した tab を確認（SHELL-003）。接続前と Demo 接続中それぞれで `/import-export?source=legacy#sharing` を直接開き、URL が `/keymap?source=legacy#sharing` となり、接続前は splash、接続中は Keymap になることを確認する。前の履歴 entry から旧 URL に入り Back/Forward しても旧 URL の entry が増えないことを確認する（SHELL-001/004、S8）。
4. Home → 他のタブ → Home でヘッダーの中央・左端間の移動を確認する。1024px未満では常に左揃え、640px未満ではロゴのみとなること、動きを抑える設定では即時切替になることも確認する（SHELL-015）。
5. Keymap など対象タブを幅639pxで開き、見出し左のアイコンと枠がなく見出し・説明・操作が表示されることを確認する。640pxに広げるとアイコンと枠が戻り、再び狭めると占有幅ごと消えることを確認する（SHELL-021）。同時に説明文が640px未満では非表示となり、主操作がタイトル行から並ぶことを320px/390pxと長い言語ラベルで確認する。操作同士の間隔が8pxで右端に揃い、折り返した行も右揃えになることを確認する。全操作へ到達でき、Macro&Combo / Trackball の項目選択欄は次行に表示されることも確認する（SHELL-022）。
6. 元の theme/language を記録する。言語ドロップダウンで3言語を直接選び、選択名・翻訳・html lang を確認する。browser reload 後の選択維持、Escape 取消しで値が変わらないことを確認し、元の言語に戻して再読込する（SHELL-005/006）。他 worker とは別 origin を使用。

7. トップ → guide の module page → Release Notes → browser Back/Forward を移動し、各ページと言語に title / description / canonical / OGP が追従することを document head で確認する。query / hash 付きで直接開いても canonical に含まれないこと、公開ページから通常編集 route に移ると canonical が残らないことを確認する（SHELL-018/019）。`/sitemap.xml` と `/robots.txt` は HTTP で内容を確認し、検索登録済みとは扱わない（SHELL-020）。

- SHELL-024: Macro&Combo タブを廃止し、マクロとタップダンスの一覧・modal 編集入口を Keymap に統合する（KM-029/030）。旧 `/macro-combo` は同じ接続セッション内の Keymap を表示する互換入口とし、新規のタブ遷移は `/keymap` を使う。根拠: 2026-10-18 ユーザー明示要求、AppContent/getTabs。

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
