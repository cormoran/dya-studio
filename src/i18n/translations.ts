export type Language = "en" | "ja";

export type TranslationParams = Record<string, string | number>;

export const languageLabels: Record<Language, string> = {
  en: "English",
  ja: "日本語",
};

const ja: Record<string, string> = {
  "DYA Studio for DYA & ZMK Keyboards":
    "DYA & ZMK キーボードのための DYA Studio",
  "The operation failed because the device is locked in ZMK Studio. Unlock the keyboard and try again.":
    "デバイスが ZMK Studio ロック状態のため操作に失敗しました。キーボードのロックを解除してから再度お試しください。",
  Home: "ホーム",
  Keymap: "キーマップ",
  Macro: "マクロ",
  Combo: "コンボ",
  Trackball: "トラックボール",
  BLE: "BLE",
  Settings: "設定",
  Troubleshooting: "トラブルシューティング",
  Subsystems: "サブシステム",
  Connected: "接続中",
  Disconnect: "切断",
  "Connect Keyboard": "キーボードを接続",
  "Connecting...": "接続中...",
  "Switch to light mode": "ライトモードに切り替え",
  "Switch to dark mode": "ダークモードに切り替え",
  Language: "言語",
  "Switch language": "言語を切り替え",
  Refresh: "更新",
  Cancel: "キャンセル",
  Continue: "続行",
  Open: "開く",
  Close: "閉じる",
  Clear: "クリア",
  Set: "設定",
  Save: "保存",
  "Saving...": "保存中...",
  Reset: "リセット",
  Discard: "破棄",
  Delete: "削除",
  New: "新規",
  Apply: "適用",
  Enabled: "有効",
  Dismiss: "閉じる",
  Loading: "読み込み中",
  "Never show again": "今後表示しない",
  "Welcome to DYA Studio": "DYA Studio へようこそ",
  "DYA Studio is yet another ZMK Studio for DYA keyboard series, designed by cormoran707":
    "DYA Studio は cormoran707 が設計した DYA キーボードシリーズ向けのもう一つの ZMK Studio です",
  "Share on X": "X で共有",
  "DYA is pronounced dai-a.": "DYA の読み方はダイアです",
  "cormoran is pronounced cormoran [kˈɔɚm(ə)rən].":
    "cormoran の読み方はコーモラン [kˈɔɚm(ə)rən] です",
  "Features - What you can do with DYA Studio":
    "機能 - DYA Studio でできること",
  "You can customize keymaps with a slightly easier UI, equivalent to ZMK Studio.":
    "少し使いやすい UI で ZMK Studio と同等のキーマッピングカスタマイズができます。",
  "You can configure trackball sensitivity, auto layer switching and various input processor settings.":
    "トラックボールの感度、自動レイヤー切り替え、各種入力プロセッサー設定を変更できます。",
  "You can inspect device diagnostics and generate a troubleshooting report to share when asking for support.":
    "デバイスの診断情報を確認し、サポートに問い合わせる際に共有できるトラブルシューティングレポートを作成できます。",
  "You can name BLE connection targets and unpair them.":
    "BLE 接続先に名前を付けたり、ペアリングを解除したりできます。",
  "You can change various settings such as the time to enter sleep mode.":
    "スリープに入る時間など、各種設定を変更できます。",
  "See also below Q&A section for more details.":
    "詳細は下の Q&A セクションも参照してください。",
  "DYA Keyboard series": "DYA キーボードシリーズ",
  "40% Split keyboard for mobile use.":
    "モバイル用途向けの 40% 分割キーボード。",
  Design: "設計",
  Buy: "購入",
  Docs: "ドキュメント",
  "Next generation DYA keyboard, 60% split, standard row-staggered layout.":
    "次世代 DYA キーボード。60% 分割、標準的なロウスタッガード配列。",
  "Coming Soon": "近日公開",
  "Watch Booth": "Booth を見る",
  "Q: Can my keyboard support DYA Studio?":
    "Q: 自分のキーボードは DYA Studio に対応できますか？",
  "A: Yes, you can use the keymap feature without any modification with your ZMK keyboard.":
    "A: はい。ZMK キーボードであれば、変更なしでキーマップ機能を使えます。",
  "You can also support other features by using cormoran's ZMK fork and cormoran's ZMK modules, although it's not suggested considering compatibility and maintainability.":
    "cormoran の ZMK fork と ZMK モジュールを使うことで他の機能にも対応できますが、互換性と保守性を考えると推奨しません。",
  "Please refer to the experimental zmk-config for DYA Dash keyboard.":
    "DYA Dash キーボード向けの experimental zmk-config を参照してください。",
  "Warning: cormoran's ZMK fork is very experimental, optimized for DYA keyboards and may contain unstable or breaking changes. Use at your own risk. In rare cases, it may cause malfunction or damage to your keyboard hardware.":
    "警告: cormoran の ZMK fork は非常に実験的で、DYA キーボード向けに最適化されています。不安定な変更や破壊的変更を含む可能性があります。自己責任で使用してください。まれにキーボードハードウェアの誤動作や損傷につながる場合があります。",
  "Q: Can I get source code of DYA Studio?":
    "Q: DYA Studio のソースコードを入手できますか？",
  "Q: Are there plan to migrate the ZMK fork to ZMK v0.4.0?":
    "Q: ZMK fork を ZMK v0.4.0 へ移行する予定はありますか？",
  "A: Yes, it's already done. The ZMK fork now tracks recent ZMK (Zephyr 4.x).":
    "A: はい、すでに移行済みです。ZMK fork は最新の ZMK（Zephyr 4.x）に追従しています。",

  "Configure key bindings and layers": "キー割り当てとレイヤーを設定します",
  "Unsaved changes": "未保存の変更",
  Saved: "保存済み",
  "Saved — changed from the default keymap":
    "保存済み — デフォルトのキーマップから変更されています",
  Stream: "ストリーム",
  "Toggle stream mode": "ストリームモードを切り替え",
  "Discard unsaved changes and reload the keymap":
    "未保存の変更を破棄してキーマップを再読み込みします",
  "Reset the saved keymap to the default keymap":
    "保存済みのキーマップをデフォルトのキーマップにリセットします",
  'This keyboard cannot reset the keymap on its own. To clear the keymap, use "Reset all settings" in the Settings tab, which restores every setting to its firmware default.':
    "このキーボードはキーマップ単体をリセットできません。キーマップを消去するには、設定タブの「すべての設定をリセット」を使用してください。すべての設定がファームウェアのデフォルトに戻ります。",
  "Reset to default keymap?": "デフォルトのキーマップにリセットしますか？",
  "This resets the saved keymap on your keyboard back to its hard-coded default and writes it to flash immediately. All saved key bindings will be lost. This cannot be undone.":
    "キーボードに保存されたキーマップをハードコードされたデフォルトに戻し、直ちにフラッシュへ書き込みます。保存済みのすべてのキー割り当ては失われます。この操作は元に戻せません。",
  "Reset to default": "デフォルトにリセット",
  "Default keymap is not available": "デフォルトのキーマップを利用できません",
  Locked: "ロック中",
  "Studio is locked — click to unlock":
    "Studio はロックされています — クリックしてロック解除",
  "Connect your keyboard to edit keymaps":
    "キーマップを編集するにはキーボードを接続してください",
  "Loading keymap data...": "キーマップデータを読み込み中...",
  "Loading physical layouts...": "物理レイアウトを読み込み中...",
  "Loading keymap...": "キーマップを読み込み中...",
  "Loading behaviors...": "動作（ビヘイビア）を読み込み中...",
  "Finalizing...": "仕上げ中...",
  "Are you sure you want to discard all changes?":
    "すべての変更を破棄しますか？",
  "Are you sure you want to delete this layer?": "このレイヤーを削除しますか？",
  "Layer {{id}}": "レイヤー {{id}}",
  Sort: "並び替え",
  "Move layer up (higher priority)": "レイヤーを上へ移動（優先度を上げる）",
  "Move layer down (lower priority)": "レイヤーを下へ移動（優先度を下げる）",
  "Add new layer": "新しいレイヤーを追加",
  "Delete current layer": "現在のレイヤーを削除",
  "Restore deleted layer": "削除したレイヤーを復元",
  "Restore deleted layer ({{count}} available)":
    "削除したレイヤーを復元（{{count}} 件利用可能）",
  "Restore all deleted layers ({{count}})":
    "削除したレイヤーをすべて復元（{{count}} 件）",
  "No deleted layers to restore": "復元できる削除済みレイヤーはありません",
  "Physical Layout": "物理レイアウト",
  "Layout {{id}}": "レイアウト {{id}}",
  "OS Layout": "OS 配列",
  "Choose OS's keyboard layout setting": "OS のキーボード配列設定を選択",
  "This setting only affects the visual key labels in DYA Studio web UI.":
    "この設定は DYA Studio Web UI 上のキー表示にのみ影響します。",
  "Changing this does not update any firmware setting. The keyboard is detected as US regardless of this setting. Please change the layout setting in your OS if needed. For MacOS, USB connection is always detected as US and cannot be changed for now.":
    "これを変更してもファームウェア設定は更新されません。この設定に関係なく、キーボードは US として検出されます。必要に応じて OS 側の配列設定を変更してください。macOS では USB 接続が常に US として検出され、現時点では変更できません。",
  "The selection is saved in your browser's local storage for now.":
    "この選択は現在ブラウザーのローカルストレージに保存されます。",
  "Physical layout module preview could not be loaded: {{error}}":
    "物理レイアウトモジュールのプレビューを読み込めませんでした: {{error}}",
  "Runtime sensor rotation subsystem is not available for your keyboard. Rotary encoder configuration will not be displayed. You can enable the feature by applying cormoran/zmk-behavior-runtime-sensor-rotate in your firmware.":
    "このキーボードではランタイムセンサー回転サブシステムを利用できません。ロータリーエンコーダー設定は表示されません。ファームウェアに cormoran/zmk-behavior-runtime-sensor-rotate を適用すると、この機能を有効にできます。",
  "Click on a key to modify its binding. Modified keys are highlighted in green and show the original binding on hover. Use the Discard button to drop unsaved changes, or Reset to restore the default keymap.":
    "キーをクリックして割り当てを変更します。変更されたキーは緑で強調表示され、ホバーすると元の割り当てが表示されます。未保存の変更を破棄するには「破棄」を、デフォルトのキーマップに戻すには「リセット」を使ってください。",
  "Connect your keyboard to edit keymaps. Click on a key to modify its binding.":
    "キーマップを編集するにはキーボードを接続してください。キーをクリックすると割り当てを変更できます。",

  "Trackball Settings": "トラックボール設定",
  "Adjust sensitivity and behavior via runtime input processor":
    "ランタイム入力プロセッサーで感度と動作を調整します",
  "Runtime input processor subsystem is not available for your keyboard.":
    "このキーボードではランタイム入力プロセッサーサブシステムを利用できません。",
  "Make sure your firmware has the {{module}} enabled.":
    "ファームウェアで {{module}} が有効になっていることを確認してください。",
  "Loading trackball settings...": "トラックボール設定を読み込み中...",
  "No runtime input processor found. Make sure your firmware has the runtime input processor module enabled.":
    "ランタイム入力プロセッサーが見つかりません。ファームウェアでランタイム入力プロセッサーモジュールが有効になっていることを確認してください。",
  "Advanced (PMW3610 Sensor Driver)": "詳細設定（PMW3610 センサードライバー）",
  "Sensor-level tuning exposed by the pmw3610 driver's custom Studio RPC":
    "pmw3610 ドライバーのカスタム Studio RPC が公開するセンサーレベルの調整項目です",
  "No pmw3610 driver settings were reported by the keyboard.":
    "キーボードから pmw3610 ドライバーの設定が報告されませんでした。",
  "Select Processor": "プロセッサーを選択",
  "{{count}} processors detected": "{{count}} 個のプロセッサーを検出",
  Processors: "プロセッサー",
  "Processor {{id}}": "プロセッサー {{id}}",
  "No processors found": "プロセッサーが見つかりません",
  "Loading...": "読み込み中...",
  "PMW3610 Drivers": "PMW3610 ドライバー",
  "This driver is no longer available.":
    "このドライバーは利用できなくなりました。",
  "Active on layer": "有効なレイヤー",
  "Temp layer": "一時レイヤー",
  "{{layer}} — active": "{{layer}} — 有効",
  "{{layer}} — inactive": "{{layer}} — 無効",
  "{{layer}} — temporary layer target": "{{layer}} — 一時レイヤーの対象",
  "Active on Layers": "有効にするレイヤー",
  "Configure which layers this processor is active on":
    "このプロセッサーを有効にするレイヤーを設定します",
  "Processor is active on all layers":
    "プロセッサーはすべてのレイヤーで有効です",
  "Loading layers...": "レイヤーを読み込み中...",
  Scaling: "スケーリング",
  "Adjust sensitivity from 0.01x to 10x":
    "感度を 0.01x から 10x の範囲で調整します",
  "Decrease scaling": "スケーリングを下げる",
  "Increase scaling": "スケーリングを上げる",
  "Sensor Rotation": "センサー回転",
  "Rotate input for different mounting angles":
    "取り付け角度に合わせて入力を回転します",
  "Decrease rotation": "回転角度を下げる",
  "Increase rotation": "回転角度を上げる",
  "Axis Snapping": "軸スナップ",
  "Constrain movement to a single axis for precision scrolling":
    "精密なスクロールのため、移動を単一の軸に制限します",
  "Snap Axis": "スナップ軸",
  "Y Axis (Vertical)": "Y 軸（垂直）",
  "X Axis (Horizontal)": "X 軸（水平）",
  "Snap Threshold": "スナップしきい値",
  "Threshold for unsnapping from the locked axis":
    "ロックされた軸からスナップ解除するしきい値",
  "Snap Timeout": "スナップタイムアウト",
  "Time window for threshold check": "しきい値チェックの時間幅",
  "Axis Inversion": "軸反転",
  "Reverse the direction of X or Y axis movement":
    "X 軸または Y 軸の移動方向を反転します",
  "Invert X Axis": "X 軸を反転",
  "Reverse horizontal movement direction": "水平方向の移動を反転します",
  "Invert Y Axis": "Y 軸を反転",
  "Reverse vertical movement direction": "垂直方向の移動を反転します",
  "Code Mapping": "コードマッピング",
  "Transform trackball movement into different input types":
    "トラックボールの移動を別の入力タイプに変換します",
  "XY-to-Scroll": "XY をスクロールに変換",
  "Map X/Y movement to horizontal/vertical scroll":
    "X/Y 移動を水平/垂直スクロールに割り当てます",
  "XY-Swap": "XY 入れ替え",
  "Swap X and Y axes": "X 軸と Y 軸を入れ替えます",
  "Temporary Layer": "一時レイヤー",
  "Auto-activate layer when trackball is in use":
    "トラックボール使用時にレイヤーを自動で有効化します",
  "Target Layer": "対象レイヤー",
  "Activation Delay": "有効化遅延",
  "Delay before activating layer when trackball moves":
    "トラックボール移動時にレイヤーを有効化するまでの遅延",
  "Deactivation Delay": "無効化遅延",
  "Delay before deactivating layer when trackball stops":
    "トラックボール停止時にレイヤーを無効化するまでの遅延",

  "BLE Connections": "BLE 接続",
  "Manage Bluetooth upstream connections":
    "Bluetooth アップストリーム接続を管理します",
  "Refresh profiles": "プロファイルを更新",
  "BLE management subsystem is not available for your keyboard.":
    "このキーボードでは BLE 管理サブシステムを利用できません。",
  "Output Priority": "出力優先度",
  "Loading profiles...": "プロファイルを読み込み中...",
  "Device name": "デバイス名",
  "Save name": "名前を保存",
  "Cancel editing": "編集をキャンセル",
  "Edit name": "名前を編集",
  "Profile {{index}}": "プロファイル {{index}}",
  "Not paired": "ペアリングなし",
  "No address": "アドレスなし",
  Unpair: "ペアリング解除",
  Switch: "切り替え",
  Active: "アクティブ",
  "Are you sure you want to unpair this device?":
    "このデバイスのペアリングを解除しますか？",
  "Change Output Priority?": "出力優先度を変更しますか？",
  "Changing the output priority may disconnect DYA Studio from your keyboard.":
    "出力優先度を変更すると、DYA Studio とキーボードの接続が切断される場合があります。",
  "You will need to reconnect manually after the change.":
    "変更後は手動で再接続する必要があります。",

  Connection: "接続",
  "Manage connections, default layers and OS detection":
    "接続・デフォルトレイヤー・OS 検出の管理",
  "Current OS": "現在の OS",
  "Active Connection": "アクティブな接続",
  "Resolved Default Layer": "解決済みのデフォルトレイヤー",
  "Not connected": "未接続",
  "BLE profile {{index}}": "BLE プロファイル {{index}}",
  OS: "OS",
  Auto: "自動",
  "Auto: {{os}}": "自動: {{os}}",
  Windows: "Windows",
  macOS: "macOS",
  Linux: "Linux",
  iOS: "iOS",
  Android: "Android",
  Unknown: "不明",
  "{{connection}} OS override": "{{connection}} の OS 上書き",
  "Default Layer": "デフォルトレイヤー",
  "{{connection}} default layer": "{{connection}} のデフォルトレイヤー",
  "Not set": "未設定",
  "Follow OS detection": "OS 検出に従う",
  Connections: "接続先",
  "Set a default layer for each connection target. The layer switches automatically when that connection becomes active.":
    "接続先ごとにデフォルトレイヤーを設定できます。その接続先がアクティブになると、設定したレイヤーへ自動で切り替わります。",
  "Choosing 'Follow OS detection' applies the Per-OS Default Layers settings below.":
    "「OS 検出に従う」を選ぶと、下の「OS ごとのデフォルトレイヤー」の設定が使われます。",
  "Choose whether USB or Bluetooth is used for keystrokes when both are connected.":
    "USB と Bluetooth の両方が接続されているとき、どちらにキー入力を送るかを選びます。",
  "The OS is detected automatically from how the host communicates (heuristic).":
    "OS はホストとの通信内容から自動判定されます（推定）。",
  "The OS is detected automatically from how the host communicates (heuristic). If detection is wrong, select the correct OS here to override it for this connection.":
    "OS はホストとの通信内容から自動判定されます（推定）。誤検出の場合は、この接続先の OS をここで選んで上書きできます。",
  "More info": "詳細",
  "Per-OS Default Layers": "OS ごとのデフォルトレイヤー",
  "Applied when a connection's default layer is set to 'Follow OS detection'. The layer configured for the detected OS is used.":
    "接続先のデフォルトレイヤーで「OS 検出に従う」を選んだ場合に適用されます。検出された OS に設定したレイヤーが使われます。",
  "{{os}} default layer": "{{os}} のデフォルトレイヤー",
  "OS detection is not enabled in this firmware build.":
    "このファームウェアビルドでは OS 検出が有効になっていません。",
  "Default layer subsystem is not available for your keyboard.":
    "このキーボードではデフォルトレイヤーサブシステムを利用できません。",
  "BLE OS detection is heuristic and may flap right after connecting. If detection is wrong, set a per-profile override above.":
    "BLE の OS 検出はヒューリスティックなため、接続直後は不安定になることがあります。検出結果が誤っている場合は、上のプロファイルごとの上書き設定を使用してください。",
  "Related modules:": "関連モジュール:",

  "Device configuration and power management": "デバイス設定と電源管理",
  "Settings RPC subsystem is not available for your keyboard.":
    "このキーボードでは Settings RPC サブシステムを利用できません。",
  "Loading settings...": "設定を読み込み中...",
  "Power Management": "電源管理",
  "Idle Timeout": "アイドルタイムアウト",
  "Time before keyboard enters idle mode":
    "キーボードがアイドルモードに入るまでの時間",
  "Sleep Timeout": "スリープタイムアウト",
  "Time before entering deep sleep": "ディープスリープに入るまでの時間",
  "Apply to All Devices": "すべてのデバイスに適用",
  "Current Settings by Device": "デバイス別の現在の設定",
  "Idle: {{idle}}, Sleep: {{sleep}}": "アイドル: {{idle}}, スリープ: {{sleep}}",
  "Waiting for device connection...": "デバイス接続を待機中...",
  "Danger Zone": "危険な操作",
  "Reset all settings": "すべての設定をリセット",
  "Erase every saved setting on the keyboard — including the keymap and all custom settings — and restore firmware defaults.":
    "キーマップやすべてのカスタム設定を含む、キーボードに保存されたすべての設定を消去し、ファームウェアのデフォルトに戻します。",
  "Reset all settings?": "すべての設定をリセットしますか？",
  "This erases every saved setting on your keyboard — the keymap and all custom settings — and restores firmware defaults. This cannot be undone.":
    "キーマップやすべてのカスタム設定を含む、キーボードに保存されたすべての設定を消去し、ファームウェアのデフォルトに戻します。この操作は元に戻せません。",
  "Not connected to keyboard": "キーボードに接続されていません",
  Never: "なし",
  "30 seconds": "30 秒",
  "1 minute": "1 分",
  "5 minutes": "5 分",
  "10 minutes": "10 分",
  "15 minutes": "15 分",
  "30 minutes": "30 分",
  "1 hour": "1 時間",
  "2 hours": "2 時間",
  "4 hours": "4 時間",
  "{{value}} min": "{{value}} 分",
  "Custom value...": "カスタム値...",
  min: "分",
  "{{count}} seconds": "{{count}} 秒",
  "{{count}} minute": "{{count}} 分",
  "{{count}} minutes": "{{count}} 分",
  "{{count}} hour": "{{count}} 時間",
  "{{count}} hours": "{{count}} 時間",
  "{{count}}s": "{{count}}秒",
  "{{count}}m": "{{count}}分",
  "{{count}}h": "{{count}}時間",
  ms: "ms",

  "Macro&Combo": "マクロ&コンボ",
  "Edit runtime macro and combo slots":
    "ランタイムマクロとコンボのスロットを編集",
  "Macro Global Settings": "マクロのグローバル設定",
  "Combo Global Settings": "コンボのグローバル設定",
  "Connect your keyboard to edit runtime macros and combos":
    "ランタイムマクロとコンボを編集するにはキーボードを接続してください",
  "Select a macro or combo": "マクロまたはコンボを選択",
  "Choose an item from the lists on the left.":
    "左のリストから項目を選択してください。",
  "Edit runtime macro slots": "ランタイムマクロスロットを編集",
  "Encoded macro is {{encodedSize}} bytes; limit is {{maxMacroBytes}}.":
    "エンコード後のマクロは {{encodedSize}} バイトです。上限は {{maxMacroBytes}} バイトです。",
  "Only HID keyboard-page printable characters are supported.":
    "HID キーボードページの印字可能文字のみ対応しています。",
  "Runtime macro subsystem not found. Build firmware with":
    "ランタイムマクロサブシステムが見つかりません。ファームウェアに",
  Slots: "スロット",
  Macros: "マクロ一覧",
  Combos: "コンボ一覧",
  "Macro {{slot}}": "マクロ {{slot}}",
  "{{encodedSize}}/{{maxMacroBytes}} bytes":
    "{{encodedSize}}/{{maxMacroBytes}} バイト",
  "Global Settings": "グローバル設定",
  "Tap ms": "タップ時間 ms",
  Name: "名前",
  Size: "サイズ",
  Steps: "ステップ",
  Step: "ステップ",
  "No steps in this macro": "このマクロにはステップがありません",
  Tap: "タップ",
  Down: "押下",
  Up: "解放",
  Delay: "待機",
  String: "文字列",
  "Remove step {{n}}": "ステップ {{n}} を削除",
  "Select a macro slot": "マクロスロットを選択",
  "Select a macro": "マクロを選択してください",
  "No macros yet. Create one below.":
    "マクロがまだありません。下から作成してください。",
  "No macros yet. Create one to get started.":
    "マクロがまだありません。作成して始めましょう。",
  "New macro name": "新しいマクロ名",
  Create: "作成",
  "Shared macro pool: {{used}}/{{total}} B":
    "共有マクロプール: {{used}}/{{total}} B",

  "Configure runtime combo slots": "ランタイムコンボスロットを設定",
  "All layers": "すべてのレイヤー",
  "Choose a valid slot.": "有効なスロットを選択してください。",
  "Slot must be below {{maxCombo}}.":
    "スロットは {{maxCombo}} 未満にしてください。",
  "Name must be {{maxLength}} characters or fewer.":
    "名前は {{maxLength}} 文字以内にしてください。",
  "Select at least two key positions.": "キー位置を2つ以上選択してください。",
  "Select {{maxPositions}} positions or fewer.":
    "キー位置は {{maxPositions}} 個以内にしてください。",
  "Key positions must be below 65536.": "キー位置は 65536 未満にしてください。",
  "Choose a behavior.": "動作を選択してください。",
  "Layer mask is out of range.": "レイヤーマスクが範囲外です。",
  "Combo changes are pending.": "コンボの変更が保留中です。",
  "Combo deletion is pending.": "コンボの削除が保留中です。",
  "Global settings are pending.": "グローバル設定の変更が保留中です。",
  "Saved {{count}} runtime combo changes.":
    "ランタイムコンボの変更を {{count}} 件保存しました。",
  "Discarded {{count}} runtime combo changes.":
    "ランタイムコンボの変更を {{count}} 件破棄しました。",
  "● Pending changes": "● 保留中の変更",
  "Connect your keyboard to edit runtime combos":
    "ランタイムコンボを編集するにはキーボードを接続してください",
  "Runtime combo subsystem is not available for your keyboard.":
    "このキーボードではランタイムコンボサブシステムを利用できません。",
  "is required in firmware.": "がファームウェアに必要です。",
  "Loading combo data...": "コンボデータを読み込み中...",
  configured: "設定済み",
  "No runtime combos configured": "ランタイムコンボが設定されていません",
  "Combo {{index}}": "コンボ {{index}}",
  "Max slots": "最大スロット数",
  "Timeout ms": "タイムアウト ms",
  "Slow release": "スローリリース",
  "Apply Global Settings": "グローバル設定を適用",
  "Select a combo slot": "コンボスロットを選択",
  "Choose an existing slot or create a new combo.":
    "既存のスロットを選択するか、新しいコンボを作成してください。",
  "New Combo": "新しいコンボ",
  "Combo Editor": "コンボエディター",
  "Existing slot": "既存のスロット",
  "New slot": "新しいスロット",
  "Save Combo": "コンボを保存",
  Slot: "スロット",
  Positions: "位置",
  Empty: "空",
  Default: "デフォルト",
  Overridden: "上書き済み",
  "Reset to Default": "デフォルトにリセット",
  "Combo reset to default is pending.":
    "コンボのデフォルトへのリセットが保留中です。",
  "Timeout ms (0 = inherit global)":
    "タイムアウト ms（0 = グローバル設定を継承）",
  "Require prior idle ms (0 = inherit global)":
    "事前アイドル時間 ms（0 = グローバル設定を継承）",
  "Require prior idle ms (0 disables)": "事前アイドル時間 ms（0 で無効化）",
  "Slow release override": "スローリリースの上書き",
  "Inherit global": "グローバル設定を継承",
  On: "オン",
  Off: "オフ",

  "(hidden)": "（非表示）",
  Local: "ローカル",
  "Source {{source}}": "ソース {{source}}",
  "Use hexadecimal bytes such as 00 ff 2a.":
    "00 ff 2a のような16進バイト列を入力してください。",
  "Bytecode Editor": "バイトコードエディター",
  "Hex bytes": "16進バイト",
  "ASCII helper": "ASCII 入力補助",
  Encode: "エンコード",
  "Length: {{count}} bytes": "長さ: {{count}} バイト",
  "Invalid hex": "無効な16進値",
  "Invalid bytes": "無効なバイト列",
  "Value is hidden by firmware permissions":
    "ファームウェアの権限により値は非表示です",
  "(empty)": "（空）",
  "Edit bytecode": "バイトコードを編集",
  Unsaved: "未保存",
  Queued: "待機中",
  "Memory...": "メモリに書き込み中...",
  "In memory": "メモリ内",
  Current: "現在値",
  "Discard item changes": "項目の変更を破棄",
  "Reset item to default": "項目を既定値にリセット",
  "Changed from default": "デフォルトから変更",
  "Reset this macro to its default?":
    "このマクロをデフォルトにリセットしますか？",
  "Reset this macro to its default": "このマクロをデフォルトにリセット",
  Legend: "凡例",
  "Green: in memory, not yet saved. Discard reverts it.":
    "緑: メモリ内で未保存。破棄で元に戻ります。",
  "Blue: saved, but changed from the default. Reset restores the default.":
    "青: 保存済みだがデフォルトから変更されています。リセットでデフォルトに戻ります。",
  "Advanced Settings": "詳細設定",
  "Changes are written to keyboard memory after a short delay. Save a section to persist them.":
    "変更は少し遅れてキーボードのメモリに書き込まれます。永続化するにはセクションを保存してください。",
  Reload: "再読み込み",
  "Reload the keymap from the keyboard": "キーボードからキーマップを再読み込み",
  "Reload settings from the keyboard": "キーボードから設定を再読み込み",
  "Reload processors": "プロセッサーを再読み込み",
  "Advanced settings can change firmware behavior immediately. Incorrect values may make the keyboard hard to use; discard or reset a section if the device starts behaving unexpectedly.":
    "詳細設定はファームウェアの動作を即座に変更します。誤った値を設定するとキーボードが使いにくくなる可能性があります。デバイスが予期せず動作し始めた場合は、セクションを破棄またはリセットしてください。",
  "Custom settings subsystem is not available for this keyboard.":
    "このキーボードではカスタム設定サブシステムを利用できません。",
  "Loading advanced settings...": "詳細設定を読み込み中...",
  "No advanced settings were reported by the keyboard.":
    "キーボードから詳細設定が報告されませんでした。",
  "{{count}} settings": "{{count}} 件の設定",
  " - loading layer and behavior names": "（レイヤー名と動作名を読み込み中）",
  "Reset all settings in {{identifier}}?":
    "{{identifier}} のすべての設定をリセットしますか？",
  Setting: "設定",
  Source: "ソース",
  Editor: "エディター",
  Status: "状態",
  Item: "項目",
  "● Unsaved": "● 未保存",
  "What Source means": "ソースの意味",
  "Source legend": "ソースの凡例",
  "Central: the split side you are connected to.":
    "中央側: 現在接続している側（分割キーボードの片側）です。",
  "Peripheral N: another split side's own independently stored copy.":
    "周辺側 N: もう一方の側が個別に保持している設定値です。",
  "All: every split side at once, used for section-wide actions.":
    "All: 両側をまとめて扱う値で、セクション単位の操作に使われます。",
  "Saving…": "書き込み中…",
  "Default:": "デフォルト:",
  "Click to restore the default value.":
    "クリックするとデフォルト値に戻します。",
  "What Status means": "状態の意味",
  "Status legend": "状態の凡例",
  "Current: matches the value persisted on the keyboard.":
    "Current: キーボードに保存されている値と一致しています。",
  "In memory: written to RAM; save the section to persist it.":
    "In memory: RAM には書き込み済みですが、永続化するにはセクションを保存してください。",
  "Queued: your edit is about to be sent.":
    "Queued: 変更が送信されるのを待っています。",
  "Memory...: the edit is being written right now.":
    "Memory...: 変更を書き込んでいる最中です。",
  Sensitivity: "感度",
  "Tracking resolution.": "トラッキングの解像度です。",
  Orientation: "向き",
  "Axis mapping for how the sensor is mounted.":
    "センサーの取り付け方向に応じた軸のマッピングです。",
  "Power & Rest Mode": "省電力・レストモード",
  "Idle downshift stages that reduce sensor polling and power use while the trackball is not moving.":
    "トラックボールが動いていない間にセンサーのポーリング頻度と消費電力を段階的に下げるアイドル設定です。",
  Reporting: "レポート",
  "How often motion reports are sent to the host.":
    "ホストへ動きのレポートを送信する頻度です。",
  "Sensor resolution in counts per inch. Higher values move the cursor faster for the same physical motion.":
    "1インチあたりのカウント数（CPI）によるセンサー解像度です。値が大きいほど同じ動きでもカーソルが速く動きます。",
  "Swap the X and Y axes.": "X軸とY軸を入れ替えます。",
  "Invert the horizontal movement direction.": "水平方向の動きを反転します。",
  "Invert the vertical movement direction.": "垂直方向の動きを反転します。",
  "Keep the sensor fully powered, skipping the rest mode stages below.":
    "以下のレストモード段階を使わず、センサーを常にフル稼働させます。",
  "Enable the sensor's adaptive positioning algorithm.":
    "センサーの適応的な位置検出アルゴリズムを有効にします。",
  "Time of continuous motion before dropping from Run mode into Rest1.":
    "Runモードから Rest1 に移行するまでの、動き続ける時間です。",
  "Time in Rest1 before dropping into Rest2.":
    "Rest1 から Rest2 に移行するまでの時間です。",
  "Time in Rest2 before dropping into Rest3.":
    "Rest2 から Rest3 に移行するまでの時間です。",
  "Sensor sampling interval while in Rest1.":
    "Rest1 中のセンサーのサンプリング間隔です。",
  "Sensor sampling interval while in Rest2.":
    "Rest2 中のセンサーのサンプリング間隔です。",
  "Sensor sampling interval while in Rest3, the deepest idle stage.":
    "最も深いアイドル段階である Rest3 中のセンサーのサンプリング間隔です。",
  "Minimum time between motion reports sent to the host.":
    "ホストへ動きのレポートを送信する最小間隔です。",
  "Subsystem {{index}}": "サブシステム {{index}}",
  "Custom settings subsystem is not available":
    "カスタム設定サブシステムを利用できません",
  "Empty custom settings response": "カスタム設定の応答が空です",
  "Custom settings failed": "カスタム設定の処理に失敗しました",
  "Custom settings list timed out":
    "カスタム設定一覧の取得がタイムアウトしました",
  "Failed to load custom settings": "カスタム設定の読み込みに失敗しました",
  "Failed to write custom setting": "カスタム設定の書き込みに失敗しました",
  "Failed to save settings": "設定の保存に失敗しました",
  "Failed to discard settings": "設定の破棄に失敗しました",
  "Failed to reset settings": "設定のリセットに失敗しました",

  "Custom Subsystems": "カスタムサブシステム",
  "Available custom firmware subsystems and their web interfaces":
    "利用可能なカスタムファームウェアサブシステムと Web インターフェース",
  "Close dialog": "ダイアログを閉じる",
  "External Link Warning": "外部リンクの警告",
  "You are about to open an external website provided by the keyboard firmware author:":
    "キーボードファームウェア作者が提供する外部 Web サイトを開こうとしています:",
  "Security Notice": "セキュリティ上の注意",
  "Please do not connect to an unreliable author's web page. Only proceed if you trust the keyboard firmware author. External pages may request sensitive permissions or send data to third-party servers.":
    "信頼できない作者の Web ページには接続しないでください。キーボードファームウェア作者を信頼できる場合のみ続行してください。外部ページは機密性の高い権限を要求したり、第三者のサーバーへデータを送信したりする可能性があります。",
  "Trust this URL and don't warn me again": "この URL を信頼し、今後警告しない",
  "Subsystem index: {{index}}": "サブシステムインデックス: {{index}}",
  "Web UI": "Web UI",
  "No web UI available for this subsystem.":
    "このサブシステムで利用可能な Web UI はありません。",
  "No custom subsystems available. Custom subsystems are provided by the keyboard firmware.":
    "利用可能なカスタムサブシステムはありません。カスタムサブシステムはキーボードファームウェアによって提供されます。",
  "All custom subsystems reported by this device are already supported by DYA Studio.":
    "このデバイスが報告するカスタムサブシステムは、すべて DYA Studio で既にサポートされています。",
  "Already supported by DYA Studio": "DYA Studio で既にサポート済み",
  "These subsystems have a dedicated UI elsewhere in DYA Studio":
    "これらのサブシステムは、DYA Studio の他の場所に専用の UI があります",
  "Custom subsystems are additional features provided by your keyboard firmware author. Web UI links open external pages supplied by the firmware metadata.":
    "カスタムサブシステムは、キーボードファームウェア作者が提供する追加機能です。Web UI リンクは、ファームウェアメタデータで提供された外部ページを開きます。",

  Connect: "接続",
  "Connect via USB": "USB で接続",
  "Connect via Bluetooth": "Bluetooth で接続",
  "Try Demo Mode": "デモモードを試す",
  "Try Demo Mode (no device required)": "デモモードを試す（デバイス不要）",
  "Try demo mode without a keyboard": "キーボードなしでデモモードを試せます",
  "Reconnecting to your keyboard...": "キーボードに再接続中...",
  "DYA Studio is maintained by": "DYA Studio のメンテナー",
  "Special thanks to": "Special thanks to",
  "ZMK community": "ZMK community",
  "Release notes": "リリースノート",
  "Release notes ({{version}})": "リリースノート ({{version}})",
  "Release Notes": "リリースノート",
  "What's new in DYA Studio": "DYA Studio の新機能",
  Back: "戻る",
  Upcoming: "次回リリース予定",
  "No upcoming changes yet.": "次回リリース予定の変更はまだありません。",
  "No changes recorded for this release.":
    "このリリースに記録された変更はありません。",
  Major: "メジャー",
  Minor: "マイナー",
  Patch: "パッチ",
  "Connect via {{method}}": "{{method}} で接続",
  "Data Collection Notice": "データ収集に関するお知らせ",
  "DYA Studio collects your keyboard name and anonymous usage data — such as which features you use, how you connect, and connection errors — for usage analysis. No keymaps, settings, or other keyboard configuration data is ever sent; everything is handled locally on your device.":
    "DYA Studio は利用状況分析のために、キーボード名と匿名の利用データ（使用する機能、接続方法、接続エラーなど）を収集します。キーマップや各種設定など、その他のキーボード設定データが送信されることは一切なく、すべてお使いのデバイス上でローカルに処理されます。",
  "BLE Not Supported on your Browser":
    "このブラウザーは BLE に対応していません",
  "Your browser does not support Web Bluetooth API. Please use a compatible browser like Chrome, Edge, or Bluefy (iOS). BLE device discovery on non-Linux system requires cormoran's ZMK fork + press the studio unlock key on your keyboard.":
    "このブラウザーは Web Bluetooth API に対応していません。Chrome、Edge、Bluefy (iOS) などの対応ブラウザーを使用してください。非 Linux 環境での BLE デバイス検出には、cormoran の ZMK fork とキーボード上の studio unlock キー操作が必要です。",
  "Serial Not Supported on your Browser":
    "このブラウザーはシリアル接続に対応していません",
  "Your browser does not support Web Serial API. Please use a compatible browser. Note that web serial is not available on mobile devices.":
    "このブラウザーは Web Serial API に対応していません。対応ブラウザーを使用してください。Web Serial はモバイルデバイスでは利用できません。",
  "How to Discover your Keyboard via BLE": "BLE でキーボードを検出する方法",
  "Press the studio unlock key on your keyboard for non-linux systems.":
    "非 Linux 環境では、キーボードの studio unlock キーを押してください。",
  "cormoran's ZMK fork is also required for BLE device discovery on non-Linux systems.":
    "非 Linux 環境で BLE デバイスを検出するには cormoran の ZMK fork も必要です。",
  "Agree to start": "同意して開始",
  "compatible browser": "対応ブラウザー",
  "Keyboard Unlock Required": "キーボードのロック解除が必要です",
  "Your keyboard's ZMK Studio is locked. Please unlock it to continue editing your keymap.":
    "キーボードの ZMK Studio がロックされています。キーマップ編集を続けるにはロックを解除してください。",
  "How to Unlock": "ロック解除方法",
  "Press the studio unlock key combination on your keyboard":
    "キーボードで studio unlock キーコンビネーションを押します",
  "Look for a notification or LED indication that confirms unlock":
    "ロック解除を示す通知または LED 表示を確認します",
  "Click Retry below to continue": "下の「再試行」をクリックして続行します",
  "The unlock key combination is typically configured in your ZMK keymap. Check your firmware configuration if you're unsure.":
    "ロック解除キーコンビネーションは通常 ZMK キーマップで設定されています。不明な場合はファームウェア設定を確認してください。",
  Retry: "再試行",

  "Select Key Binding": "キー割り当てを選択",
  "Close on select": "選択時に閉じる",
  Revert: "元に戻す",
  Behavior: "ビヘイビア",
  "Behaviors not loaded from keyboard.":
    "キーボードからビヘイビアを読み込めませんでした。",
  Parameters: "パラメーター",
  param1: "param1",
  param2: "param2",
  "Mouse Button": "マウスボタン",
  "Pointer movement": "ポインター移動",
  Constant: "定数",
  Range: "範囲",
  Keycode: "キーコード",
  Layer: "レイヤー",
  "Unknown Type": "不明な型",
  "Select {{name}}": "{{name}} を選択",
  "Select options": "オプションを選択",
  "Select behavior": "ビヘイビアを選択",
  "Quick Select": "クイック選択",
  "Recently used": "最近使用",
  All: "すべて",
  "Key Press": "キー入力",
  Layers: "レイヤー",
  Modifiers: "修飾キー",
  Mouse: "マウス",
  Transport: "通信",
  System: "システム",
  Misc: "その他",
  Others: "その他",
  "Press a key": "キーを押す",
  "Activate layer while held": "押している間レイヤーを有効化",
  "Switch to layer": "レイヤーへ切り替え",
  "Toggle layer on/off": "レイヤーのオン/オフを切り替え",
  "Layer on hold, key on tap": "長押しでレイヤー、タップでキー",
  "Transparent (pass-through to lower layer)": "透過（下位レイヤーへパス）",
  "No operation": "何もしない",
  "Modifier on hold, key on tap": "長押しで修飾キー、タップでキー",
  "Execute macro": "マクロを実行",
  "Toggle key on/off with each press": "押すたびにキーのオン/オフを切り替え",
  "A sticky key stays pressed until another key is pressed.":
    "別のキーが押されるまで押下状態を維持します。",
  "A sticky layer stays pressed until another key is pressed":
    "別のキーが押されるまでレイヤーを維持します",
  "Caps lock, but automatically deactivates": "自動解除される Caps Lock",
  "Repeat last-pressed key while held":
    "押している間、最後に押したキーを繰り返す",
  "Mouse key press": "マウスボタン入力",
  "Move mouse cursor.": "マウスカーソルを移動します。",
  "Scroll mouse wheel.": "マウスホイールをスクロールします。",
  "Enter bootloader mode": "ブートローダーモードに入る",
  "System reset": "システムリセット",
  "Bluetooth profile management": "Bluetooth プロファイル管理",
  "Output selection (USB/BLE)": "出力先選択（USB/BLE）",
  "Unlock keyboard for ZMK Studio and DYA Studio":
    "ZMK Studio と DYA Studio のためにキーボードをロック解除",
  "Grave(`) on shift or GUI, otherwise Escape":
    "Shift または GUI では Grave(`)、それ以外では Escape",
  "Search keycodes...": "キーコードを検索...",
  "Clear search": "検索をクリア",
  "No keycodes found": "キーコードが見つかりません",
  "Show key layout": "キー配列を表示",
  "Show keycodes by category": "カテゴリ別に表示",
  "Click a key to select its keycode": "キーをクリックしてキーコードを選択",
  Letters: "文字",
  Numbers: "数字",
  Navigation: "ナビゲーション",
  "Function Keys": "ファンクションキー",
  Numpad: "テンキー",
  Media: "メディア",
  Punctuation: "記号",
  International: "国際",
  Miscellaneous: "その他",
  "Select value ({{min}} to {{max}})": "値を選択（{{min}} から {{max}}）",
  "Range: {{min}} to {{max}}": "範囲: {{min}} から {{max}}",
  "Min ({{min}})": "最小（{{min}}）",
  "Max ({{max}})": "最大（{{max}}）",
  "Quick Presets (default: ±{{defaultValue}})":
    "クイックプリセット（デフォルト: ±{{defaultValue}}）",
  "Custom Values (range: -32768 to 32767)":
    "カスタム値（範囲: -32768 から 32767）",
  "X-axis (Horizontal)": "X 軸（水平）",
  "Y-axis (Vertical)": "Y 軸（垂直）",
  "- = Left, + = Right": "- = 左, + = 右",
  "- = Down, + = Up": "- = 下, + = 上",
  "- = Up, + = Down": "- = 上, + = 下",
  "Current: X={{x}}, Y={{y}} (encoded: 0x{{encoded}})":
    "現在値: X={{x}}, Y={{y}}（エンコード: 0x{{encoded}}）",
  "Move Up": "上へ移動",
  "Move Down": "下へ移動",
  "Move Left": "左へ移動",
  "Move Right": "右へ移動",
  "Scroll Up": "上へスクロール",
  "Scroll Down": "下へスクロール",
  "Scroll Left": "左へスクロール",
  "Scroll Right": "右へスクロール",
  "Left Click": "左クリック",
  "Right Click": "右クリック",
  "Middle Click": "中央クリック",
  "Button 4": "ボタン 4",
  "Button 5": "ボタン 5",
  "Rotary Encoder Configuration": "ロータリーエンコーダー設定",
  "The value is saved in real-time upon selection for now.":
    "現在、値は選択時にリアルタイムで保存されます。",
  "Rotary Encoder": "ロータリーエンコーダー",
  "Counter-clockwise": "反時計回り",
  Clockwise: "時計回り",
  "Tap Time": "タップ時間",
  "Time between rotation triggers": "回転トリガー間の時間",
  "pending to save...": "保存待ち...",
  "For scroll or mouse move, tap time need to be > behavior-input-two-axis's trigger-period-ms (default 16ms).":
    "スクロールまたはマウス移動では、タップ時間を behavior-input-two-axis の trigger-period-ms（デフォルト 16ms）より大きくする必要があります。",
  "Loading sensors...": "センサーを読み込み中...",
  "No rotary encoders detected": "ロータリーエンコーダーが検出されません",
  Trans: "透過",
  "Behavior {{id}}": "ビヘイビア {{id}}",
  "Reset to original": "元に戻す",
  Binding: "割り当て",
  Original: "元の割り当て",
  disabled: "無効",
  Type: "種類",
  Links: "リンク",

  "Diagnose keyboard problems and create a support report":
    "キーボードの問題を診断し、サポートレポートを作成します",
  "Copy Support Report": "サポートレポートをコピー",
  "Refresh All": "すべて更新",
  "Refresh all sections": "すべてのセクションを更新",
  "Copied!": "コピーしました！",
  "If your keyboard misbehaves, review the sections below. Use 'Copy Support Report' and paste the result when contacting your keyboard's seller.":
    "キーボードの動作がおかしい場合は、以下のセクションを確認してください。「サポートレポートをコピー」を使用し、キーボードの販売元に問い合わせる際にその内容を貼り付けてください。",
  "If a section is not available, it shows which firmware module enables it.":
    "セクションが利用できない場合は、それを有効にするファームウェアモジュールが表示されます。",
  "Not available on this keyboard.": "このキーボードでは利用できません。",
  "No data loaded yet.": "まだデータが読み込まれていません。",

  "Device Info": "デバイス情報",
  "Build, hardware and runtime details reported by firmware":
    "ファームウェアが報告するビルド、ハードウェア、ランタイムの詳細",
  "Refresh device info": "デバイス情報を更新",
  Build: "ビルド",
  "ZMK Version": "ZMK バージョン",
  "ZMK Config Version": "ZMK Config バージョン",
  "Module Version": "モジュールバージョン",
  "Zephyr Version": "Zephyr バージョン",
  "Build Timestamp": "ビルド日時",
  Board: "ボード",
  dirty: "変更あり",
  Hardware: "ハードウェア",
  "Device ID": "デバイス ID",
  "Reset Cause": "リセット原因",
  Flash: "フラッシュ",
  SRAM: "SRAM",
  "ZMK Configuration": "ZMK 設定",
  KScan: "KScan",
  Split: "分割",
  "enabled ({{count}} profiles)": "有効（{{count}} プロファイル）",
  enabled: "有効",
  USB: "USB",
  Display: "ディスプレイ",
  "RGB Underglow": "RGB アンダーグロー",
  Backlight: "バックライト",
  "Battery Level": "バッテリー残量",
  Runtime: "ランタイム",
  Uptime: "稼働時間",
  "Zephyr Devices": "Zephyr デバイス",
  "{{count}} not ready": "{{count}} 件未準備",
  "all ready": "すべて準備完了",
  OK: "OK",
  "{{count}} devices not ready": "{{count}} 台のデバイスが未準備",

  "Stability (Watchdog)": "安定性（ウォッチドッグ）",
  "Freeze, crash and unexpected reset incidents":
    "フリーズ、クラッシュ、予期しないリセットの発生履歴",
  "Refresh incidents": "発生履歴を更新",
  Central: "中央側",
  "Peripheral {{n}}": "周辺側 {{n}}",
  Capacity: "容量",
  Stored: "保存件数",
  "Dropped since boot": "起動後の破棄件数",
  "Incident storage is full — recording is paused. Delete incidents to resume.":
    "発生履歴の保存領域が満杯です。記録が一時停止しています。再開するには履歴を削除してください。",
  "No incidents recorded — your keyboard looks stable.":
    "発生履歴はありません。キーボードは安定しているようです。",
  "{{count}} incidents": "発生件数 {{count}} 件",
  "No incidents": "発生なし",
  "recording paused": "記録一時停止中",
  "Boot / Uptime": "起動 / 稼働時間",
  Detail: "詳細",
  "Delete incident {{id}}": "発生履歴 {{id}} を削除",
  "Delete all": "すべて削除",
  "Delete all incidents?": "すべての発生履歴を削除しますか？",
  "This will permanently delete all recorded incidents from your keyboard.":
    "キーボード上のすべての発生履歴データが完全に削除されます。",
  "This action cannot be undone.": "この操作は元に戻せません。",

  Freeze: "フリーズ",
  Crash: "クラッシュ",
  queue: "キュー",
  thread: "スレッド",
  "Unknown fault": "不明な障害",

  // ELF analysis
  "Upload ELF to resolve PC/LR symbols":
    "ELFをアップロードしてPC/LRシンボルを解決",
  "Upload ELF": "ELFをアップロード",
  "Change ELF": "ELFを変更",
  "Remove ELF": "ELFを削除",
  "Loading…": "読み込み中…",
  "ELF: {{name}}": "ELF: {{name}}",
  "{{n}} symbols, line info": "{{n}} シンボル（行情報あり）",
  "{{n}} symbols": "{{n}} シンボル",

  // Reset cause bits (Zephyr hwinfo)
  "External Pin": "外部ピン",
  Software: "ソフトウェア",
  Brownout: "ブラウンアウト",
  "Power-On": "電源投入",
  Watchdog: "ウォッチドッグ",
  Debug: "デバッグ",
  Security: "セキュリティ",
  "Low Power Wake": "低消費電力からの復帰",
  "CPU Lockup": "CPUロックアップ",
  "Parity Error": "パリティエラー",
  "PLL Error": "PLLエラー",
  "Clock Error": "クロックエラー",
  "Hardware Reset": "ハードウェアリセット",
  "User Reset": "ユーザーリセット",
  Temperature: "温度",

  // Fatal crash reason codes (Zephyr k_fatal_error_reason + ARM arch codes)
  "CPU exception": "CPU例外",
  "Spurious interrupt": "スプリアス割り込み",
  "Stack overflow (corruption detected)":
    "スタックオーバーフロー（破損を検出）",
  "Kernel oops": "カーネルOops（中程度のソフトウェアエラー）",
  "Kernel panic": "カーネルパニック（重大なソフトウェアエラー）",
  "Memory fault": "メモリフォルト",
  "Memory fault while stacking": "スタック処理中のメモリフォルト",
  "Memory fault while unstacking": "アンスタック処理中のメモリフォルト",
  "Memory fault: data access": "メモリフォルト：データアクセス",
  "Memory fault: instruction access": "メモリフォルト：命令アクセス",
  "Memory fault: FP lazy state preservation": "メモリフォルト：FP遅延状態保存",
  "Bus fault": "バスフォルト",
  "Bus fault while stacking": "スタック処理中のバスフォルト",
  "Bus fault while unstacking": "アンスタック処理中のバスフォルト",
  "Bus fault: precise data bus error": "バスフォルト：precise データバスエラー",
  "Bus fault: imprecise data bus error":
    "バスフォルト：imprecise データバスエラー",
  "Bus fault: instruction bus error": "バスフォルト：命令バスエラー",
  "Bus fault: FP lazy state preservation": "バスフォルト：FP遅延状態保存",
  "Usage fault": "使用エラー（Usage Fault）",
  "Usage fault: division by zero": "使用エラー：ゼロ除算",
  "Usage fault: unaligned access": "使用エラー：非アラインアクセス",
  "Usage fault: stack overflow": "使用エラー：スタックオーバーフロー",
  "Usage fault: no coprocessor": "使用エラー：コプロセッサなし",
  "Usage fault: illegal EXC_RETURN": "使用エラー：不正なEXC_RETURN",
  "Usage fault: illegal EPSR state": "使用エラー：不正なEPSR状態",
  "Usage fault: undefined instruction": "使用エラー：未定義命令",
  "Secure fault": "セキュアフォルト",
  "Secure fault: entry point": "セキュアフォルト：エントリポイント",
  "Secure fault: integrity signature": "セキュアフォルト：整合性シグネチャ",
  "Secure fault: exception return": "セキュアフォルト：例外リターン",
  "Secure fault: attribution unit": "セキュアフォルト：属性ユニット",
  "Secure fault: transition": "セキュアフォルト：遷移",
  "Secure fault: lazy state preservation": "セキュアフォルト：遅延状態保存",
  "Secure fault: lazy state error": "セキュアフォルト：遅延状態エラー",
  "Undefined instruction": "未定義命令",
  "Alignment fault": "アラインメントフォルト",
  "Background fault": "バックグラウンドフォルト",
  "Permission fault": "パーミッションフォルト",
  "Synchronous external abort": "同期的な外部アボート",
  "Asynchronous external abort": "非同期の外部アボート",
  "Synchronous parity error": "同期的なパリティエラー",
  "Asynchronous parity error": "非同期のパリティエラー",
  "Debug event": "デバッグイベント",
  "Translation fault": "アドレス変換フォルト",
  "Unsupported exclusive access fault": "非対応の排他アクセスフォルト",

  "Key Switches": "キースイッチ",
  "Key press statistics and chatter detection":
    "キー押下統計とチャタリング検出",
  "Refresh key switch statistics": "キースイッチ統計を更新",
  Devices: "デバイス数",
  Statistics: "統計",
  Disabled: "無効",
  "Total presses": "総押下回数",
  "debounce {{press}}/{{release}}ms": "デバウンス {{press}}/{{release}}ms",
  "poll {{ms}}ms": "ポーリング {{ms}}ms",
  "No chatter or anomalies detected.":
    "チャタリングや異常は検出されませんでした。",
  "Suspect keys (possible chatter or stuck switch) — position numbers follow the keymap order.":
    "疑わしいキー（チャタリングまたはスイッチの固着の可能性）— 位置番号はキーマップの順序に従います。",
  Position: "位置",
  Presses: "押下回数",
  Releases: "離した回数",
  "Min gap (ms)": "最小間隔 (ms)",
  "Reset statistics": "統計をリセット",
  "Reset key statistics?": "キー統計をリセットしますか？",
  "This will reset all key press statistics recorded on your keyboard.":
    "キーボード上に記録されたすべてのキー押下統計がリセットされます。",
  "Driver details & statistics": "ドライバー詳細と統計",
  "Untested keys (0 presses)": "未検証キー（押下回数 0）",
  "Loading keyboard wiring…": "キーボードの配線情報を読み込み中…",
  "Unlock your keyboard to show the interactive key map.":
    "インタラクティブなキーマップを表示するにはキーボードのロックを解除してください。",
  "{{count}} suspect keys": "疑わしいキー {{count}} 件",

  Untested: "未検証",
  "No record (0 presses)": "記録なし（押下回数 0）",
  "Suspect (chatter or mismatch)": "疑わしい（チャタリングまたは不一致）",
  "No wiring info (split peripheral half)":
    "配線情報なし（分割キーボードの周辺側）",
  "Wiring info unavailable (split peripheral half)":
    "配線情報が利用できません（分割キーボードの周辺側）",
  "Position {{position}}": "位置 {{position}}",
  "Row {{row}} / Col {{col}}": "行 {{row}} / 列 {{col}}",
  "Row line": "行ライン",
  "Col line": "列ライン",
  Debounce: "デバウンス",
  "Min repress gap": "最小再押下間隔",
  Chatter: "チャタリング",

  "Trackball Sensor (PMW3610)": "トラックボールセンサー (PMW3610)",
  "Optical sensor health and surface diagnostics":
    "光学センサーの状態と表面診断",
  "Refresh sensor info": "センサー情報を更新",
  "Unlock your keyboard to read sensor diagnostics.":
    "センサー診断を読み取るにはキーボードのロックを解除してください。",
  "Press the studio unlock key combination on your keyboard, then refresh.":
    "キーボードで Studio のロック解除キーの組み合わせを押してから、更新してください。",
  "No sensors reported.": "センサーが報告されていません。",
  Ready: "準備完了",
  "Product ID": "プロダクト ID",
  Revision: "リビジョン",
  "Init error": "初期化エラー",
  "Force awake": "強制起動状態",
  yes: "はい",
  no: "いいえ",
  "Read surface diagnostics": "表面診断を読み取る",
  "Sensor sees no surface — check the ball and lens.":
    "センサーが表面を検出できません。ボールとレンズを確認してください。",
  "Poor tracking surface.": "トラッキング表面の状態が良くありません。",
  "Surface tracking OK.": "表面トラッキングは正常です。",
  "init error": "初期化エラー",

  "Param 1": "パラメータ1",
  "Param 2": "パラメータ2",

  "Live sensor view": "センサーのライブビュー",
  "Capture Once": "1回キャプチャ",
  "Capturing…": "キャプチャ中…",
  "Start Streaming": "ストリーミング開始",
  "Stop Streaming": "ストリーミング停止",
  "Pixels captured": "キャプチャ済みピクセル数",
  Complete: "完了",
  "Capture time": "キャプチャ時間",
  "FPS (streaming)": "FPS（ストリーミング中）",
  "Debug Tool": "デバッグツール",

  "Stack Usage": "スタック使用量",
  "Per-thread stack high-water usage (zmk-module-devtool)":
    "スレッドごとのスタック最高水位使用量（zmk-module-devtool）",
  "Refresh stack usage": "スタック使用量を更新",
  "Auto-refresh": "自動更新",
  Requires: "必須：",
  "in your firmware. Without it the RPC returns an error below.":
    "がファームウェアで有効になっている必要があります。有効でない場合、下に RPC エラーが表示されます。",
  "{{count}} thread(s) · sorted by usage": "{{count}} スレッド · 使用率順",
  "No stack data yet — press Refresh or enable Auto-refresh.":
    "まだデータがありません。「更新」ボタンを押すか「自動更新」を有効にしてください。",

  // Feature docs (DocTip) — Macros
  "What are Macros?": "マクロとは？",
  "A macro plays back a saved sequence of key actions when you trigger it with a single key.":
    "マクロは、1 つのキーで発動すると、保存したキー操作の連続動作を再生します。",
  "Typical uses": "主な用途",
  "Type text, symbols, or emoji that need several keystrokes":
    "複数の打鍵が必要な文字・記号・絵文字を入力する",
  "Fire an app or OS shortcut with one press":
    "アプリや OS のショートカットを 1 押しで実行する",
  "Chain presses, holds, and waits into one action":
    "押下・長押し・待機を 1 つの動作にまとめる",
  "In DYA Studio": "DYA Studio では",
  "Create and edit the action sequence of each macro":
    "各マクロの動作シーケンスを作成・編集できます",
  "Bind a macro to a key from the Keymap tab":
    "キーマップタブからマクロをキーに割り当てられます",
  "Tune global timing such as wait and tap time":
    "待機時間やタップ時間などの全体タイミングを調整できます",

  // Feature docs (DocTip) — Combos
  "What are Combos?": "コンボとは？",
  "A combo turns pressing several keys at once into a different key or behavior.":
    "コンボは、複数のキーの同時押しを別のキーや動作に変換します。",
  "Add extra keys without extra physical keys (e.g. Esc from J+K)":
    "物理キーを増やさずにキーを追加する（例：J+K で Esc）",
  "Reach symbols or layer switches from your home row":
    "ホームポジションから記号やレイヤー切り替えに届く",
  "How it works": "仕組み",
  "Press the chosen key positions together within a time window":
    "指定したキー位置を制限時間内に同時に押す",
  "Tune the timeout, active layers, and release behavior per combo":
    "コンボごとにタイムアウト・有効レイヤー・離し時の挙動を調整できます",

  // Feature docs (DocTip) — Processors
  "What are Processors?": "プロセッサとは？",
  "Input processors transform trackball motion before it becomes pointer or scroll output, and can be turned on per layer.":
    "入力プロセッサは、トラックボールの動きをポインタやスクロール出力になる前に変換し、レイヤーごとに有効化できます。",
  "Switch the trackball between moving the cursor and scrolling":
    "トラックボールをカーソル移動とスクロールで切り替える",
  "Adjust sensitivity, or swap and invert the axes":
    "感度を調整したり、軸を入れ替え・反転したりする",
  "Choose which layers each processor is active on":
    "各プロセッサを有効にするレイヤーを選ぶ",
  "Optionally hold a temporary layer while the trackball moves":
    "トラックボールの動作中に一時レイヤーを保持する（任意）",

  // Feature docs (DocTip) — Default layers
  "What are Default Layers?": "デフォルトレイヤーとは？",
  "A default layer is the keymap layer your keyboard activates automatically for a given connection.":
    "デフォルトレイヤーは、特定の接続に対してキーボードが自動的に有効化するキーマップレイヤーです。",
  "Per connection": "接続ごと",
  "Pick a layer for each connection target (USB and BLE profiles)":
    "接続先（USB や BLE プロファイル）ごとにレイヤーを選ぶ",
  "It switches automatically when that connection becomes active":
    "その接続がアクティブになると自動的に切り替わる",
  "Choose 'Follow OS detection' to use the Per-OS Default Layers instead":
    "「OS 検出に従う」を選ぶと、代わりに OS 別デフォルトレイヤーが使われる",
  "The layer set for the detected OS (Windows, macOS, …) is applied":
    "検出された OS（Windows、macOS など）に設定したレイヤーが適用される",

  // Feature docs (DocTip) — PMW3610 driver
  "What is the PMW3610 driver?": "PMW3610 ドライバとは？",
  "PMW3610 is the optical sensor inside the trackball. Its driver exposes low-level tuning for how motion is read.":
    "PMW3610 はトラックボール内部の光学センサです。ドライバは動きの読み取り方を低レベルで調整する項目を提供します。",
  "Typical settings": "主な設定",
  "CPI / sensitivity of the sensor": "センサの CPI／感度",
  "Orientation, axis rotation, and inversion": "向き・軸の回転・反転",
  "Polling rate and sleep / power behavior":
    "ポーリングレートやスリープ／電力の挙動",
  Note: "補足",
  "These values are read from and written to your keyboard's firmware. Change them in small steps.":
    "これらの値はキーボードのファームウェアから読み書きされます。少しずつ変更してください。",

  // Version history — reset dropdown
  Versions: "バージョン",
  "Reset to initial state": "初期状態に戻す",
  "Saved versions": "保存されたバージョン",
  "No versions saved yet. A version is saved each time this tab reads the keyboard and finds something changed.":
    "保存されたバージョンはまだありません。このタブがキーボードを読み込み、前回との差分があったときにバージョンが保存されます。",
  "Restores the keyboard's built-in default keymap and writes it to flash immediately.":
    "キーボード内蔵のデフォルトキーマップに戻し、すぐにフラッシュへ書き込みます。",
  "Drops the unsaved edits in keyboard memory and reloads the keymap stored on the keyboard.":
    "キーボードのメモリ上にある未保存の編集を破棄し、キーボードに保存済みのキーマップを読み直します。",
  "Puts every macro and combo back to the firmware's compile-time defaults.":
    "すべてのマクロとコンボをファームウェアのビルド時デフォルトに戻します。",
  "Drops the edits held in keyboard memory and reloads the macros and combos saved on the keyboard.":
    "キーボードのメモリ上にある編集を破棄し、キーボードに保存済みのマクロとコンボを読み直します。",
  "Reset every runtime macro and combo to the firmware defaults? Your customizations will be lost.":
    "すべてのランタイムマクロとコンボをファームウェアのデフォルトに戻しますか？カスタマイズは失われます。",
  "Wipes every persisted setting on the keyboard — keymap included — back to the firmware defaults.":
    "キーマップを含め、キーボードに保存されたすべての設定をファームウェアのデフォルトに戻します。",

  // Version history — diff modal
  "Restore this version?": "このバージョンに戻しますか？",
  "Saved {{timestamp}}. The values below are written to keyboard memory — press Save afterwards to store them permanently.":
    "{{timestamp}} に保存されたバージョンです。以下の値がキーボードのメモリに書き込まれます。恒久的に保存するには、その後「保存」を押してください。",
  "Reading the current state from the keyboard...":
    "キーボードから現在の状態を読み込み中...",
  "This version matches the current state — nothing to write.":
    "このバージョンは現在の状態と同じです。書き込む変更はありません。",
  "Write to keyboard": "キーボードに書き込む",
  Field: "項目",
  "Selected version": "選択したバージョン",
  "and {{count}} more changes": "他 {{count}} 件の変更",
  "(source {{source}})": "(ソース {{source}})",

  // Version history — field names in the diff
  "Physical layout": "物理レイアウト",
  "Layer {{index}}": "レイヤー {{index}}",
  "{{layer}} › Name": "{{layer}} › 名前",
  "{{layer}} › Layer ID": "{{layer}} › レイヤー ID",
  "{{layer}} › Key {{position}}": "{{layer}} › キー {{position}}",
  "Macro {{index}}": "マクロ {{index}}",
  "{{macro}} › Name": "{{macro}} › 名前",
  "{{macro}} › Step {{step}}": "{{macro}} › ステップ {{step}}",
  "Macro tap duration (ms)": "マクロのタップ時間 (ms)",
  "Key positions": "キー位置",
  "Timeout (ms)": "タイムアウト (ms)",
  "Require prior idle (ms)": "直前アイドル要求 (ms)",
  "Combo timeout (ms)": "コンボのタイムアウト (ms)",
  "Combo slow release": "コンボのスローリリース",
  "Combo require prior idle (ms)": "コンボの直前アイドル要求 (ms)",
  "Delay {{ms}} ms": "{{ms}} ms 待機",
  "Type text": "文字列を入力",
  Press: "押す",
  Release: "離す",
  "Profile {{index}} › Name": "プロファイル {{index}} › 名前",
  "Output priority": "出力の優先度",
  "Default layer › Connection {{index}}": "デフォルトレイヤー › 接続 {{index}}",
  "Default layer › OS {{os}}": "デフォルトレイヤー › OS {{os}}",
  "Sensitivity multiplier": "感度の倍率",
  "Sensitivity divisor": "感度の除数",
  "Rotation (degrees)": "回転 (度)",
  "Temporary layer enabled": "一時レイヤーの有効化",
  "Temporary layer": "一時レイヤー",
  "Temporary layer activation delay (ms)": "一時レイヤーの有効化遅延 (ms)",
  "Temporary layer deactivation delay (ms)": "一時レイヤーの解除遅延 (ms)",
  "Active layers": "有効なレイヤー",
  "Axis snap mode": "軸スナップのモード",
  "Axis snap threshold": "軸スナップのしきい値",
  "Axis snap timeout (ms)": "軸スナップのタイムアウト (ms)",
  "Invert X": "X を反転",
  "Invert Y": "Y を反転",
  "XY to scroll": "XY をスクロールに変換",
  "Swap XY": "XY を入れ替え",
  "Idle timeout": "アイドルタイムアウト",
  "Deep sleep timeout": "ディープスリープのタイムアウト",
  // Import/Export (Keyboard Abyss)
  "Import/Export": "インポート／エクスポート",
  "Sync keymaps with Keyboard Abyss": "Keyboard Abyss とキーマップを同期します",
  "Keyboard Abyss": "Keyboard Abyss",
  "Sign in to import and export keymaps.":
    "サインインするとキーマップのインポート／エクスポートができます。",
  "Sign in with Abyss": "Abyss でサインイン",
  "Sign out": "サインアウト",
  "A sign-in window opens at {{host}}. Your session lasts until this tab is closed.":
    "{{host}} のサインイン画面が開きます。セッションはこのタブを閉じるまで有効です。",
  Export: "エクスポート",
  Import: "インポート",
  "Upload the connected keyboard's keymap to Abyss, either as a new keymap or as a new version of an existing one.":
    "接続中のキーボードのキーマップを、新規キーマップまたは既存キーマップの新しいバージョンとして Abyss にアップロードします。",
  "Pick a compatible keymap from Abyss, review what would change, and write it to the connected keyboard.":
    "Abyss から互換性のあるキーマップを選び、変更内容を確認したうえで接続中のキーボードに書き込みます。",
  "Not available yet — this is still being built.":
    "まだ利用できません（実装中です）。",

  // Import/Export — device snapshot
  "Keyboard snapshot": "キーボードの読み取り",
  "Read the keyboard before exporting or importing.":
    "エクスポート／インポートの前にキーボードを読み取ってください。",
  "Read keyboard": "キーボードを読み取る",
  "Read again": "再読み取り",
  "Connected keyboard": "接続中のキーボード",
  "Reading the keyboard. This is slower over Bluetooth than USB.":
    "キーボードを読み取っています。Bluetooth 接続では USB より時間がかかります。",
  "Matching the layout on Abyss...": "Abyss 上のレイアウトと照合しています...",
  Keys: "キー数",
  Modules: "モジュール",
  "Matched the Abyss layout {{layout}}.":
    "Abyss のレイアウト {{layout}} と一致しました。",
  "No exact layout match. Exporting will add a new variation of {{layout}}.":
    "完全に一致するレイアウトがありません。エクスポートすると {{layout}} の新しいバリエーションが作成されます。",
  "This layout is not registered on Abyss yet. Exporting will add it.":
    "このレイアウトはまだ Abyss に登録されていません。エクスポート時に追加されます。",
  "This keyboard is not registered on Abyss yet. Exporting will create it under your account.":
    "このキーボードはまだ Abyss に登録されていません。エクスポート時にあなたのアカウントで作成されます。",

  // Import/Export — export section
  "Read the keyboard first to enable exporting.":
    "エクスポートするには、先にキーボードを読み取ってください。",
  "Exporting uploads this keymap to {{host}} under your account.":
    "エクスポートすると、このキーマップがあなたのアカウントで {{host}} にアップロードされます。",
  Destination: "保存先",
  "Export as a new keymap": "新しいキーマップとしてエクスポート",
  "Update an existing keymap": "既存のキーマップを更新",
  "Export as new keymap": "新規キーマップとしてエクスポート",
  "Update keymap": "キーマップを更新",
  "Keymap name": "キーマップ名",
  "Keymap to update": "更新するキーマップ",
  "Loading your keymaps...": "キーマップを読み込んでいます...",
  "No keymaps found for this keyboard":
    "このキーボード用のキーマップが見つかりません",
  "Select a keymap": "キーマップを選択",
  "Saved to Abyss as version {{version}}.":
    "Abyss にバージョン {{version}} として保存しました。",
  "Open on Abyss": "Abyss で開く",
  Include: "含める項目",
  "Keymap (layers & key bindings)": "キーマップ（レイヤーとキー割り当て）",
  // "Combos" and "Macros" are already translated above, shared with the
  // Macro & Combo tab.
  "Module settings": "モジュール設定",

  Visibility: "公開設定",
  "Private — only you": "非公開 — 自分のみ",
  "Public — anyone can find it": "公開 — 誰でも閲覧できます",
  "Keymap JSON to upload": "アップロードする keymap JSON",
  "Layout JSON to upload": "アップロードする layout JSON",
  "Not available.": "利用できません。",

  // Import/Export — visual diff preview
  // "Layers" and "Keys" are already translated above.
  "Key {{index}}": "キー {{index}}",
  "No layout geometry available for a preview.":
    "プレビュー用のレイアウト情報がありません。",
  "This layer does not exist in the selected keymap.":
    "選択したキーマップにこのレイヤーはありません。",
  "No keys": "キーなし",
  "Unnamed macro": "名前のないマクロ",
  "No steps": "ステップなし",
  "wait {{ms}}ms": "{{ms}}ms 待機",
  "tap {{ms}}ms": "{{ms}}ms タップ",
  Added: "追加",
  Removed: "削除",
  Changed: "変更",
  Raw: "生データ",

  // Import/Export — JSON diff modal
  "Review changes": "変更内容を確認",
  "Review changes as JSON": "JSON で変更内容を確認",
  "Changes to upload": "アップロードする変更",
  "Changes to write": "書き込む変更",
  "Left: the keymap currently on Abyss. Right: what this export would save.":
    "左: 現在 Abyss にあるキーマップ。右: このエクスポートで保存される内容。",
  "Left: what is on the keyboard now. Right: the keymap from Abyss.":
    "左: 現在キーボードにある内容。右: Abyss のキーマップ。",
  Inline: "インライン",
  "Side by side": "左右に並べる",
  "Around changes": "変更箇所のみ",
  "Entire file": "ファイル全体",
  "No differences.": "差分はありません。",
  // "Close" is already translated near the top of this dictionary.

  // Import/Export — Abyss links
  "Open this keyboard on Abyss": "このキーボードを Abyss で開く",
  "Register on Abyss": "Abyss で登録する",
  "This keyboard is not registered on Abyss yet. Register it on Abyss first so exports land in the catalog.":
    "このキーボードはまだ Abyss に登録されていません。エクスポートをカタログに反映させるには、先に Abyss で登録してください。",

  // Import/Export — import section
  "Read the keyboard first to enable importing.":
    "インポートするには、先にキーボードを読み取ってください。",
  "Writing changes the keyboard. Review the changes before confirming.":
    "書き込みはキーボードを変更します。確認する前に変更内容を確認してください。",
  "Keymap to write": "書き込むキーマップ",
  "No compatible keymaps found for this keyboard":
    "このキーボードと互換性のあるキーマップが見つかりません",
  "Loading the keymap...": "キーマップを読み込んでいます...",
  "The keyboard already matches this keymap.":
    "キーボードはすでにこのキーマップと一致しています。",
  "Written to the keyboard and re-read to confirm.":
    "キーボードに書き込み、再読み取りで確認しました。",
  "Write {{count}} changes to the keyboard? This replaces the current settings and cannot be undone.":
    "{{count}} 件の変更をキーボードに書き込みますか？現在の設定を置き換え、元に戻せません。",
  // "Cancel" is already translated near the top of this dictionary.

  // Import/Export — diff view
  "{{count}} changes": "{{count}} 件の変更",
  Rename: "名前の変更",
  Module: "モジュール",
  "Show all {{count}} keys": "{{count}} 件すべて表示",
  "This replaces most of the keymap ({{count}} keys). The full list is long.":
    "キーマップの大部分を置き換えます（{{count}} キー）。一覧は非常に長くなります。",
  "Show the full list anyway": "それでも一覧を表示",
  bindings: "キー割り当て",
  "layer names": "レイヤー名",
  combos: "コンボ",
  macros: "マクロ",
  modules: "モジュール",

  // Import/Export — pre-flight checks
  "This keymap has {{target}} keys per layer but the keyboard has {{device}}.":
    "このキーマップは1レイヤーあたり {{target}} キーですが、キーボードは {{device}} キーです。",
  "This keymap covers {{target}} of the keyboard's {{device}} keys. The rest are left unchanged.":
    "このキーマップはキーボードの {{device}} キーのうち {{target}} キーを対象にしています。残りは変更されません。",
  "Writing needs {{needed}} layers; the keyboard has {{device}}. The missing ones will be added.":
    "書き込みには {{needed}} レイヤーが必要ですが、キーボードには {{device}} レイヤーあります。不足分は追加されます。",
  "This keymap was made for the {{target}} layout; the keyboard reports {{device}}.":
    "このキーマップは {{target}} レイアウト向けですが、キーボードは {{device}} と報告しています。",

  // Import/Export — OAuth callback route
  "Completing Abyss sign-in...": "Abyss のサインインを完了しています...",
  "Signed in to Abyss": "Abyss にサインインしました",
  "You can close this window.": "このウィンドウは閉じて構いません。",
  "Abyss sign-in failed": "Abyss のサインインに失敗しました",
  "Back to DYA Studio": "DYA Studio に戻る",

  // Import/Export — error messages
  "Your Abyss session expired. Please log in again.":
    "Abyss のセッションが失効しました。もう一度サインインしてください。",
  "Your Abyss account does not have permission for this action.":
    "この操作を行う権限が Abyss アカウントにありません。",
  "This keymap no longer exists on Abyss.":
    "このキーマップは Abyss 上に存在しません。",
  "Abyss rejected this keymap. It may not match the connected keyboard.":
    "Abyss がこのキーマップを受け付けませんでした。接続中のキーボードと一致していない可能性があります。",
  "Too many requests to Abyss. Please wait a moment and try again.":
    "Abyss へのリクエストが多すぎます。しばらく待ってから再試行してください。",
  "Abyss is having trouble right now. Please try again later.":
    "現在 Abyss に問題が発生しています。時間をおいて再試行してください。",
  "Could not reach Abyss. Check your network connection.":
    "Abyss に接続できませんでした。ネットワーク接続を確認してください。",
  "The keyboard is locked. Unlock it and try again.":
    "キーボードがロックされています。ロックを解除して再試行してください。",
  "Abyss login was cancelled.": "Abyss のサインインがキャンセルされました。",
  "Abyss sign-in could not be completed. Please start again from the Import/Export tab.":
    "Abyss のサインインを完了できませんでした。インポート／エクスポートタブからやり直してください。",
  "Something went wrong talking to Abyss.":
    "Abyss との通信で問題が発生しました。",
  "Abyss is not configured for this build.":
    "このビルドには Abyss の設定がありません。",
};

const dictionaries: Record<Language, Record<string, string>> = {
  en: {},
  ja,
};

export function translate(
  language: Language,
  key: string,
  params?: TranslationParams,
): string {
  const template = dictionaries[language][key] ?? key;
  if (!params) {
    return template;
  }
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
    template,
  );
}
