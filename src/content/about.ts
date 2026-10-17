import type { Language } from "../i18n/translations";

export const ABOUT_PATH = "/about";

type AboutContent = {
  aboutLabel: string;
  title: string;
  description: string;
  connect: string;
  guide: string;
  releases: string;
  featuresTitle: string;
  features: { title: string; description: string }[];
  keyboardsTitle: string;
  keyboards: string;
  imageAlt: string;
  imageCaption: string;
  compatibilityTitle: string;
  compatibilityIntro: string;
  columns: string[];
  environments: string[][];
  caveat: string;
  startTitle: string;
  steps: { title: string; description: string }[];
  privacy: string;
  sourcesTitle: string;
  sourcesNote: string;
};

/** Public compatibility copy is shared with metadata; it is not device discovery. */
export const aboutContent: Record<Language, AboutContent> = {
  en: {
    aboutLabel: "About DYA Studio",
    title: "Your ZMK keyboard, configured in your browser",
    description:
      "DYA Studio is a keymap and settings editor for DYA and other compatible ZMK keyboards. Explore with Demo, then connect your keyboard when you are ready.",
    connect: "Open connection screen",
    guide: "Developer guide",
    releases: "Release notes",
    featuresTitle: "What can you change?",
    features: [
      {
        title: "Keymaps · Standard ZMK Studio firmware",
        description:
          "Assign behaviors built into your firmware, edit layer names and use available layouts and reserved layers. ZMK Studio support and an unlock binding must be configured on the keyboard; the UI cannot add arbitrary firmware behaviors.",
      },
      {
        title: "Macros, combos and encoders · Additional firmware support",
        description:
          "Runtime macro/combo editing and encoder configuration require the corresponding custom subsystems. Standard Studio support alone does not enable these editors.",
      },
      {
        title:
          "Trackball, connections and settings · Additional firmware modules",
        description:
          "Tune pointing input, manage connection profiles and change supported settings when your firmware exposes the matching subsystems. Availability is determined after connection.",
      },
      {
        title: "Preview and share",
        description:
          "Try the interface with a simulated keyboard, or exchange compatible keymaps through JSON and sharing tools. Abyss account features require separate sign-in. Demo does not verify your hardware or flash persistence.",
      },
    ],
    keyboardsTitle: "Will my keyboard work?",
    keyboards:
      "DYA Dash and DYA2 are examples of the DYA series. A model name alone does not guarantee every feature: the installed firmware, Studio configuration, transport and advertised capabilities determine what is available. Other ZMK keyboards can use the standard keymap features when Studio is enabled. Advanced features need additional modules; see the developer guide before changing firmware.",
    imageAlt: "DYA2 split keyboard with an integrated trackball",
    imageCaption:
      "Product example: DYA2. Photo from this project's Home gallery; it is not a compatibility certification.",
    compatibilityTitle: "Browser and connection requirements",
    compatibilityIntro:
      "Reading this page and using Demo do not require Web Serial, WebUSB or Web Bluetooth. The table describes connection prerequisites, not a tested list of every device and browser version. Use an up-to-date browser with JavaScript enabled.",
    columns: ["Environment", "Read / Demo", "USB", "BLE"],
    environments: [
      [
        "Windows / macOS / ChromeOS · Chrome or Edge",
        "Available without hardware APIs",
        "Web Serial; serial permission and Studio USB firmware required",
        "Web Bluetooth API may be available; ZMK transport and OS compatibility must also be checked",
      ],
      [
        "Linux · Chrome or Edge",
        "Available without hardware APIs",
        "Web Serial; OS serial-port permissions may be needed",
        "Browser configuration and ZMK BLE support vary; unverified here",
      ],
      [
        "Android · Chrome",
        "Available without hardware APIs",
        "DYA Studio uses WebUSB; USB host/OTG, a data cable and an accessible CDC interface are required. Interface claim may fail",
        "Requires Web Bluetooth and compatible Studio BLE firmware; device/OS combination unverified",
      ],
      [
        "iOS / iPadOS · Safari and other browsers",
        "Reading / Demo require no hardware APIs; browser combination unverified",
        "No supported USB path documented here",
        "Safari has no Web Bluetooth path. Specialized browsers such as Bluefy are unverified; do not assume compatibility",
      ],
      [
        "Firefox / Safari · desktop",
        "Available without hardware APIs",
        "No supported Web Serial path",
        "No supported Web Bluetooth path",
      ],
    ],
    caveat:
      "Hardware connections require a secure context (HTTPS or local development), OS permission and matching firmware. API presence alone does not prove connectivity. USB/BLE connections, all OS/browser combinations and third-party browsers have not been physically verified for this page. Demo changes are simulated, not writes to a real keyboard.",
    startTitle: "Get started",
    steps: [
      {
        title: "Demo · Explore without a keyboard",
        description:
          "Open the connection screen and choose Demo. It starts only when you choose it, except when the connection screen resumes an existing saved session.",
      },
      {
        title: "USB · Connect with a data cable",
        description:
          "Open the connection screen, choose USB, read the notice and select your keyboard in the browser picker. Your firmware must expose the Studio USB endpoint; unlock the keyboard when prompted.",
      },
      {
        title: "BLE · Check firmware and browser support",
        description:
          "Open the connection screen, choose BLE, read the notice and select a compatible keyboard. A Bluetooth keyboard connection to your OS alone is not enough to enable the Studio service.",
      },
    ],
    privacy:
      "Reading this introduction does not start a connection, request device permission, update firmware or save/discard keyboard edits. Returning to the connection screen can resume a saved session. An already running connection continues while you read; same-tab navigation preserves its session and edits. A new tab or Reload starts a separate app instance.",
    sourcesTitle: "Sources and further reading",
    sourcesNote:
      "Requirements reviewed on 18 October 2026 against the app's USB/BLE implementation, developer guide and the official references below. Browser API documentation is not a hardware test. The developer guide currently provides Japanese and English; Chinese readers see its English fallback.",
  },
  ja: {
    aboutLabel: "DYA Studio について",
    title: "ZMK キーボードを、ブラウザから自分好みに",
    description:
      "DYA Studio は DYA シリーズと対応する ZMK キーボードのキーマップ・設定エディターです。まずは Demo で試し、準備ができたらキーボードを接続できます。",
    connect: "接続画面へ",
    guide: "開発者ガイド",
    releases: "リリースノート",
    featuresTitle: "どんなことができる？",
    features: [
      {
        title: "キーマップ · 標準 ZMK Studio 対応 firmware",
        description:
          "firmware に組み込まれた動作の割当、レイヤー名の編集、利用可能な配列・予約レイヤーの選択ができます。キーボード側の Studio 有効化と unlock キーの設定が必要です。任意の firmware 動作を新規追加するものではありません。",
      },
      {
        title: "マクロ・コンボ・エンコーダー · 追加 firmware 対応",
        description:
          "実行時のマクロ・コンボ編集やエンコーダー設定には、対応する custom subsystem が必要です。標準 Studio 対応だけではこれらの編集機能は有効になりません。",
      },
      {
        title: "トラックボール・接続先・各種設定 · 追加 firmware モジュール",
        description:
          "対応する subsystem を firmware が公開している場合に、ポインティング入力の調整、接続プロファイル管理、各種設定を利用できます。実際の可用性は接続後に判定します。",
      },
      {
        title: "試用と共有",
        description:
          "擬似キーボードの Demo で操作を試し、互換性のあるキーマップを JSON や共有ツールで交換できます。Abyss のアカウント機能には別途ログインが必要です。Demo は実機動作や flash 保存の検証にはなりません。",
      },
    ],
    keyboardsTitle: "自分のキーボードで使える？",
    keyboards:
      "DYA Dash・DYA2 は DYA シリーズの一例です。機種名だけで全機能対応を保証するものではありません。搭載 firmware、Studio 設定、接続方式、公開される capability により利用可能な機能が決まります。一般の ZMK キーボードでも Studio を有効にしていれば標準のキーマップ機能を利用できます。高度な機能には追加モジュールが必要です。firmware を変更する前に開発者ガイドを参照してください。",
    imageAlt: "トラックボールを搭載した左右分割キーボード DYA2",
    imageCaption:
      "製品例: DYA2。本プロジェクトの Home ギャラリーの写真を再利用しています。対応を認証する画像ではありません。",
    compatibilityTitle: "ブラウザと接続の条件",
    compatibilityIntro:
      "紹介の閲覧と Demo には Web Serial・WebUSB・Web Bluetooth は不要です。下表は接続の前提条件であり、全機種・ブラウザの検証済み一覧ではありません。JavaScript を有効にした最新のブラウザを使用してください。",
    columns: ["環境", "閲覧 / Demo", "USB", "BLE"],
    environments: [
      [
        "Windows / macOS / ChromeOS · Chrome・Edge",
        "接続 API なしで利用可",
        "Web Serial。シリアルポートの権限と Studio USB 対応 firmware が必要",
        "Web Bluetooth API があっても、ZMK の接続方式と OS の互換性確認が必要",
      ],
      [
        "Linux · Chrome・Edge",
        "接続 API なしで利用可",
        "Web Serial。OS 側のシリアルポート権限が必要な場合あり",
        "ブラウザ設定と ZMK BLE 対応に依存。このページでは未検証",
      ],
      [
        "Android · Chrome",
        "接続 API なしで利用可",
        "DYA Studio は WebUSB を使用。USB ホスト/OTG・データケーブル・アクセス可能な CDC interface が必要。claim に失敗する場合あり",
        "Web Bluetooth と Studio BLE 対応 firmware が必要。端末・OS の組合せは未検証",
      ],
      [
        "iOS / iPadOS · Safari 等",
        "閲覧 / Demo は接続 API 不要。ブラウザの組合せは未検証",
        "ここでは対応 USB 経路を案内していません",
        "Safari は Web Bluetooth 非対応。Bluefy 等の専用ブラウザは未検証で、対応を保証しません",
      ],
      [
        "Firefox / Safari · desktop",
        "接続 API なしで利用可",
        "対応する Web Serial 経路なし",
        "対応する Web Bluetooth 経路なし",
      ],
    ],
    caveat:
      "実機接続には安全なコンテキスト（HTTPS またはローカル開発）、OS の権限、対応 firmware が必要です。API の存在だけでは接続成功を保証できません。このページでは USB/BLE 実機接続、全 OS・ブラウザの組合せ、専用ブラウザの動作は未確認です。Demo の変更は擬似デバイス内のもので、実機への書込みではありません。",
    startTitle: "始め方",
    steps: [
      {
        title: "Demo · キーボードなしで試す",
        description:
          "接続画面で Demo を選びます。保存済み session を接続画面で再開する場合を除き、自分で選択するまで開始しません。",
      },
      {
        title: "USB · データケーブルで接続",
        description:
          "接続画面で USB を選び、注意事項を読んでブラウザの選択画面からキーボードを指定します。firmware の Studio USB endpoint 対応が必要です。求められたらキーボードを unlock してください。",
      },
      {
        title: "BLE · firmware とブラウザの対応を確認",
        description:
          "接続画面で BLE を選び、注意事項を読んで対応キーボードを指定します。OS に Bluetooth キーボードとして接続しただけでは Studio のサービスは有効になりません。",
      },
    ],
    privacy:
      "この紹介を読むだけで接続・権限要求・firmware 更新・編集の保存や破棄は行いません。接続画面へ戻ると保存済み session を再開する場合があります。すでに進行中の接続は閲覧中も継続し、同じタブ内の移動では session と編集を保持します。別タブや Reload は別のアプリ instance になります。",
    sourcesTitle: "根拠と詳しい資料",
    sourcesNote:
      "2026年10月18日に、本アプリの USB/BLE 実装・開発者ガイドと以下の公式資料を照合しました。ブラウザ API の説明は実機の動作検証ではありません。開発者ガイドは現在日本語・英語で提供し、中国語では英語へフォールバックします。",
  },
  zh: {
    aboutLabel: "关于 DYA Studio",
    title: "在浏览器中定制你的 ZMK 键盘",
    description:
      "DYA Studio 是适用于 DYA 系列和兼容 ZMK 键盘的键位与设置编辑器。先通过演示模式体验，再连接你的键盘。",
    connect: "打开连接页面",
    guide: "开发者指南",
    releases: "发行说明",
    featuresTitle: "可以修改什么？",
    features: [
      {
        title: "键位 · 标准 ZMK Studio 固件",
        description:
          "分配固件中已有的行为，编辑层名称，并使用可用布局和预留层。键盘必须启用 Studio 并配置解锁按键；界面无法添加任意固件行为。",
      },
      {
        title: "宏、组合键和编码器 · 需要附加固件支持",
        description:
          "运行时宏与组合键编辑、编码器设置需要对应的自定义子系统。仅支持标准 Studio 并不代表这些编辑功能可用。",
      },
      {
        title: "轨迹球、连接和设置 · 需要附加固件模块",
        description:
          "固件公开对应子系统后，才能调整指针输入、管理连接配置和修改支持的设置。实际可用功能在连接后判断。",
      },
      {
        title: "体验与分享",
        description:
          "使用模拟键盘体验界面，通过 JSON 和分享工具交换兼容键位。Abyss 账户功能需要单独登录。演示模式无法验证硬件或闪存持久性。",
      },
    ],
    keyboardsTitle: "我的键盘能用吗？",
    keyboards:
      "DYA Dash 和 DYA2 是 DYA 系列的示例。型号名称并不保证所有功能可用：安装的固件、Studio 配置、连接方式和公开能力共同决定实际功能。其他 ZMK 键盘启用 Studio 后也可使用标准键位功能。高级功能需要附加模块；修改固件前请阅读开发者指南。",
    imageAlt: "配有轨迹球的 DYA2 分体键盘",
    imageCaption:
      "产品示例：DYA2。照片来自本项目的主页图库，不代表兼容性认证。",
    compatibilityTitle: "浏览器与连接条件",
    compatibilityIntro:
      "阅读本页和使用演示模式无需 Web Serial、WebUSB 或 Web Bluetooth。下表说明连接前提，并非所有设备与浏览器版本的测试清单。请使用启用 JavaScript 的新版浏览器。",
    columns: ["环境", "阅读 / 演示", "USB", "BLE"],
    environments: [
      [
        "Windows / macOS / ChromeOS · Chrome 或 Edge",
        "无需硬件 API",
        "需要 Web Serial、串口权限和支持 Studio USB 的固件",
        "即使提供 Web Bluetooth API，仍需确认 ZMK 连接方式和操作系统兼容性",
      ],
      [
        "Linux · Chrome 或 Edge",
        "无需硬件 API",
        "Web Serial；可能需要操作系统串口权限",
        "取决于浏览器配置和 ZMK BLE 支持；本页未验证",
      ],
      [
        "Android · Chrome",
        "无需硬件 API",
        "DYA Studio 使用 WebUSB。需要 USB 主机/OTG、数据线和可访问的 CDC 接口；接口占用可能失败",
        "需要 Web Bluetooth 和兼容的 Studio BLE 固件；设备与系统组合未验证",
      ],
      [
        "iOS / iPadOS · Safari 等浏览器",
        "阅读 / 演示无需硬件 API；浏览器组合未验证",
        "本页未提供受支持的 USB 路径",
        "Safari 不提供 Web Bluetooth。Bluefy 等专用浏览器未验证，请勿假定兼容",
      ],
      [
        "Firefox / Safari · 桌面",
        "无需硬件 API",
        "无受支持的 Web Serial 路径",
        "无受支持的 Web Bluetooth 路径",
      ],
    ],
    caveat:
      "实机连接需要安全上下文（HTTPS 或本地开发）、操作系统权限及兼容固件。API 存在并不保证连接成功。本页未实机验证 USB/BLE、全部操作系统与浏览器组合或第三方专用浏览器。演示中的修改仅作用于模拟设备，不会写入真实键盘。",
    startTitle: "如何开始",
    steps: [
      {
        title: "演示 · 无需键盘即可体验",
        description:
          "打开连接页面并选择 Demo。除连接页面恢复已保存的会话外，仅在你主动选择后启动。",
      },
      {
        title: "USB · 使用数据线连接",
        description:
          "在连接页面选择 USB，阅读注意事项，并在浏览器选择器中指定键盘。固件必须提供 Studio USB 端点；出现提示时请解锁键盘。",
      },
      {
        title: "BLE · 确认固件和浏览器支持",
        description:
          "在连接页面选择 BLE，阅读注意事项并指定兼容键盘。仅将蓝牙键盘连接到操作系统，并不能启用 Studio 服务。",
      },
    ],
    privacy:
      "阅读本介绍不会发起连接、请求设备权限、更新固件或保存/丢弃键盘编辑。返回连接页面可能恢复已保存会话。正在进行的连接会在阅读期间继续；同一标签页内的导航保留会话与编辑。新标签页或重新加载会启动独立应用实例。",
    sourcesTitle: "依据与更多资料",
    sourcesNote:
      "于2026年10月18日对照本应用 USB/BLE 实现、开发者指南及以下官方资料核对。浏览器 API 文档不等于硬件测试。开发者指南目前提供日语和英语；中文选择下显示英语回退内容。",
  },
};
