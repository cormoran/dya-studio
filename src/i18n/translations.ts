export type Language = "en" | "ja" | "zh";

export type TranslationParams = Record<string, string | number>;

export const languageLabels: Record<Language, string> = {
  en: "English",
  ja: "日本語",
  zh: "中文",
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
  "Keymap layers": "キーマップのレイヤー",
  "Keyboard layout for {{layer}}": "{{layer}} のキーボード配列",
  "Key position {{position}}: {{binding}}":
    "キー位置 {{position}}: {{binding}}",
  "Reset key position {{position}} to original":
    "キー位置 {{position}} を元の割り当てに戻す",
  "Reset key position {{position}} to default":
    "キー位置 {{position}} をデフォルトに戻す",
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
  "Keyboard developer guide": "キーボード開発者向けガイド",
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

const zh: Record<string, string> = {
  "DYA Studio for DYA & ZMK Keyboards": "面向 DYA 和 ZMK 键盘的 DYA Studio",
  "The operation failed because the device is locked in ZMK Studio. Unlock the keyboard and try again.":
    "操作失败，因为设备在 ZMK Studio 中处于锁定状态。请解锁键盘后重试。",
  Home: "首页",
  Keymap: "键位",
  Macro: "宏",
  Combo: "组合键",
  Trackball: "轨迹球",
  BLE: "BLE",
  Settings: "设置",
  Troubleshooting: "故障排查",
  Subsystems: "子系统",
  Connected: "已连接",
  Disconnect: "断开连接",
  "Connect Keyboard": "连接键盘",
  "Connecting...": "连接中...",
  "Switch to light mode": "切换到亮色模式",
  "Switch to dark mode": "切换到暗色模式",
  Language: "语言",
  "Switch language": "切换语言",
  Refresh: "刷新",
  Cancel: "取消",
  Continue: "继续",
  Open: "打开",
  Close: "关闭",
  Clear: "清除",
  Set: "设置",
  Save: "保存",
  "Saving...": "保存中...",
  Reset: "重置",
  Discard: "放弃",
  Delete: "删除",
  New: "新建",
  Apply: "应用",
  Enabled: "已启用",
  Dismiss: "关闭",
  Loading: "加载中",
  "Never show again": "不再显示",
  "Welcome to DYA Studio": "欢迎使用 DYA Studio",
  "DYA Studio is yet another ZMK Studio for DYA keyboard series, designed by cormoran707":
    "DYA Studio 是由 cormoran707 设计的、面向 DYA 键盘系列的另一款 ZMK Studio",
  "Share on X": "分享到 X",
  "DYA is pronounced dai-a.": "DYA 的发音是 dai-a（读作“迪亚”）。",
  "cormoran is pronounced cormoran [kˈɔɚm(ə)rən].":
    "cormoran 的发音是 cormoran [kˈɔɚm(ə)rən]（读作“科莫兰”）。",
  "Features - What you can do with DYA Studio":
    "功能 - DYA Studio 能做什么",
  "You can customize keymaps with a slightly easier UI, equivalent to ZMK Studio.":
    "使用更简洁的界面自定义键位，功能上等同于 ZMK Studio。",
  "You can configure trackball sensitivity, auto layer switching and various input processor settings.":
    "可配置轨迹球灵敏度、自动切换层以及各种输入处理器设置。",
  "You can inspect device diagnostics and generate a troubleshooting report to share when asking for support.":
    "可查看设备诊断信息，并生成可分享的故障排查报告以寻求支持。",
  "You can name BLE connection targets and unpair them.":
    "可以为 BLE 连接目标命名，也可以取消配对。",
  "You can change various settings such as the time to enter sleep mode.":
    "可以修改进入睡眠模式的时间等各种设置。",
  "See also below Q&A section for more details.":
    "更多详情请参阅下方的 Q&A 部分。",
  "DYA Keyboard series": "DYA 键盘系列",
  "40% Split keyboard for mobile use.":
    "面向移动场景的 40% 分体式键盘。",
  Design: "设计",
  Buy: "购买",
  Docs: "文档",
  "Next generation DYA keyboard, 60% split, standard row-staggered layout.":
    "下一代 DYA 键盘，60% 分体式，标准行错位布局。",
  "Coming Soon": "即将推出",
  "Watch Booth": "查看 Booth",
  "Q: Can my keyboard support DYA Studio?":
    "Q: 我的键盘可以使用 DYA Studio 吗？",
  "A: Yes, you can use the keymap feature without any modification with your ZMK keyboard.":
    "A: 可以。任何 ZMK 键盘无需修改即可使用键位功能。",
  "You can also support other features by using cormoran's ZMK fork and cormoran's ZMK modules, although it's not suggested considering compatibility and maintainability.":
    "也可以通过使用 cormoran 的 ZMK 分支及其 ZMK 模块来支持其他功能，但考虑到兼容性和可维护性，不建议这样做。",
  "Please refer to the experimental zmk-config for DYA Dash keyboard.":
    "请参考面向 DYA Dash 键盘的实验性 zmk-config。",
  "Warning: cormoran's ZMK fork is very experimental, optimized for DYA keyboards and may contain unstable or breaking changes. Use at your own risk. In rare cases, it may cause malfunction or damage to your keyboard hardware.":
    "警告：cormoran 的 ZMK 分支非常实验性，针对 DYA 键盘进行了优化，可能包含不稳定或破坏性更改。使用风险自负。在极少数情况下，可能导致键盘硬件故障或损坏。",
  "Q: Can I get source code of DYA Studio?":
    "Q: 我可以获取 DYA Studio 的源代码吗？",
  "Q: Are there plan to migrate the ZMK fork to ZMK v0.4.0?":
    "Q: 计划将 ZMK 分支迁移到 ZMK v0.4.0 吗？",
  "A: Yes, it's already done. The ZMK fork now tracks recent ZMK (Zephyr 4.x).":
    "A: 已经完成。ZMK 分支现在跟踪最新的 ZMK（Zephyr 4.x）。",

  "Configure key bindings and layers": "配置按键绑定和层",
  "Unsaved changes": "有未保存的更改",
  Saved: "已保存",
  "Saved — changed from the default keymap":
    "已保存 — 与默认键位不同",
  Stream: "流模式",
  "Toggle stream mode": "切换流模式",
  "Discard unsaved changes and reload the keymap":
    "放弃未保存的更改并重新加载键位",
  "Reset the saved keymap to the default keymap":
    "将已保存的键位重置为默认键位",
  'This keyboard cannot reset the keymap on its own. To clear the keymap, use "Reset all settings" in the Settings tab, which restores every setting to its firmware default.':
    "此键盘无法单独重置键位。如需清除键位，请在“设置”选项卡中使用“重置所有设置”，这会将所有设置恢复到固件默认值。",
  "Reset to default keymap?": "重置为默认键位？",
  "This resets the saved keymap on your keyboard back to its hard-coded default and writes it to flash immediately. All saved key bindings will be lost. This cannot be undone.":
    "这会将键盘上保存的键位重置为内置默认值，并立即写入闪存。所有已保存的按键绑定都会丢失，此操作不可撤销。",
  "Reset to default": "重置为默认值",
  "Default keymap is not available": "默认键位不可用",
  Locked: "已锁定",
  "Studio is locked — click to unlock":
    "Studio 已锁定 — 点击解锁",
  "Connect your keyboard to edit keymaps":
    "连接键盘以编辑键位",
  "Loading keymap data...": "正在加载键位数据...",
  "Loading physical layouts...": "正在加载物理布局...",
  "Loading keymap...": "正在加载键位...",
  "Loading behaviors...": "正在加载行为...",
  "Finalizing...": "正在完成...",
  "Are you sure you want to discard all changes?":
    "确定要放弃所有更改吗？",
  "Are you sure you want to delete this layer?":
    "确定要删除此层吗？",
  "Layer {{id}}": "层 {{id}}",
  "Keymap layers": "键位层",
  "Keyboard layout for {{layer}}": "{{layer}} 的键盘布局",
  "Key position {{position}}: {{binding}}":
    "键位 {{position}}：{{binding}}",
  "Reset key position {{position}} to original":
    "将键位 {{position}} 重置为原始值",
  "Reset key position {{position}} to default":
    "将键位 {{position}} 重置为默认值",
  Sort: "排序",
  "Move layer up (higher priority)": "将层上移（更高优先级）",
  "Move layer down (lower priority)": "将层下移（更低优先级）",
  "Add new layer": "添加新层",
  "Delete current layer": "删除当前层",
  "Restore deleted layer": "恢复已删除的层",
  "Restore deleted layer ({{count}} available)":
    "恢复已删除的层（可用 {{count}} 个）",
  "Restore all deleted layers ({{count}})":
    "恢复所有已删除的层（{{count}} 个）",
  "No deleted layers to restore": "没有可恢复的已删除层",
  "Physical Layout": "物理布局",
  "Layout {{id}}": "布局 {{id}}",
  "OS Layout": "操作系统布局",
  "Choose OS's keyboard layout setting": "选择操作系统的键盘布局设置",
  "This setting only affects the visual key labels in DYA Studio web UI.":
    "此设置仅影响 DYA Studio 网页界面中的按键标签显示。",
  "Changing this does not update any firmware setting. The keyboard is detected as US regardless of this setting. Please change the layout setting in your OS if needed. For MacOS, USB connection is always detected as US and cannot be changed for now.":
    "更改此项不会更新任何固件设置。无论此设置如何，键盘都被识别为 US。如有需要，请在操作系统中更改布局设置。在 macOS 上，USB 连接始终被识别为 US，目前无法更改。",
  "The selection is saved in your browser's local storage for now.":
    "此选择目前保存在浏览器的本地存储中。",
  "Physical layout module preview could not be loaded: {{error}}":
    "无法加载物理布局模块预览：{{error}}",
  "Runtime sensor rotation subsystem is not available for your keyboard. Rotary encoder configuration will not be displayed. You can enable the feature by applying cormoran/zmk-behavior-runtime-sensor-rotate in your firmware.":
    "您的键盘不支持运行时传感器旋转子系统，将不会显示旋转编码器配置。您可以在固件中应用 cormoran/zmk-behavior-runtime-sensor-rotate 来启用此功能。",
  "Click on a key to modify its binding. Modified keys are highlighted in green and show the original binding on hover. Use the Discard button to drop unsaved changes, or Reset to restore the default keymap.":
    "点击按键以修改其绑定。被修改的按键会以绿色高亮显示，悬停时显示原始绑定。使用“放弃”按钮可丢弃未保存的更改，或使用“重置”恢复默认键位。",
  "Connect your keyboard to edit keymaps. Click on a key to modify its binding.":
    "连接键盘以编辑键位。点击按键以修改其绑定。",

  "Trackball Settings": "轨迹球设置",
  "Adjust sensitivity and behavior via runtime input processor":
    "通过运行时输入处理器调整灵敏度和行为",
  "Runtime input processor subsystem is not available for your keyboard.":
    "您的键盘不支持运行时输入处理器子系统。",
  "Make sure your firmware has the {{module}} enabled.":
    "请确保您的固件已启用 {{module}}。",
  "Loading trackball settings...": "正在加载轨迹球设置...",
  "No runtime input processor found. Make sure your firmware has the runtime input processor module enabled.":
    "未找到运行时输入处理器。请确保您的固件已启用运行时输入处理器模块。",
  "Advanced (PMW3610 Sensor Driver)": "高级（PMW3610 传感器驱动）",
  "Sensor-level tuning exposed by the pmw3610 driver's custom Studio RPC":
    "pmw3610 驱动通过自定义 Studio RPC 公开的传感器级调整",
  "No pmw3610 driver settings were reported by the keyboard.":
    "键盘未报告任何 pmw3610 驱动设置。",
  "Select Processor": "选择处理器",
  "{{count}} processors detected": "检测到 {{count}} 个处理器",
  Processors: "处理器",
  "Processor {{id}}": "处理器 {{id}}",
  "No processors found": "未找到处理器",
  "Loading...": "加载中...",
  "PMW3610 Drivers": "PMW3610 驱动",
  "This driver is no longer available.":
    "此驱动已不可用。",
  "Active on layer": "在层上激活",
  "Temp layer": "临时层",
  "{{layer}} — active": "{{layer}} — 已激活",
  "{{layer}} — inactive": "{{layer}} — 未激活",
  "{{layer}} — temporary layer target": "{{layer}} — 临时层目标",
  "Active on Layers": "激活的层",
  "Configure which layers this processor is active on":
    "配置此处理器激活的层",
  "Processor is active on all layers":
    "处理器在所有层上都处于激活状态",
  "Loading layers...": "正在加载层...",
  Scaling: "缩放",
  "Adjust sensitivity from 0.01x to 10x":
    "在 0.01 倍到 10 倍之间调整灵敏度",
  "Decrease scaling": "降低缩放",
  "Increase scaling": "提高缩放",
  "Sensor Rotation": "传感器旋转",
  "Rotate input for different mounting angles":
    "针对不同的安装角度旋转输入",
  "Decrease rotation": "减小旋转",
  "Increase rotation": "增大旋转",
  "Axis Snapping": "轴吸附",
  "Constrain movement to a single axis for precision scrolling":
    "将移动限制在单个轴上以实现精确滚动",
  "Snap Axis": "吸附轴",
  "Y Axis (Vertical)": "Y 轴（垂直）",
  "X Axis (Horizontal)": "X 轴（水平）",
  "Snap Threshold": "吸附阈值",
  "Threshold for unsnapping from the locked axis":
    "从锁定轴解除吸附的阈值",
  "Snap Timeout": "吸附超时",
  "Time window for threshold check": "阈值检查的时间窗口",
  "Axis Inversion": "轴反转",
  "Reverse the direction of X or Y axis movement":
    "反转 X 轴或 Y 轴的移动方向",
  "Invert X Axis": "反转 X 轴",
  "Reverse horizontal movement direction": "反转水平移动方向",
  "Invert Y Axis": "反转 Y 轴",
  "Reverse vertical movement direction": "反转垂直移动方向",
  "Code Mapping": "代码映射",
  "Transform trackball movement into different input types":
    "将轨迹球移动转换为不同的输入类型",
  "XY-to-Scroll": "XY 转换为滚动",
  "Map X/Y movement to horizontal/vertical scroll":
    "将 X/Y 移动映射到水平/垂直滚动",
  "XY-Swap": "XY 交换",
  "Swap X and Y axes": "交换 X 轴和 Y 轴",
  "Temporary Layer": "临时层",
  "Auto-activate layer when trackball is in use":
    "使用轨迹球时自动激活层",
  "Target Layer": "目标层",
  "Activation Delay": "激活延迟",
  "Delay before activating layer when trackball moves":
    "轨迹球移动后到激活层的延迟",
  "Deactivation Delay": "停用延迟",
  "Delay before deactivating layer when trackball stops":
    "轨迹球停止后到停用层的延迟",

  "BLE Connections": "BLE 连接",
  "Manage Bluetooth upstream connections":
    "管理蓝牙上行连接",
  "Refresh profiles": "刷新配置文件",
  "BLE management subsystem is not available for your keyboard.":
    "您的键盘不支持 BLE 管理子系统。",
  "Output Priority": "输出优先级",
  "Loading profiles...": "正在加载配置文件...",
  "Device name": "设备名称",
  "Save name": "保存名称",
  "Cancel editing": "取消编辑",
  "Edit name": "编辑名称",
  "Profile {{index}}": "配置文件 {{index}}",
  "Not paired": "未配对",
  "No address": "无地址",
  Unpair: "取消配对",
  Switch: "切换",
  Active: "已激活",
  "Are you sure you want to unpair this device?":
    "确定要取消配对此设备吗？",
  "Change Output Priority?": "更改输出优先级？",
  "Changing the output priority may disconnect DYA Studio from your keyboard.":
    "更改输出优先级可能会断开 DYA Studio 与键盘的连接。",
  "You will need to reconnect manually after the change.":
    "更改后需要手动重新连接。",

  Connection: "连接",
  "Manage connections, default layers and OS detection":
    "管理连接、默认层和操作系统检测",
  "Current OS": "当前操作系统",
  "Active Connection": "活动连接",
  "Resolved Default Layer": "已解析的默认层",
  "Not connected": "未连接",
  "BLE profile {{index}}": "BLE 配置文件 {{index}}",
  OS: "操作系统",
  Auto: "自动",
  "Auto: {{os}}": "自动：{{os}}",
  Windows: "Windows",
  macOS: "macOS",
  Linux: "Linux",
  iOS: "iOS",
  Android: "Android",
  Unknown: "未知",
  "{{connection}} OS override": "{{connection}} 操作系统覆盖",
  "Default Layer": "默认层",
  "{{connection}} default layer": "{{connection}} 默认层",
  "Not set": "未设置",
  "Follow OS detection": "跟随操作系统检测",
  Connections: "连接",
  "Set a default layer for each connection target. The layer switches automatically when that connection becomes active.":
    "为每个连接目标设置一个默认层。当该连接变为活动状态时，会自动切换到该层。",
  "Choosing 'Follow OS detection' applies the Per-OS Default Layers settings below.":
    "选择“跟随操作系统检测”将应用下方的“按操作系统的默认层”设置。",
  "Choose whether USB or Bluetooth is used for keystrokes when both are connected.":
    "当 USB 和蓝牙都连接时，选择用于按键输入的连接。",
  "The OS is detected automatically from how the host communicates (heuristic).":
    "操作系统根据主机通信方式自动检测（启发式）。",
  "The OS is detected automatically from how the host communicates (heuristic). If detection is wrong, select the correct OS here to override it for this connection.":
    "操作系统根据主机通信方式自动检测（启发式）。如果检测有误，可在此处为该连接选择正确的操作系统进行覆盖。",
  "More info": "更多信息",
  "Per-OS Default Layers": "按操作系统的默认层",
  "Applied when a connection's default layer is set to 'Follow OS detection'. The layer configured for the detected OS is used.":
    "当连接的默认层设置为“跟随操作系统检测”时应用。将使用为检测到的操作系统配置的层。",
  "{{os}} default layer": "{{os}} 默认层",
  "OS detection is not enabled in this firmware build.":
    "此固件版本未启用操作系统检测。",
  "Default layer subsystem is not available for your keyboard.":
    "您的键盘不支持默认层子系统。",
  "BLE OS detection is heuristic and may flap right after connecting. If detection is wrong, set a per-profile override above.":
    "蓝牙操作系统检测为启发式，连接后短时间内可能不稳定。如果检测有误，请在上方设置按配置文件的覆盖。",
  "Related modules:": "相关模块：",

  "Device configuration and power management": "设备配置和电源管理",
  "Settings RPC subsystem is not available for your keyboard.":
    "您的键盘不支持 Settings RPC 子系统。",
  "Loading settings...": "正在加载设置...",
  "Power Management": "电源管理",
  "Idle Timeout": "空闲超时",
  "Time before keyboard enters idle mode":
    "键盘进入空闲模式前的时间",
  "Sleep Timeout": "睡眠超时",
  "Time before entering deep sleep": "进入深度睡眠前的时间",
  "Apply to All Devices": "应用到所有设备",
  "Current Settings by Device": "按设备的当前设置",
  "Idle: {{idle}}, Sleep: {{sleep}}": "空闲：{{idle}}，睡眠：{{sleep}}",
  "Waiting for device connection...": "等待设备连接...",
  "Danger Zone": "危险操作",
  "Reset all settings": "重置所有设置",
  "Erase every saved setting on the keyboard — including the keymap and all custom settings — and restore firmware defaults.":
    "清除键盘上保存的所有设置（包括键位和所有自定义设置），并恢复固件默认值。",
  "Reset all settings?": "重置所有设置？",
  "This erases every saved setting on your keyboard — the keymap and all custom settings — and restores firmware defaults. This cannot be undone.":
    "这将清除键盘上保存的所有设置（包括键位和所有自定义设置），并恢复固件默认值。此操作不可撤销。",
  "Not connected to keyboard": "未连接到键盘",
  Never: "从不",
  "30 seconds": "30 秒",
  "1 minute": "1 分钟",
  "5 minutes": "5 分钟",
  "10 minutes": "10 分钟",
  "15 minutes": "15 分钟",
  "30 minutes": "30 分钟",
  "1 hour": "1 小时",
  "2 hours": "2 小时",
  "4 hours": "4 小时",
  "{{value}} min": "{{value}} 分钟",
  "Custom value...": "自定义值...",
  min: "分钟",
  "{{count}} seconds": "{{count}} 秒",
  "{{count}} minute": "{{count}} 分钟",
  "{{count}} minutes": "{{count}} 分钟",
  "{{count}} hour": "{{count}} 小时",
  "{{count}} hours": "{{count}} 小时",
  "{{count}}s": "{{count}} 秒",
  "{{count}}m": "{{count}} 分",
  "{{count}}h": "{{count}} 小时",
  ms: "毫秒",

  "Macro&Combo": "宏与组合键",
  "Edit runtime macro and combo slots":
    "编辑运行时宏和组合键插槽",
  "Macro Global Settings": "宏的全局设置",
  "Combo Global Settings": "组合键的全局设置",
  "Connect your keyboard to edit runtime macros and combos":
    "连接键盘以编辑运行时宏和组合键",
  "Select a macro or combo": "选择宏或组合键",
  "Choose an item from the lists on the left.":
    "请从左侧的列表中选择一个项目。",
  "Edit runtime macro slots": "编辑运行时宏插槽",
  "Encoded macro is {{encodedSize}} bytes; limit is {{maxMacroBytes}}.":
    "编码后的宏为 {{encodedSize}} 字节；上限为 {{maxMacroBytes}} 字节。",
  "Only HID keyboard-page printable characters are supported.":
    "仅支持 HID 键盘页可打印字符。",
  "Runtime macro subsystem not found. Build firmware with":
    "未找到运行时宏子系统。请在固件中编译",
  Slots: "插槽",
  Macros: "宏列表",
  Combos: "组合键列表",
  "Macro {{slot}}": "宏 {{slot}}",
  "{{encodedSize}}/{{maxMacroBytes}} bytes":
    "{{encodedSize}}/{{maxMacroBytes}} 字节",
  "Global Settings": "全局设置",
  "Tap ms": "点击时长（毫秒）",
  Name: "名称",
  Size: "大小",
  Steps: "步骤",
  Step: "步骤",
  "No steps in this macro": "此宏没有步骤",
  Tap: "点击",
  Down: "按下",
  Up: "释放",
  Delay: "延迟",
  String: "字符串",
  "Remove step {{n}}": "删除步骤 {{n}}",
  "Select a macro slot": "选择宏插槽",
  "Select a macro": "请选择宏",
  "No macros yet. Create one below.":
    "还没有宏。请在下方创建一个。",
  "No macros yet. Create one to get started.":
    "还没有宏。创建一个开始吧。",
  "New macro name": "新宏名称",
  Create: "创建",
  "Shared macro pool: {{used}}/{{total}} B":
    "共享宏池：{{used}}/{{total}} B",

  "Configure runtime combo slots": "配置运行时组合键插槽",
  "All layers": "所有层",
  "Choose a valid slot.": "请选择有效的插槽。",
  "Slot must be below {{maxCombo}}.":
    "插槽必须小于 {{maxCombo}}。",
  "Name must be {{maxLength}} characters or fewer.":
    "名称最多 {{maxLength}} 个字符。",
  "Select at least two key positions.": "请至少选择两个键位。",
  "Select {{maxPositions}} positions or fewer.":
    "请选择不超过 {{maxPositions}} 个位置。",
  "Key positions must be below 65536.": "键位必须小于 65536。",
  "Choose a behavior.": "请选择行为。",
  "Layer mask is out of range.": "层掩码超出范围。",
  "Combo changes are pending.": "组合键的更改待处理。",
  "Combo deletion is pending.": "组合键的删除待处理。",
  "Global settings are pending.": "全局设置待处理。",
  "Saved {{count}} runtime combo changes.":
    "已保存 {{count}} 项运行时组合键更改。",
  "Discarded {{count}} runtime combo changes.":
    "已放弃 {{count}} 项运行时组合键更改。",
  "● Pending changes": "● 待处理的更改",
  "Connect your keyboard to edit runtime combos":
    "连接键盘以编辑运行时组合键",
  "Runtime combo subsystem is not available for your keyboard.":
    "您的键盘不支持运行时组合键子系统。",
  "is required in firmware.": "必须在固件中启用。",
  "Loading combo data...": "正在加载组合键数据...",
  configured: "已配置",
  "No runtime combos configured": "未配置运行时组合键",
  "Combo {{index}}": "组合键 {{index}}",
  "Max slots": "最大插槽数",
  "Timeout ms": "超时（毫秒）",
  "Slow release": "慢释放",
  "Apply Global Settings": "应用全局设置",
  "Select a combo slot": "选择组合键插槽",
  "Choose an existing slot or create a new combo.":
    "请选择现有插槽或创建一个新组合键。",
  "New Combo": "新建组合键",
  "Combo Editor": "组合键编辑器",
  "Existing slot": "现有插槽",
  "New slot": "新插槽",
  "Save Combo": "保存组合键",
  Slot: "插槽",
  Positions: "位置",
  Empty: "空",
  Default: "默认",
  Overridden: "已覆盖",
  "Reset to Default": "重置为默认值",
  "Combo reset to default is pending.":
    "组合键重置为默认值待处理。",
  "Timeout ms (0 = inherit global)":
    "超时（毫秒）（0 = 继承全局）",
  "Require prior idle ms (0 = inherit global)":
    "需要预先空闲（毫秒）（0 = 继承全局）",
  "Require prior idle ms (0 disables)": "需要预先空闲（毫秒）（0 表示禁用）",
  "Slow release override": "慢释放覆盖",
  "Inherit global": "继承全局",
  On: "开",
  Off: "关",

  "(hidden)": "（隐藏）",
  Local: "本地",
  "Source {{source}}": "来源 {{source}}",
  "Use hexadecimal bytes such as 00 ff 2a.":
    "使用十六进制字节，例如 00 ff 2a。",
  "Bytecode Editor": "字节码编辑器",
  "Hex bytes": "十六进制字节",
  "ASCII helper": "ASCII 输入助手",
  Encode: "编码",
  "Length: {{count}} bytes": "长度：{{count}} 字节",
  "Invalid hex": "无效的十六进制",
  "Invalid bytes": "无效的字节",
  "Value is hidden by firmware permissions":
    "固件权限隐藏了该值",
  "(empty)": "（空）",
  "Edit bytecode": "编辑字节码",
  Unsaved: "未保存",
  Queued: "排队中",
  "Memory...": "正在写入内存...",
  "In memory": "内存中",
  Current: "当前值",
  "Discard item changes": "放弃项目更改",
  "Reset item to default": "将项目重置为默认值",
  "Changed from default": "已偏离默认值",
  "Reset this macro to its default?":
    "将此宏重置为其默认值？",
  "Reset this macro to its default": "将此宏重置为其默认值",
  Legend: "图例",
  "Green: in memory, not yet saved. Discard reverts it.":
    "绿色：内存中，尚未保存。放弃可还原。",
  "Blue: saved, but changed from the default. Reset restores the default.":
    "蓝色：已保存，但已偏离默认值。重置可恢复默认值。",
  "Advanced Settings": "高级设置",
  "Changes are written to keyboard memory after a short delay. Save a section to persist them.":
    "更改会在短暂延迟后写入键盘内存。请保存该节以使其持久化。",
  Reload: "重新加载",
  "Reload the keymap from the keyboard": "从键盘重新加载键位",
  "Reload settings from the keyboard": "从键盘重新加载设置",
  "Reload processors": "重新加载处理器",
  "Advanced settings can change firmware behavior immediately. Incorrect values may make the keyboard hard to use; discard or reset a section if the device starts behaving unexpectedly.":
    "高级设置会立即更改固件行为。错误的值可能导致键盘难以使用；如果设备开始出现异常行为，请放弃或重置相应小节。",
  "Custom settings subsystem is not available for this keyboard.":
    "此键盘不支持自定义设置子系统。",
  "Loading advanced settings...": "正在加载高级设置...",
  "No advanced settings were reported by the keyboard.":
    "键盘未报告任何高级设置。",
  "{{count}} settings": "{{count}} 项设置",
  " - loading layer and behavior names": "（正在加载层和行为名称）",
  "Reset all settings in {{identifier}}?":
    "重置 {{identifier}} 中的所有设置？",
  Setting: "设置",
  Source: "来源",
  Editor: "编辑器",
  Status: "状态",
  Item: "项目",
  "● Unsaved": "● 未保存",
  "What Source means": "“来源”的含义",
  "Source legend": "来源图例",
  "Central: the split side you are connected to.":
    "中央侧：您当前连接到的（分体式键盘的）一侧。",
  "Peripheral N: another split side's own independently stored copy.":
    "外围侧 N：另一侧各自独立保存的设置值。",
  "All: every split side at once, used for section-wide actions.":
    "全部：所有分体侧同时，用于整节操作。",
  "Saving…": "保存中…",
  "Default:": "默认值：",
  "Click to restore the default value.":
    "点击恢复默认值。",
  "What Status means": "“状态”的含义",
  "Status legend": "状态图例",
  "Current: matches the value persisted on the keyboard.":
    "当前值：与键盘上保存的值一致。",
  "In memory: written to RAM; save the section to persist it.":
    "内存中：已写入 RAM；请保存该节以使其持久化。",
  "Queued: your edit is about to be sent.":
    "排队中：您的修改即将发送。",
  "Memory...: the edit is being written right now.":
    "内存中...：修改正在写入。",
  Sensitivity: "灵敏度",
  "Tracking resolution.": "跟踪分辨率。",
  Orientation: "方向",
  "Axis mapping for how the sensor is mounted.":
    "传感器安装方向对应的轴映射。",
  "Power & Rest Mode": "省电与休眠模式",
  "Idle downshift stages that reduce sensor polling and power use while the trackball is not moving.":
    "在轨迹球静止时降低传感器轮询频率和功耗的空闲降级阶段。",
  Reporting: "上报",
  "How often motion reports are sent to the host.":
    "向主机发送运动报告的频率。",
  "Sensor resolution in counts per inch. Higher values move the cursor faster for the same physical motion.":
    "传感器分辨率（每英寸计数）。值越大，相同的物理移动会使光标移动得更快。",
  "Swap the X and Y axes.": "交换 X 轴和 Y 轴。",
  "Invert the horizontal movement direction.": "反转水平移动方向。",
  "Invert the vertical movement direction.": "反转垂直移动方向。",
  "Keep the sensor fully powered, skipping the rest mode stages below.":
    "保持传感器完全供电，跳过下方的休眠模式阶段。",
  "Enable the sensor's adaptive positioning algorithm.":
    "启用传感器的自适应定位算法。",
  "Time of continuous motion before dropping from Run mode into Rest1.":
    "从运行模式降级到 Rest1 所需的持续运动时间。",
  "Time in Rest1 before dropping into Rest2.":
    "在 Rest1 中停留的时间，之后降级到 Rest2。",
  "Time in Rest2 before dropping into Rest3.":
    "在 Rest2 中停留的时间，之后降级到 Rest3。",
  "Sensor sampling interval while in Rest1.":
    "Rest1 阶段的传感器采样间隔。",
  "Sensor sampling interval while in Rest2.":
    "Rest2 阶段的传感器采样间隔。",
  "Sensor sampling interval while in Rest3, the deepest idle stage.":
    "Rest3（最深的空闲阶段）阶段的传感器采样间隔。",
  "Minimum time between motion reports sent to the host.":
    "向主机发送运动报告的最小时间间隔。",
  "Subsystem {{index}}": "子系统 {{index}}",
  "Custom settings subsystem is not available":
    "自定义设置子系统不可用",
  "Empty custom settings response": "自定义设置响应为空",
  "Custom settings failed": "自定义设置处理失败",
  "Custom settings list timed out":
    "自定义设置列表获取超时",
  "Failed to load custom settings": "加载自定义设置失败",
  "Failed to write custom setting": "写入自定义设置失败",
  "Failed to save settings": "保存设置失败",
  "Failed to discard settings": "放弃设置失败",
  "Failed to reset settings": "重置设置失败",

  "Custom Subsystems": "自定义子系统",
  "Available custom firmware subsystems and their web interfaces":
    "可用的自定义固件子系统及其网页界面",
  "Close dialog": "关闭对话框",
  "External Link Warning": "外部链接警告",
  "You are about to open an external website provided by the keyboard firmware author:":
    "您即将打开由键盘固件作者提供的外部网站：",
  "Security Notice": "安全提示",
  "Please do not connect to an unreliable author's web page. Only proceed if you trust the keyboard firmware author. External pages may request sensitive permissions or send data to third-party servers.":
    "请勿连接不可信作者提供的网页。仅在您信任该键盘固件作者时继续。外部页面可能请求敏感权限或将数据发送到第三方服务器。",
  "Trust this URL and don't warn me again": "信任此 URL 并今后不再警告",
  "Subsystem index: {{index}}": "子系统索引：{{index}}",
  "Web UI": "网页界面",
  "No web UI available for this subsystem.":
    "此子系统没有可用的网页界面。",
  "No custom subsystems available. Custom subsystems are provided by the keyboard firmware.":
    "没有可用的自定义子系统。自定义子系统由键盘固件提供。",
  "All custom subsystems reported by this device are already supported by DYA Studio.":
    "此设备报告的所有自定义子系统已被 DYA Studio 支持。",
  "Already supported by DYA Studio": "已被 DYA Studio 支持",
  "These subsystems have a dedicated UI elsewhere in DYA Studio":
    "这些子系统在 DYA Studio 的其他地方有专用界面",
  "Custom subsystems are additional features provided by your keyboard firmware author. Web UI links open external pages supplied by the firmware metadata.":
    "自定义子系统是您的键盘固件作者提供的附加功能。网页界面链接将打开由固件元数据提供的外部页面。",

  Connect: "连接",
  "Connect via USB": "通过 USB 连接",
  "Connect via Bluetooth": "通过蓝牙连接",
  "Try Demo Mode": "试用演示模式",
  "Try Demo Mode (no device required)": "试用演示模式（无需设备）",
  "Try demo mode without a keyboard": "无需键盘即可试用演示模式",
  "Reconnecting to your keyboard...": "正在重新连接您的键盘...",
  "DYA Studio is maintained by": "DYA Studio 由以下人员维护",
  "Special thanks to": "特别感谢",
  "ZMK community": "ZMK 社区",
  "Release notes": "发布说明",
  "Keyboard developer guide": "键盘开发者指南",
  "Release notes ({{version}})": "发布说明（{{version}}）",
  "Release Notes": "发布说明",
  "What's new in DYA Studio": "DYA Studio 的新功能",
  Back: "返回",
  Upcoming: "即将发布",
  "No upcoming changes yet.": "暂无即将发布的更改。",
  "No changes recorded for this release.":
    "本次发布没有记录任何更改。",
  Major: "主要",
  Minor: "次要",
  Patch: "补丁",
  "Connect via {{method}}": "通过 {{method}} 连接",
  "Data Collection Notice": "数据收集说明",
  "DYA Studio collects your keyboard name and anonymous usage data — such as which features you use, how you connect, and connection errors — for usage analysis. No keymaps, settings, or other keyboard configuration data is ever sent; everything is handled locally on your device.":
    "DYA Studio 收集您的键盘名称和匿名使用数据（例如您使用的功能、连接方式以及连接错误）以进行使用分析。绝不会发送键位、设置或其他键盘配置数据；所有内容都在您的设备上本地处理。",
  "BLE Not Supported on your Browser":
    "您的浏览器不支持 BLE",
  "Your browser does not support Web Bluetooth API. Please use a compatible browser like Chrome, Edge, or Bluefy (iOS). BLE device discovery on non-Linux system requires cormoran's ZMK fork + press the studio unlock key on your keyboard.":
    "您的浏览器不支持 Web Bluetooth API。请使用兼容的浏览器，例如 Chrome、Edge 或 Bluefy (iOS)。在非 Linux 系统上进行 BLE 设备发现需要 cormoran 的 ZMK 分支，并在键盘上按下 studio unlock 按键。",
  "Serial Not Supported on your Browser":
    "您的浏览器不支持串行连接",
  "Your browser does not support Web Serial API. Please use a compatible browser. Note that web serial is not available on mobile devices.":
    "您的浏览器不支持 Web Serial API。请使用兼容的浏览器。请注意，移动设备不支持 Web Serial。",
  "How to Discover your Keyboard via BLE": "如何通过 BLE 发现您的键盘",
  "Press the studio unlock key on your keyboard for non-linux systems.":
    "在非 Linux 系统上，请在键盘上按下 studio unlock 按键。",
  "cormoran's ZMK fork is also required for BLE device discovery on non-Linux systems.":
    "在非 Linux 系统上进行 BLE 设备发现也需要 cormoran 的 ZMK 分支。",
  "Agree to start": "同意并开始",
  "compatible browser": "兼容的浏览器",
  "Keyboard Unlock Required": "需要解锁键盘",
  "Your keyboard's ZMK Studio is locked. Please unlock it to continue editing your keymap.":
    "您的键盘的 ZMK Studio 已锁定。请解锁后继续编辑键位。",
  "How to Unlock": "如何解锁",
  "Press the studio unlock key combination on your keyboard":
    "在键盘上按下 studio unlock 组合键",
  "Look for a notification or LED indication that confirms unlock":
    "查找确认解锁的通知或 LED 指示",
  "Click Retry below to continue": "点击下方的“重试”继续",
  "The unlock key combination is typically configured in your ZMK keymap. Check your firmware configuration if you're unsure.":
    "解锁组合键通常在您的 ZMK 键位中配置。如果不确定，请检查固件配置。",
  Retry: "重试",

  "Select Key Binding": "选择按键绑定",
  "Close on select": "选择后关闭",
  Revert: "还原",
  Behavior: "行为",
  "Behaviors not loaded from keyboard.":
    "未能从键盘加载行为。",
  Parameters: "参数",
  param1: "参数1",
  param2: "参数2",
  "Mouse Button": "鼠标按键",
  "Pointer movement": "指针移动",
  Constant: "常量",
  Range: "范围",
  Keycode: "键码",
  Layer: "层",
  "Unknown Type": "未知类型",
  "Select {{name}}": "选择 {{name}}",
  "Select options": "选择选项",
  "Select behavior": "选择行为",
  "Quick Select": "快速选择",
  "Recently used": "最近使用",
  All: "全部",
  "Key Press": "按键",
  Layers: "层",
  Modifiers: "修饰键",
  Mouse: "鼠标",
  Transport: "传输",
  System: "系统",
  Misc: "杂项",
  Others: "其他",
  "Press a key": "按下一个键",
  "Activate layer while held": "按住时激活层",
  "Switch to layer": "切换到层",
  "Toggle layer on/off": "切换层开关",
  "Layer on hold, key on tap": "长按切换层，点击触发按键",
  "Transparent (pass-through to lower layer)": "透明（透传到下层）",
  "No operation": "无操作",
  "Modifier on hold, key on tap": "长按修饰键，点击触发按键",
  "Execute macro": "执行宏",
  "Toggle key on/off with each press": "每次按下切换按键开关",
  "A sticky key stays pressed until another key is pressed.":
    "粘滞键在按下其他键之前保持按下状态。",
  "A sticky layer stays pressed until another key is pressed":
    "粘滞层在按下其他键之前保持激活",
  "Caps lock, but automatically deactivates": "大写锁定，但自动取消激活",
  "Repeat last-pressed key while held":
    "按住时重复最后一次按下的键",
  "Mouse key press": "鼠标按键",
  "Move mouse cursor.": "移动鼠标光标。",
  "Scroll mouse wheel.": "滚动鼠标滚轮。",
  "Enter bootloader mode": "进入引导加载程序模式",
  "System reset": "系统重置",
  "Bluetooth profile management": "蓝牙配置文件管理",
  "Output selection (USB/BLE)": "输出选择（USB/BLE）",
  "Unlock keyboard for ZMK Studio and DYA Studio":
    "为 ZMK Studio 和 DYA Studio 解锁键盘",
  "Grave(`) on shift or GUI, otherwise Escape":
    "在 Shift 或 GUI 时为反引号(`)，否则为 Escape",
  "Search keycodes...": "搜索键码...",
  "Clear search": "清除搜索",
  "No keycodes found": "未找到键码",
  "Show key layout": "显示键盘布局",
  "Show keycodes by category": "按类别显示键码",
  "Click a key to select its keycode": "点击按键以选择其键码",
  Letters: "字母",
  Numbers: "数字",
  Navigation: "导航",
  "Function Keys": "功能键",
  Numpad: "数字键盘",
  Media: "媒体",
  Punctuation: "标点符号",
  International: "国际",
  Miscellaneous: "其他",
  "Select value ({{min}} to {{max}})": "选择值（{{min}} 到 {{max}}）",
  "Range: {{min}} to {{max}}": "范围：{{min}} 到 {{max}}",
  "Min ({{min}})": "最小值（{{min}}）",
  "Max ({{max}})": "最大值（{{max}}）",
  "Quick Presets (default: ±{{defaultValue}})":
    "快速预设（默认：±{{defaultValue}}）",
  "Custom Values (range: -32768 to 32767)":
    "自定义值（范围：-32768 到 32767）",
  "X-axis (Horizontal)": "X 轴（水平）",
  "Y-axis (Vertical)": "Y 轴（垂直）",
  "- = Left, + = Right": "- = 左，+ = 右",
  "- = Down, + = Up": "- = 下，+ = 上",
  "- = Up, + = Down": "- = 上，+ = 下",
  "Current: X={{x}}, Y={{y}} (encoded: 0x{{encoded}})":
    "当前值：X={{x}}，Y={{y}}（编码：0x{{encoded}}）",
  "Move Up": "上移",
  "Move Down": "下移",
  "Move Left": "左移",
  "Move Right": "右移",
  "Scroll Up": "向上滚动",
  "Scroll Down": "向下滚动",
  "Scroll Left": "向左滚动",
  "Scroll Right": "向右滚动",
  "Left Click": "左键单击",
  "Right Click": "右键单击",
  "Middle Click": "中键单击",
  "Button 4": "按键 4",
  "Button 5": "按键 5",
  "Rotary Encoder Configuration": "旋转编码器配置",
  "The value is saved in real-time upon selection for now.":
    "目前，选中后值会实时保存。",
  "Rotary Encoder": "旋转编码器",
  "Counter-clockwise": "逆时针",
  Clockwise: "顺时针",
  "Tap Time": "点击时间",
  "Time between rotation triggers": "旋转触发之间的时间",
  "pending to save...": "待保存...",
  "For scroll or mouse move, tap time need to be > behavior-input-two-axis's trigger-period-ms (default 16ms).":
    "对于滚动或鼠标移动，点击时间需要大于 behavior-input-two-axis 的 trigger-period-ms（默认 16ms）。",
  "Loading sensors...": "正在加载传感器...",
  "No rotary encoders detected": "未检测到旋转编码器",
  Trans: "透传",
  "Behavior {{id}}": "行为 {{id}}",
  "Reset to original": "还原为原始值",
  Binding: "绑定",
  Original: "原始",
  disabled: "已禁用",
  Type: "类型",
  Links: "链接",

  "Diagnose keyboard problems and create a support report":
    "诊断键盘问题并生成支持报告",
  "Copy Support Report": "复制支持报告",
  "Refresh All": "全部刷新",
  "Refresh all sections": "刷新所有小节",
  "Copied!": "已复制！",
  "If your keyboard misbehaves, review the sections below. Use 'Copy Support Report' and paste the result when contacting your keyboard's seller.":
    "如果您的键盘工作异常，请查看以下小节。使用“复制支持报告”并将结果粘贴到与键盘卖家联系时使用。",
  "If a section is not available, it shows which firmware module enables it.":
    "如果某个小节不可用，将显示启用它的固件模块。",
  "Not available on this keyboard.": "此键盘不可用。",
  "No data loaded yet.": "尚未加载任何数据。",

  "Device Info": "设备信息",
  "Build, hardware and runtime details reported by firmware":
    "固件报告的构建、硬件和运行时详细信息",
  "Refresh device info": "刷新设备信息",
  Build: "构建",
  "ZMK Version": "ZMK 版本",
  "ZMK Config Version": "ZMK 配置版本",
  "Module Version": "模块版本",
  "Zephyr Version": "Zephyr 版本",
  "Build Timestamp": "构建时间",
  Board: "开发板",
  dirty: "有改动",
  Hardware: "硬件",
  "Device ID": "设备 ID",
  "Reset Cause": "重置原因",
  Flash: "闪存",
  SRAM: "SRAM",
  "ZMK Configuration": "ZMK 配置",
  KScan: "KScan",
  Split: "分体",
  "enabled ({{count}} profiles)": "已启用（{{count}} 个配置文件）",
  enabled: "已启用",
  USB: "USB",
  Display: "显示屏",
  "RGB Underglow": "RGB 底光",
  Backlight: "背光",
  "Battery Level": "电池电量",
  Runtime: "运行时",
  Uptime: "运行时长",
  "Zephyr Devices": "Zephyr 设备",
  "{{count}} not ready": "{{count}} 个未就绪",
  "all ready": "全部就绪",
  OK: "正常",
  "{{count}} devices not ready": "{{count}} 个设备未就绪",

  "Stability (Watchdog)": "稳定性（看门狗）",
  "Freeze, crash and unexpected reset incidents":
    "冻结、崩溃和意外重置事件",
  "Refresh incidents": "刷新事件",
  Central: "中央侧",
  "Peripheral {{n}}": "外围侧 {{n}}",
  Capacity: "容量",
  Stored: "已存储",
  "Dropped since boot": "自启动以来已丢弃",
  "Incident storage is full — recording is paused. Delete incidents to resume.":
    "事件存储已满，记录已暂停。请删除事件以继续。",
  "No incidents recorded — your keyboard looks stable.":
    "未记录到任何事件 — 您的键盘看起来很稳定。",
  "{{count}} incidents": "事件数 {{count}}",
  "No incidents": "无事件",
  "recording paused": "记录已暂停",
  "Boot / Uptime": "启动 / 运行时长",
  Detail: "详情",
  "Delete incident {{id}}": "删除事件 {{id}}",
  "Delete all": "全部删除",
  "Delete all incidents?": "删除所有事件？",
  "This will permanently delete all recorded incidents from your keyboard.":
    "这将永久删除您键盘上所有已记录的事件。",
  "This action cannot be undone.": "此操作不可撤销。",

  Freeze: "冻结",
  Crash: "崩溃",
  queue: "队列",
  thread: "线程",
  "Unknown fault": "未知故障",

  // ELF analysis
  "Upload ELF to resolve PC/LR symbols":
    "上传 ELF 以解析 PC/LR 符号",
  "Upload ELF": "上传 ELF",
  "Change ELF": "更换 ELF",
  "Remove ELF": "移除 ELF",
  "Loading…": "加载中…",
  "ELF: {{name}}": "ELF：{{name}}",
  "{{n}} symbols, line info": "{{n}} 个符号（含行信息）",
  "{{n}} symbols": "{{n}} 个符号",

  // Reset cause bits (Zephyr hwinfo)
  "External Pin": "外部引脚",
  Software: "软件",
  Brownout: "欠压",
  "Power-On": "上电",
  Watchdog: "看门狗",
  Debug: "调试",
  Security: "安全",
  "Low Power Wake": "低功耗唤醒",
  "CPU Lockup": "CPU 死锁",
  "Parity Error": "奇偶校验错误",
  "PLL Error": "PLL 错误",
  "Clock Error": "时钟错误",
  "Hardware Reset": "硬件重置",
  "User Reset": "用户重置",
  Temperature: "温度",

  // Fatal crash reason codes (Zephyr k_fatal_error_reason + ARM arch codes)
  "CPU exception": "CPU 异常",
  "Spurious interrupt": "伪中断",
  "Stack overflow (corruption detected)":
    "栈溢出（检测到损坏）",
  "Kernel oops": "内核 Oops",
  "Kernel panic": "内核 Panic",
  "Memory fault": "内存错误",
  "Memory fault while stacking": "压栈时的内存错误",
  "Memory fault while unstacking": "弹栈时的内存错误",
  "Memory fault: data access": "内存错误：数据访问",
  "Memory fault: instruction access": "内存错误：指令访问",
  "Memory fault: FP lazy state preservation": "内存错误：FP 延迟状态保存",
  "Bus fault": "总线错误",
  "Bus fault while stacking": "压栈时的总线错误",
  "Bus fault while unstacking": "弹栈时的总线错误",
  "Bus fault: precise data bus error": "总线错误：精确数据总线错误",
  "Bus fault: imprecise data bus error": "总线错误：非精确数据总线错误",
  "Bus fault: instruction bus error": "总线错误：指令总线错误",
  "Bus fault: FP lazy state preservation": "总线错误：FP 延迟状态保存",
  "Usage fault": "使用错误",
  "Usage fault: division by zero": "使用错误：除以零",
  "Usage fault: unaligned access": "使用错误：未对齐访问",
  "Usage fault: stack overflow": "使用错误：栈溢出",
  "Usage fault: no coprocessor": "使用错误：无协处理器",
  "Usage fault: illegal EXC_RETURN": "使用错误：非法的 EXC_RETURN",
  "Usage fault: illegal EPSR state": "使用错误：非法的 EPSR 状态",
  "Usage fault: undefined instruction": "使用错误：未定义指令",
  "Secure fault": "安全错误",
  "Secure fault: entry point": "安全错误：入口点",
  "Secure fault: integrity signature": "安全错误：完整性签名",
  "Secure fault: exception return": "安全错误：异常返回",
  "Secure fault: attribution unit": "安全错误：归因单元",
  "Secure fault: transition": "安全错误：转换",
  "Secure fault: lazy state preservation": "安全错误：延迟状态保存",
  "Secure fault: lazy state error": "安全错误：延迟状态错误",
  "Undefined instruction": "未定义指令",
  "Alignment fault": "对齐错误",
  "Background fault": "后台错误",
  "Permission fault": "权限错误",
  "Synchronous external abort": "同步外部中止",
  "Asynchronous external abort": "异步外部中止",
  "Synchronous parity error": "同步奇偶校验错误",
  "Asynchronous parity error": "异步奇偶校验错误",
  "Debug event": "调试事件",
  "Translation fault": "地址转换错误",
  "Unsupported exclusive access fault": "不支持的独占访问错误",

  "Key Switches": "按键开关",
  "Key press statistics and chatter detection":
    "按键统计与抖动检测",
  "Refresh key switch statistics": "刷新按键统计",
  Devices: "设备数",
  Statistics: "统计",
  Disabled: "已禁用",
  "Total presses": "总按压次数",
  "debounce {{press}}/{{release}}ms": "消抖 {{press}}/{{release}} 毫秒",
  "poll {{ms}}ms": "轮询 {{ms}} 毫秒",
  "No chatter or anomalies detected.":
    "未检测到抖动或异常。",
  "Suspect keys (possible chatter or stuck switch) — position numbers follow the keymap order.":
    "可疑按键（可能存在抖动或卡键）— 位置编号遵循键位顺序。",
  Position: "位置",
  Presses: "按压次数",
  Releases: "释放次数",
  "Min gap (ms)": "最小间隔（毫秒）",
  "Reset statistics": "重置统计",
  "Reset key statistics?": "重置按键统计？",
  "This will reset all key press statistics recorded on your keyboard.":
    "这将重置您键盘上记录的所有按键统计。",
  "Driver details & statistics": "驱动详情与统计",
  "Untested keys (0 presses)": "未测试按键（0 次按压）",
  "Loading keyboard wiring…": "正在加载键盘布线…",
  "Unlock your keyboard to show the interactive key map.":
    "解锁键盘以显示交互式键位图。",
  "{{count}} suspect keys": "{{count}} 个可疑按键",

  Untested: "未测试",
  "No record (0 presses)": "无记录（0 次按压）",
  "Suspect (chatter or mismatch)": "可疑（抖动或不匹配）",
  "No wiring info (split peripheral half)":
    "无布线信息（分体的外围侧）",
  "Wiring info unavailable (split peripheral half)":
    "布线信息不可用（分体的外围侧）",
  "Position {{position}}": "位置 {{position}}",
  "Row {{row}} / Col {{col}}": "行 {{row}} / 列 {{col}}",
  "Row line": "行线",
  "Col line": "列线",
  Debounce: "消抖",
  "Min repress gap": "最小重按间隔",
  Chatter: "抖动",

  "Trackball Sensor (PMW3610)": "轨迹球传感器 (PMW3610)",
  "Optical sensor health and surface diagnostics":
    "光学传感器健康状态与表面诊断",
  "Refresh sensor info": "刷新传感器信息",
  "Unlock your keyboard to read sensor diagnostics.":
    "解锁键盘以读取传感器诊断。",
  "Press the studio unlock key combination on your keyboard, then refresh.":
    "在键盘上按下 studio unlock 组合键，然后刷新。",
  "No sensors reported.": "未报告任何传感器。",
  Ready: "就绪",
  "Product ID": "产品 ID",
  Revision: "修订版本",
  "Init error": "初始化错误",
  "Force awake": "强制唤醒",
  yes: "是",
  no: "否",
  "Read surface diagnostics": "读取表面诊断",
  "Sensor sees no surface — check the ball and lens.":
    "传感器看不到表面 — 请检查滚球和透镜。",
  "Poor tracking surface.": "追踪表面状态不佳。",
  "Surface tracking OK.": "表面追踪正常。",
  "init error": "初始化错误",

  "Param 1": "参数 1",
  "Param 2": "参数 2",

  "Live sensor view": "传感器实时视图",
  "Capture Once": "单次捕获",
  "Capturing…": "捕获中…",
  "Start Streaming": "开始流式传输",
  "Stop Streaming": "停止流式传输",
  "Pixels captured": "已捕获像素",
  Complete: "完成",
  "Capture time": "捕获时间",
  "FPS (streaming)": "FPS（流式传输中）",
  "Debug Tool": "调试工具",

  "Stack Usage": "栈使用量",
  "Per-thread stack high-water usage (zmk-module-devtool)":
    "每个线程的栈高水位使用量（zmk-module-devtool）",
  "Refresh stack usage": "刷新栈使用量",
  "Auto-refresh": "自动刷新",
  Requires: "需要：",
  "in your firmware. Without it the RPC returns an error below.":
    "在您的固件中。缺少时，RPC 会在下方返回错误。",
  "{{count}} thread(s) · sorted by usage": "{{count}} 个线程 · 按使用量排序",
  "No stack data yet — press Refresh or enable Auto-refresh.":
    "尚无栈数据 — 请点击“刷新”或启用“自动刷新”。",

  // Feature docs (DocTip) — Macros
  "What are Macros?": "什么是宏？",
  "A macro plays back a saved sequence of key actions when you trigger it with a single key.":
    "宏是在您使用单个键触发时回放已保存的按键动作序列。",
  "Typical uses": "典型用途",
  "Type text, symbols, or emoji that need several keystrokes":
    "输入需要多次按键的文本、符号或表情符号",
  "Fire an app or OS shortcut with one press":
    "通过一次按键触发应用或操作系统的快捷键",
  "Chain presses, holds, and waits into one action":
    "将按压、长按和等待链接为一个操作",
  "In DYA Studio": "在 DYA Studio 中",
  "Create and edit the action sequence of each macro":
    "创建和编辑每个宏的动作序列",
  "Bind a macro to a key from the Keymap tab":
    "在“键位”选项卡中将宏绑定到按键",
  "Tune global timing such as wait and tap time":
    "调整等待时间和点击时间等全局时间",

  // Feature docs (DocTip) — Combos
  "What are Combos?": "什么是组合键？",
  "A combo turns pressing several keys at once into a different key or behavior.":
    "组合键将同时按下多个键转换为其他按键或行为。",
  "Add extra keys without extra physical keys (e.g. Esc from J+K)":
    "无需额外的物理键即可添加额外按键（例如 J+K 触发 Esc）",
  "Reach symbols or layer switches from your home row":
    "从主键行就能触发符号或层切换",
  "How it works": "工作原理",
  "Press the chosen key positions together within a time window":
    "在时间窗口内同时按下所选的键位",
  "Tune the timeout, active layers, and release behavior per combo":
    "为每个组合键调整超时、激活层和释放行为",

  // Feature docs (DocTip) — Processors
  "What are Processors?": "什么是处理器？",
  "Input processors transform trackball motion before it becomes pointer or scroll output, and can be turned on per layer.":
    "输入处理器在轨迹球的运动成为指针或滚动输出之前对其进行处理，并可按层启用。",
  "Switch the trackball between moving the cursor and scrolling":
    "在移动光标和滚动之间切换轨迹球",
  "Adjust sensitivity, or swap and invert the axes":
    "调整灵敏度，或交换和反转轴",
  "Choose which layers each processor is active on":
    "为每个处理器选择激活的层",
  "Optionally hold a temporary layer while the trackball moves":
    "在轨迹球移动时可选地保持一个临时层",

  // Feature docs (DocTip) — Default layers
  "What are Default Layers?": "什么是默认层？",
  "A default layer is the keymap layer your keyboard activates automatically for a given connection.":
    "默认层是您的键盘针对特定连接自动激活的键位层。",
  "Per connection": "按连接",
  "Pick a layer for each connection target (USB and BLE profiles)":
    "为每个连接目标（USB 和蓝牙配置文件）选择一个层",
  "It switches automatically when that connection becomes active":
    "当该连接变为活动状态时会自动切换",
  "Choose 'Follow OS detection' to use the Per-OS Default Layers instead":
    "选择“跟随操作系统检测”以使用按操作系统的默认层",
  "The layer set for the detected OS (Windows, macOS, …) is applied":
    "将应用为检测到的操作系统（Windows、macOS 等）设置的层",

  // Feature docs (DocTip) — PMW3610 driver
  "What is the PMW3610 driver?": "什么是 PMW3610 驱动？",
  "PMW3610 is the optical sensor inside the trackball. Its driver exposes low-level tuning for how motion is read.":
    "PMW3610 是轨迹球内部的光学传感器。其驱动程序公开了用于调整运动读取方式的低级选项。",
  "Typical settings": "典型设置",
  "CPI / sensitivity of the sensor": "传感器的 CPI / 灵敏度",
  "Orientation, axis rotation, and inversion": "方向、轴旋转和反转",
  "Polling rate and sleep / power behavior":
    "轮询频率和睡眠 / 电源行为",
  Note: "备注",
  "These values are read from and written to your keyboard's firmware. Change them in small steps.":
    "这些值从键盘的固件中读取和写入。请逐步小幅调整。",

  // Version history — reset dropdown
  Versions: "版本",
  "Reset to initial state": "重置为初始状态",
  "Saved versions": "已保存的版本",
  "No versions saved yet. A version is saved each time this tab reads the keyboard and finds something changed.":
    "尚未保存任何版本。每次此选项卡读取键盘并发现内容有变化时都会保存一个版本。",
  "Restores the keyboard's built-in default keymap and writes it to flash immediately.":
    "恢复键盘内置的默认键位，并立即写入闪存。",
  "Drops the unsaved edits in keyboard memory and reloads the keymap stored on the keyboard.":
    "放弃键盘内存中未保存的编辑，并重新加载键盘上保存的键位。",
  "Puts every macro and combo back to the firmware's compile-time defaults.":
    "将所有宏和组合键恢复为固件的编译时默认值。",
  "Drops the edits held in keyboard memory and reloads the macros and combos saved on the keyboard.":
    "放弃键盘内存中保存的编辑，并重新加载键盘上保存的宏和组合键。",
  "Reset every runtime macro and combo to the firmware defaults? Your customizations will be lost.":
    "是否将所有运行时宏和组合键重置为固件默认值？您的自定义内容将丢失。",
  "Wipes every persisted setting on the keyboard — keymap included — back to the firmware defaults.":
    "清除键盘上持久化的所有设置（包括键位），恢复为固件默认值。",

  // Version history — diff modal
  "Restore this version?": "恢复此版本？",
  "Saved {{timestamp}}. The values below are written to keyboard memory — press Save afterwards to store them permanently.":
    "保存于 {{timestamp}}。以下值会写入键盘内存 — 然后按“保存”以永久存储。",
  "Reading the current state from the keyboard...":
    "正在从键盘读取当前状态...",
  "This version matches the current state — nothing to write.":
    "此版本与当前状态一致 — 无需写入。",
  "Write to keyboard": "写入键盘",
  Field: "字段",
  "Selected version": "所选版本",
  "and {{count}} more changes": "以及其他 {{count}} 项更改",
  "(source {{source}})": "（来源 {{source}}）",

  // Version history — field names in the diff
  "Physical layout": "物理布局",
  "Layer {{index}}": "层 {{index}}",
  "{{layer}} › Name": "{{layer}} › 名称",
  "{{layer}} › Layer ID": "{{layer}} › 层 ID",
  "{{layer}} › Key {{position}}": "{{layer}} › 键位 {{position}}",
  "Macro {{index}}": "宏 {{index}}",
  "{{macro}} › Name": "{{macro}} › 名称",
  "{{macro}} › Step {{step}}": "{{macro}} › 步骤 {{step}}",
  "Macro tap duration (ms)": "宏点击时长（毫秒）",
  "Key positions": "键位",
  "Timeout (ms)": "超时（毫秒）",
  "Require prior idle (ms)": "需要预先空闲（毫秒）",
  "Combo timeout (ms)": "组合键超时（毫秒）",
  "Combo slow release": "组合键慢释放",
  "Combo require prior idle (ms)": "组合键需要预先空闲（毫秒）",
  "Delay {{ms}} ms": "延迟 {{ms}} 毫秒",
  "Type text": "输入文本",
  Press: "按下",
  Release: "释放",
  "Profile {{index}} › Name": "配置文件 {{index}} › 名称",
  "Output priority": "输出优先级",
  "Default layer › Connection {{index}}": "默认层 › 连接 {{index}}",
  "Default layer › OS {{os}}": "默认层 › 操作系统 {{os}}",
  "Sensitivity multiplier": "灵敏度乘数",
  "Sensitivity divisor": "灵敏度除数",
  "Rotation (degrees)": "旋转（度）",
  "Temporary layer enabled": "已启用临时层",
  "Temporary layer": "临时层",
  "Temporary layer activation delay (ms)": "临时层激活延迟（毫秒）",
  "Temporary layer deactivation delay (ms)": "临时层停用延迟（毫秒）",
  "Active layers": "激活的层",
  "Axis snap mode": "轴吸附模式",
  "Axis snap threshold": "轴吸附阈值",
  "Axis snap timeout (ms)": "轴吸附超时（毫秒）",
  "Invert X": "反转 X",
  "Invert Y": "反转 Y",
  "XY to scroll": "XY 转滚动",
  "Swap XY": "交换 XY",
  "Idle timeout": "空闲超时",
  "Deep sleep timeout": "深度睡眠超时",
  // Import/Export (Keyboard Abyss)
  "Import/Export": "导入/导出",
  "Sync keymaps with Keyboard Abyss": "与 Keyboard Abyss 同步键位",
  "Keyboard Abyss": "Keyboard Abyss",
  "Sign in to import and export keymaps.":
    "登录后可导入和导出键位。",
  "Sign in with Abyss": "使用 Abyss 登录",
  "Sign out": "退出登录",
  "A sign-in window opens at {{host}}. Your session lasts until this tab is closed.":
    "登录窗口将在 {{host}} 打开。会话在此选项卡关闭前一直有效。",
  Export: "导出",
  Import: "导入",
  "Upload the connected keyboard's keymap to Abyss, either as a new keymap or as a new version of an existing one.":
    "将已连接键盘的键位上传到 Abyss，可以作为新键位或现有键位的新版本。",
  "Pick a compatible keymap from Abyss, review what would change, and write it to the connected keyboard.":
    "从 Abyss 选择兼容的键位，检查将要更改的内容，然后写入已连接的键盘。",
  "Not available yet — this is still being built.":
    "尚不可用 — 仍在开发中。",

  // Import/Export — device snapshot
  "Keyboard snapshot": "键盘快照",
  "Read the keyboard before exporting or importing.":
    "在导出或导入之前读取键盘。",
  "Read keyboard": "读取键盘",
  "Read again": "重新读取",
  "Connected keyboard": "已连接的键盘",
  "Reading the keyboard. This is slower over Bluetooth than USB.":
    "正在读取键盘。通过蓝牙读取比 USB 慢。",
  "Matching the layout on Abyss...": "正在与 Abyss 上的布局匹配...",
  Keys: "按键数",
  Modules: "模块",
  "Matched the Abyss layout {{layout}}.":
    "已匹配到 Abyss 布局 {{layout}}。",
  "No exact layout match. Exporting will add a new variation of {{layout}}.":
    "没有完全匹配的布局。导出将添加 {{layout}} 的新变体。",
  "This layout is not registered on Abyss yet. Exporting will add it.":
    "此布局尚未在 Abyss 上注册。导出时将添加。",
  "This keyboard is not registered on Abyss yet. Exporting will create it under your account.":
    "此键盘尚未在 Abyss 上注册。导出时将在您的账户下创建。",

  // Import/Export — export section
  "Read the keyboard first to enable exporting.":
    "请先读取键盘以启用导出。",
  "Exporting uploads this keymap to {{host}} under your account.":
    "导出将把此键位上传到您在 {{host}} 的账户下。",
  Destination: "目标",
  "Export as a new keymap": "导出为新键位",
  "Update an existing keymap": "更新现有键位",
  "Export as new keymap": "导出为新键位",
  "Update keymap": "更新键位",
  "Keymap name": "键位名称",
  "Keymap to update": "要更新的键位",
  "Loading your keymaps...": "正在加载您的键位...",
  "No keymaps found for this keyboard":
    "未找到此键盘的键位",
  "Select a keymap": "选择键位",
  "Saved to Abyss as version {{version}}.":
    "已作为版本 {{version}} 保存到 Abyss。",
  "Open on Abyss": "在 Abyss 上打开",
  Include: "包含",
  "Keymap (layers & key bindings)": "键位（层和按键绑定）",
  "Module settings": "模块设置",

  Visibility: "可见性",
  "Private — only you": "私有 — 仅自己可见",
  "Public — anyone can find it": "公开 — 任何人都可发现",
  "Keymap JSON to upload": "要上传的键位 JSON",
  "Layout JSON to upload": "要上传的布局 JSON",
  "Not available.": "不可用。",

  // Import/Export — visual diff preview
  "Key {{index}}": "键位 {{index}}",
  "No layout geometry available for a preview.":
    "没有可用于预览的布局信息。",
  "This layer does not exist in the selected keymap.":
    "所选键位中不存在此层。",
  "No keys": "无按键",
  "Unnamed macro": "未命名的宏",
  "No steps": "无步骤",
  "wait {{ms}}ms": "等待 {{ms}} 毫秒",
  "tap {{ms}}ms": "点击 {{ms}} 毫秒",
  Added: "已添加",
  Removed: "已删除",
  Changed: "已更改",
  Raw: "原始",

  // Import/Export — JSON diff modal
  "Review changes": "查看更改",
  "Review changes as JSON": "以 JSON 格式查看更改",
  "Changes to upload": "要上传的更改",
  "Changes to write": "要写入的更改",
  "Left: the keymap currently on Abyss. Right: what this export would save.":
    "左侧：当前在 Abyss 上的键位。右侧：本次导出会保存的内容。",
  "Left: what is on the keyboard now. Right: the keymap from Abyss.":
    "左侧：当前键盘上的内容。右侧：来自 Abyss 的键位。",
  Inline: "内联",
  "Side by side": "并排",
  "Around changes": "仅显示更改",
  "Entire file": "整个文件",
  "No differences.": "没有差异。",

  // Import/Export — Abyss links
  "Open this keyboard on Abyss": "在 Abyss 上打开此键盘",
  "Register on Abyss": "在 Abyss 上注册",
  "This keyboard is not registered on Abyss yet. Register it on Abyss first so exports land in the catalog.":
    "此键盘尚未在 Abyss 上注册。请先在 Abyss 上注册，以便导出内容能进入目录。",

  // Import/Export — import section
  "Read the keyboard first to enable importing.":
    "请先读取键盘以启用导入。",
  "Writing changes the keyboard. Review the changes before confirming.":
    "写入会更改键盘内容。请在确认前查看更改。",
  "Keymap to write": "要写入的键位",
  "No compatible keymaps found for this keyboard":
    "未找到与此键盘兼容的键位",
  "Loading the keymap...": "正在加载键位...",
  "The keyboard already matches this keymap.":
    "键盘已与此键位一致。",
  "Written to the keyboard and re-read to confirm.":
    "已写入键盘并重新读取以确认。",
  "Write {{count}} changes to the keyboard? This replaces the current settings and cannot be undone.":
    "是否将 {{count}} 项更改写入键盘？这将替换当前设置且无法撤销。",

  // Import/Export — diff view
  "{{count}} changes": "{{count}} 项更改",
  Rename: "重命名",
  Module: "模块",
  "Show all {{count}} keys": "显示全部 {{count}} 个按键",
  "This replaces most of the keymap ({{count}} keys). The full list is long.":
    "这将替换键位的大部分（{{count}} 个按键）。完整列表很长。",
  "Show the full list anyway": "仍然显示完整列表",
  bindings: "按键绑定",
  "layer names": "层名称",
  combos: "组合键",
  macros: "宏",
  modules: "模块",

  // Import/Export — pre-flight checks
  "This keymap has {{target}} keys per layer but the keyboard has {{device}}.":
    "此键位每层有 {{target}} 个按键，但键盘有 {{device}} 个。",
  "This keymap covers {{target}} of the keyboard's {{device}} keys. The rest are left unchanged.":
    "此键位覆盖了键盘 {{device}} 个按键中的 {{target}} 个，其余保持不变。",
  "Writing needs {{needed}} layers; the keyboard has {{device}}. The missing ones will be added.":
    "写入需要 {{needed}} 层，但键盘只有 {{device}} 层。缺少的层将被添加。",
  "This keymap was made for the {{target}} layout; the keyboard reports {{device}}.":
    "此键位是为 {{target}} 布局制作的；键盘报告为 {{device}}。",

  // Import/Export — OAuth callback route
  "Completing Abyss sign-in...": "正在完成 Abyss 登录...",
  "Signed in to Abyss": "已登录 Abyss",
  "You can close this window.": "可以关闭此窗口。",
  "Abyss sign-in failed": "Abyss 登录失败",
  "Back to DYA Studio": "返回 DYA Studio",

  // Import/Export — error messages
  "Your Abyss session expired. Please log in again.":
    "您的 Abyss 会话已过期。请重新登录。",
  "Your Abyss account does not have permission for this action.":
    "您的 Abyss 账户无权执行此操作。",
  "This keymap no longer exists on Abyss.":
    "此键位在 Abyss 上已不存在。",
  "Abyss rejected this keymap. It may not match the connected keyboard.":
    "Abyss 拒绝了此键位。它可能与已连接的键盘不匹配。",
  "Too many requests to Abyss. Please wait a moment and try again.":
    "向 Abyss 发出的请求过多。请稍候再试。",
  "Abyss is having trouble right now. Please try again later.":
    "Abyss 当前遇到问题。请稍后重试。",
  "Could not reach Abyss. Check your network connection.":
    "无法连接到 Abyss。请检查您的网络连接。",
  "The keyboard is locked. Unlock it and try again.":
    "键盘已锁定。请解锁后重试。",
  "Abyss login was cancelled.": "Abyss 登录已取消。",
  "Abyss sign-in could not be completed. Please start again from the Import/Export tab.":
    "无法完成 Abyss 登录。请从导入/导出选项卡重新开始。",
  "Something went wrong talking to Abyss.":
    "与 Abyss 通信时出现问题。",
  "Abyss is not configured for this build.":
    "此构建未配置 Abyss。",
};

const dictionaries: Record<Language, Record<string, string>> = {
  en: {},
  ja,
  zh,
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
