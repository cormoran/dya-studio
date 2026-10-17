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
  resourcesTitle: string;
  resourcesNote: string;
};

/** Public compatibility copy is shared with metadata; it is not device discovery. */
export const aboutContent: Record<Language, AboutContent> = {
  en: {
    aboutLabel: "About DYA Studio",
    title: "Make your keyboard feel like yours",
    description:
      "Customize keymaps, layers and supported keyboard settings in your browser. DYA Studio works with the DYA series and compatible ZMK keyboards. Start with Demo to explore without a keyboard.",
    connect: "Open connection screen",
    guide: "Developer guide",
    releases: "Release notes",
    featuresTitle: "From everyday keymaps to fine-tuning",
    features: [
      {
        title: "Keys and layers",
        description:
          "Change key assignments, rename layers and switch between the layouts available on your keyboard. These features work with firmware that supports ZMK Studio.",
      },
      {
        title: "Macros, combos and encoders",
        description:
          "Create sequences of keystrokes, assign actions to key combinations and configure rotary encoders. These features require the corresponding DYA Studio firmware modules.",
      },
      {
        title: "Trackball and keyboard settings",
        description:
          "Adjust pointing sensitivity and scrolling, manage connection profiles and customize supported settings. Available controls depend on the modules included in your firmware.",
      },
      {
        title: "Try, save and share",
        description:
          "Explore the editor with Demo, then use JSON files and sharing tools to exchange compatible keymaps. Abyss sharing offers additional account features when you sign in.",
      },
    ],
    keyboardsTitle: "Find the right setup for your keyboard",
    keyboards:
      "DYA Studio supports the DYA series, including DYA Dash and DYA2, as well as other ZMK keyboards with ZMK Studio enabled. Keymap editing is the starting point; macros, combos, trackball controls and advanced settings need additional firmware modules. After you connect, DYA Studio shows the features your keyboard provides. See the developer guide if you need to enable Studio or add modules.",
    imageAlt: "DYA2 split keyboard with an integrated trackball",
    imageCaption: "DYA2 — a split keyboard with an integrated trackball.",
    compatibilityTitle: "Browser and connection requirements",
    compatibilityIntro:
      "You can read the guide and explore Demo without a keyboard. To connect a real keyboard, choose a browser and connection method below. Desktop Chrome or Edge over USB is a good place to start.",
    columns: [
      "Your environment",
      "Read / Demo",
      "USB connection",
      "BLE connection",
    ],
    environments: [
      [
        "Windows / macOS / ChromeOS · Chrome or Edge",
        "Available",
        "Web Serial with serial-port permission",
        "Requires Web Bluetooth and compatible Studio BLE firmware",
      ],
      [
        "Linux · Chrome or Edge",
        "Available",
        "Web Serial; you may need to grant OS serial-port access",
        "Depends on browser configuration and firmware; use USB if BLE is unavailable",
      ],
      [
        "Android · Chrome",
        "Available",
        "WebUSB; requires USB host/OTG, a data cable and an accessible keyboard USB interface",
        "Requires Web Bluetooth and compatible Studio BLE firmware",
      ],
      [
        "iOS / iPadOS · Safari",
        "Read and explore without a keyboard",
        "Not supported in Safari",
        "Not supported in Safari",
      ],
      [
        "Firefox / Safari · desktop",
        "Read and explore without a keyboard",
        "Use Chrome or Edge to connect",
        "Use a browser with Web Bluetooth support",
      ],
    ],
    caveat:
      "USB and BLE require a secure connection to this site, browser permission and firmware that supports the selected transport. Browser support and OS settings can vary. If your keyboard does not appear or the connection fails, check the connection-screen guidance and the developer guide. On Android, the OS may prevent access to the USB interface.",
    startTitle: "Get started",
    steps: [
      {
        title: "1. Explore with Demo",
        description:
          "Open the connection screen and select Demo. You can try the editor with a simulated keyboard before connecting your own.",
      },
      {
        title: "2. Connect your keyboard",
        description:
          "For USB, connect a data cable, select USB and choose your keyboard in the browser picker. For BLE, check that your firmware supports Studio over BLE, then select BLE and choose your keyboard. Read the connection notice and unlock the keyboard when prompted.",
      },
      {
        title: "3. Customize and save",
        description:
          "Choose a page to edit your keymap or available settings. Keymap changes are applied to keyboard memory; use Save to keep them after a restart. Follow the save guidance on each settings page. Demo lets you practise without changing a real keyboard.",
      },
    ],
    privacy:
      "Opening this guide does not connect to a keyboard or save or discard edits. Use the connection screen when you are ready. If you are already connected, you can read this page and return to your session. The connection screen can also resume a saved session.",
    resourcesTitle: "Keep exploring",
    resourcesNote:
      "The developer guide explains firmware setup, optional modules and connection troubleshooting. Release notes introduce new features and improvements. The developer guide is available in Japanese and English; Chinese readers see its English version.",
  },
  ja: {
    aboutLabel: "DYA Studio について",
    title: "いつものキーボードを、もっと自分好みに",
    description:
      "キーの割り当てやレイヤー、キーボードの設定をブラウザから変更できます。DYA シリーズはもちろん、対応する ZMK キーボードでも利用できます。まずはキーボード不要の Demo で操作を試してみてください。",
    connect: "接続画面へ",
    guide: "開発者ガイド",
    releases: "リリースノート",
    featuresTitle: "キーの割り当てから、使い心地の調整まで",
    features: [
      {
        title: "キーとレイヤー",
        description:
          "キーの割り当てやレイヤー名を変更し、キーボードに用意された配列を選べます。ZMK Studio 対応の firmware で利用できます。",
      },
      {
        title: "マクロ・コンボ・エンコーダー",
        description:
          "一連のキー操作をマクロにまとめたり、同時押しに動作を割り当てたり、ロータリーエンコーダーを設定できます。利用する機能に対応した DYA Studio 用 firmware モジュールが必要です。",
      },
      {
        title: "トラックボールとキーボードの設定",
        description:
          "ポインターの感度やスクロールを調整し、接続先のプロファイルや各種設定を変更できます。利用できる項目は firmware に組み込まれたモジュールによって変わります。",
      },
      {
        title: "試す・保存する・共有する",
        description:
          "Demo で操作を試し、JSON ファイルや共有機能で互換性のあるキーマップを交換できます。Abyss にログインすると、アカウントを使った共有機能も利用できます。",
      },
    ],
    keyboardsTitle: "自分のキーボードで使うには",
    keyboards:
      "DYA Dash・DYA2 をはじめとする DYA シリーズと、ZMK Studio を有効にした ZMK キーボードで利用できます。基本のキーマップ編集に加え、マクロ・コンボ・トラックボール・高度な設定には、それぞれに対応する firmware モジュールが必要です。接続すると、そのキーボードで使える機能が画面に表示されます。Studio の有効化やモジュールの追加は、開発者ガイドを参照してください。",
    imageAlt: "トラックボールを搭載した左右分割キーボード DYA2",
    imageCaption: "DYA2 — トラックボールを搭載した左右分割キーボード。",
    compatibilityTitle: "使える環境と接続方法",
    compatibilityIntro:
      "紹介の閲覧や Demo は、キーボードを接続せずに利用できます。実機を接続するときは、お使いの環境に合う方法を選んでください。初めての接続には、パソコンの Chrome または Edge と USB をおすすめします。",
    columns: ["お使いの環境", "閲覧・Demo", "USB 接続", "BLE 接続"],
    environments: [
      [
        "Windows / macOS / ChromeOS · Chrome・Edge",
        "利用できます",
        "Web Serial を使用。シリアルポートへのアクセスを許可してください",
        "Web Bluetooth と Studio BLE 対応 firmware が必要です",
      ],
      [
        "Linux · Chrome・Edge",
        "利用できます",
        "Web Serial を使用。OS 側でシリアルポートの権限設定が必要な場合があります",
        "ブラウザ設定と firmware に依存します。利用できない場合は USB をお使いください",
      ],
      [
        "Android · Chrome",
        "利用できます",
        "WebUSB を使用。USB ホスト/OTG・データケーブル・アクセス可能なキーボードの USB interface が必要です",
        "Web Bluetooth と Studio BLE 対応 firmware が必要です",
      ],
      [
        "iOS / iPadOS · Safari",
        "接続なしで閲覧・体験できます",
        "Safari では対応していません",
        "Safari では対応していません",
      ],
      [
        "Firefox / Safari · パソコン",
        "接続なしで閲覧・体験できます",
        "接続には Chrome または Edge をお使いください",
        "Web Bluetooth 対応ブラウザをお使いください",
      ],
    ],
    caveat:
      "USB・BLE 接続には、このサイトへの安全な接続、ブラウザのアクセス許可、選択した接続方法に対応する firmware が必要です。利用できる接続方法はブラウザや OS の設定によって異なります。キーボードが表示されない・接続できない場合は、接続画面の案内や開発者ガイドを確認してください。Android では OS によって USB interface へのアクセスが制限される場合があります。",
    startTitle: "始め方",
    steps: [
      {
        title: "1. Demo で試す",
        description:
          "接続画面を開き、Demo を選びます。擬似キーボードで、実機を用意する前にエディターの操作を体験できます。",
      },
      {
        title: "2. キーボードを接続する",
        description:
          "USB の場合はデータケーブルをつなぎ、接続画面で USB を選んでキーボードを指定します。BLE の場合は firmware の Studio BLE 対応を確認してから BLE を選びます。接続時の注意事項を読み、求められたらキーボードを unlock してください。",
      },
      {
        title: "3. 設定して保存する",
        description:
          "使いたい機能のページを開き、キーマップや設定を変更します。キーマップの変更はキーボードのメモリに反映され、Save で再起動後も残せます。各設定ページの保存案内に従って操作してください。Demo なら実機の設定を変えずに練習できます。",
      },
    ],
    privacy:
      "この紹介を開くだけで、キーボードへの接続や編集の保存・破棄は行いません。準備ができたら接続画面へ進んでください。接続済みの場合は、そのまま説明を読んで編集に戻れます。接続画面では、前回の接続を再開することもできます。",
    resourcesTitle: "もっと詳しく知る",
    resourcesNote:
      "firmware の準備、追加モジュール、接続で困ったときの対処は開発者ガイドへ。新機能や改善点はリリースノートで紹介しています。開発者ガイドは日本語・英語で提供しており、中国語を選択している場合は英語で表示します。",
  },
  zh: {
    aboutLabel: "关于 DYA Studio",
    title: "让日常使用的键盘更合你心意",
    description:
      "在浏览器中修改键位、层和键盘设置。DYA Studio 适用于 DYA 系列和兼容的 ZMK 键盘。先用无需键盘的演示模式体验操作。",
    connect: "打开连接页面",
    guide: "开发者指南",
    releases: "发行说明",
    featuresTitle: "从键位分配到使用手感调整",
    features: [
      {
        title: "键位与层",
        description:
          "修改按键分配和层名称，选择键盘中提供的布局。这些功能适用于支持 ZMK Studio 的固件。",
      },
      {
        title: "宏、组合键与编码器",
        description:
          "将一连串按键操作组合为宏，为同时按下的按键分配行为，并设置旋转编码器。需要安装对应功能的 DYA Studio 固件模块。",
      },
      {
        title: "轨迹球与键盘设置",
        description:
          "调整指针灵敏度和滚动方式，管理连接配置和各项设置。可用选项取决于固件中包含的模块。",
      },
      {
        title: "体验、保存与分享",
        description:
          "通过演示模式熟悉操作，使用 JSON 文件和分享功能交换兼容键位。登录 Abyss 后，还可使用账户分享功能。",
      },
    ],
    keyboardsTitle: "如何用于你的键盘",
    keyboards:
      "DYA Dash、DYA2 等 DYA 系列，以及已启用 ZMK Studio 的 ZMK 键盘均可使用。基础键位编辑之外，宏、组合键、轨迹球和高级设置需要对应的固件模块。连接后，DYA Studio 会显示键盘提供的功能。如需启用 Studio 或添加模块，请阅读开发者指南。",
    imageAlt: "配有轨迹球的 DYA2 分体键盘",
    imageCaption: "DYA2 — 配有轨迹球的分体键盘。",
    compatibilityTitle: "使用环境与连接方式",
    compatibilityIntro:
      "无需连接键盘即可阅读介绍或体验演示模式。连接真实键盘时，请选择适合当前环境的方式。首次连接建议使用电脑上的 Chrome 或 Edge 及 USB。",
    columns: ["你的环境", "阅读与演示", "USB 连接", "BLE 连接"],
    environments: [
      [
        "Windows / macOS / ChromeOS · Chrome 或 Edge",
        "可使用",
        "通过 Web Serial 连接；请允许串口访问",
        "需要 Web Bluetooth 和支持 Studio BLE 的固件",
      ],
      [
        "Linux · Chrome 或 Edge",
        "可使用",
        "通过 Web Serial 连接；可能需要设置系统串口权限",
        "取决于浏览器设置和固件；不可用时请使用 USB",
      ],
      [
        "Android · Chrome",
        "可使用",
        "通过 WebUSB 连接；需要 USB 主机/OTG、数据线和可访问的键盘 USB 接口",
        "需要 Web Bluetooth 和支持 Studio BLE 的固件",
      ],
      [
        "iOS / iPadOS · Safari",
        "无需连接即可阅读与体验",
        "Safari 不支持",
        "Safari 不支持",
      ],
      [
        "Firefox / Safari · 电脑",
        "无需连接即可阅读与体验",
        "连接时请使用 Chrome 或 Edge",
        "请使用支持 Web Bluetooth 的浏览器",
      ],
    ],
    caveat:
      "USB 和 BLE 连接需要与本站建立安全连接、获得浏览器访问权限，并使用支持相应连接方式的固件。可用方式因浏览器和操作系统设置而异。如果键盘未出现或连接失败，请查看连接页面的提示和开发者指南。Android 系统可能限制对 USB 接口的访问。",
    startTitle: "如何开始",
    steps: [
      {
        title: "1. 使用演示模式体验",
        description:
          "打开连接页面并选择 Demo。通过模拟键盘，在准备真实设备之前熟悉编辑器。",
      },
      {
        title: "2. 连接键盘",
        description:
          "使用 USB 时，连接数据线，在连接页面选择 USB 并指定键盘。使用 BLE 时，先确认固件支持 Studio BLE，再选择 BLE。请阅读连接注意事项，并在提示时解锁键盘。",
      },
      {
        title: "3. 设置并保存",
        description:
          "打开所需功能页面，修改键位或设置。键位修改先应用到键盘内存，点击 Save 后可在重启后保留。其他设置请遵循各页面的保存提示。演示模式可用于练习，不会修改真实键盘。",
      },
    ],
    privacy:
      "仅阅读本介绍不会连接键盘，也不会保存或丢弃编辑。准备好后再进入连接页面。已连接时，可直接阅读介绍并返回编辑。连接页面也可以恢复上次会话。",
    resourcesTitle: "了解更多",
    resourcesNote:
      "固件准备、附加模块和连接故障排查请参阅开发者指南；新功能与改进请查看发行说明。开发者指南提供日语与英语，选择中文时显示英语版本。",
  },
};
