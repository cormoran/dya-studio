import type {
  DeveloperGuideNavigationItem,
  DeveloperGuidePageDefinition,
  DeveloperGuideSection as RenderedDeveloperGuideSection,
} from "../components/developerGuide/types";
import { createElement } from "react";
import type { Language } from "../i18n/translations";

/**
 * Static content for the keyboard-developer guide.
 *
 * These definitions deliberately contain no device state or RPC calls: pages
 * under /developer-guide must render before a keyboard is connected.
 */

export const developerGuideImageDirectory =
  "/images/developer-guide/light-mode";
export const DEVELOPER_GUIDE_PATH = "/developer-guide";

export type DeveloperGuideRoute =
  | "/developer-guide"
  | "/developer-guide/level-1"
  | "/developer-guide/level-2"
  | "/developer-guide/modules/keymap"
  | "/developer-guide/modules/trackball"
  | "/developer-guide/modules/connection"
  | "/developer-guide/modules/settings"
  | "/developer-guide/modules/diagnostics"
  | "/developer-guide/level-3"
  | "/developer-guide/reference/keyboard-config"
  | "/developer-guide/troubleshooting";

export interface DeveloperGuideScreenshot {
  /** Path relative to the repository; the guide uses light-mode captures only. */
  src: string;
  alt: string;
  caption: string;
}

export interface DeveloperGuideSection {
  title: string;
  body: string[];
  bullets?: string[];
  ordered?: boolean;
  links?: { label: string; href: string }[];
  linkGroups?: {
    title: string;
    href?: string;
    links: { label: string; href: string }[];
  }[];
  table?: { headers: string[]; rows: string[][] };
  image?: DeveloperGuideScreenshot;
  code?: { language: "conf" | "yaml" | "text"; value: string };
}

export interface DeveloperGuidePage {
  route: DeveloperGuideRoute;
  title: string;
  summary: string;
  level?: 1 | 2 | 3;
  screenshots?: DeveloperGuideScreenshot[];
  sections: DeveloperGuideSection[];
  prerequisites?: string[];
  related: DeveloperGuideRoute[];
  next?: DeveloperGuideRoute;
}

const screenshot = (
  filename: string,
  alt: string,
  caption: string,
): DeveloperGuideScreenshot => ({
  src: `${developerGuideImageDirectory}/${filename}`,
  alt,
  caption,
});

const allInOneManifest =
  "https://github.com/cormoran/zmk-keyboard-dya2/blob/eca79a3a9adfb0b9015508db1fa4572f6680152f/config/west-dependency.yml#L14-L64";
const dya2Config =
  "https://github.com/cormoran/zmk-keyboard-dya2/blob/main/boards/shields/dya2/dya2_right.conf";
const dya2Dtsi =
  "https://github.com/cormoran/zmk-keyboard-dya2/blob/main/boards/shields/dya2/dya2.dtsi";

export const developerGuidePages: Record<
  DeveloperGuideRoute,
  DeveloperGuidePage
> = {
  "/developer-guide": {
    route: "/developer-guide",
    title: "あなたの ZMK キーボードを DYA Studio に対応させる",
    summary:
      "ZMK 公式の機能から始め、必要に応じて既存モジュールや独自 RPC を段階的に追加します。",
    sections: [
      {
        title: "3 つの対応レベル",
        body: [
          "初めからすべてに対応する必要はありません。まずは ZMK 公式の機能だけから始め、必要になったときに機能を追加できます。",
        ],
        links: [
          {
            label: "レベル 1 — 公式 ZMK Studio: Keymap を編集できるようにする",
            href: "/developer-guide/level-1",
          },
          {
            label:
              "レベル 2 — DYA 拡張: Macro / Combo、Trackball、Connection、Settings、診断を追加する",
            href: "/developer-guide/level-2",
          },
          {
            label:
              "レベル 3 — 独自モジュール: Web からの編集に対応した ZMK モジュールや設定の画面を作る",
            href: "/developer-guide/level-3",
          },
        ],
      },
    ],
    related: [
      "/developer-guide/level-1",
      "/developer-guide/level-2",
      "/developer-guide/level-3",
    ],
    next: "/developer-guide/level-1",
  },
  "/developer-guide/level-1": {
    route: "/developer-guide/level-1",
    title: "レベル 1: 公式 ZMK Studio に対応する",
    summary:
      "DYA Studio の Keymap 画面でキー割り当てを変更できる最小構成です。",
    level: 1,
    screenshots: [
      screenshot(
        "level-1-keymap.png",
        "カスタムモジュールを無効にしたライトモードの Keymap エディタ",
        "公式 ZMK Studio の Keymap 機能だけを有効にした状態",
      ),
    ],
    sections: [
      {
        title: "できること",
        body: [],
        bullets: [
          "キー割り当てを編集する",
          "レイヤー名や並びを編集する",
          "レイアウトを変更する",
        ],
      },
      {
        title: "できないこと",
        body: [],
        bullets: [
          "マクロ、コンボ、トラックボール設定などの Web からの編集",
          "Linux 以外での BLE 接続による Web からの編集",
          "その他いろいろ",
        ],
      },
      {
        title: "最短手順",
        body: [
          "ZMK 公式の方法で対応できます。分割キーボードでは、PC と通信する側だけに Studio RPC を入れます。",
        ],
        links: [
          {
            label: "1. physical layout の keys と matrix transform を定義する",
            href: "https://zmk.dev/docs/hardware-integration/physical-layouts",
          },
          {
            label:
              "2. studio-rpc-usb-uart snippet と CONFIG_ZMK_STUDIO を追加する",
            href: "https://zmk.dev/docs/features/studio#adding-zmk-studio-support-to-a-keyboard",
          },
          {
            label:
              "3. keymap に &studio_unlock と必要な reserved layer を追加する",
            href: "https://zmk.dev/docs/features/studio#keymap-changes",
          },
        ],
        code: {
          language: "text",
          value:
            '// 1. <keyboard>-layouts.dtsi: Studio 用の physical layout\n#include <physical_layouts.dtsi>\n\n/ {\n  my_layout: my_layout {\n    compatible = \\"zmk,physical-layout\\";\n    display-name = \\"Default\\";\n    transform = <&default_transform>;\n    keys = <&key_physical_attrs 100 100 0 0 0 0 0>;\n  };\n};\n\n# 2. build.yaml: Studio RPC を有効化\ninclude:\n  - board: nice_nano//zmk\n    shield: my_keyboard_left\n    snippet: studio-rpc-usb-uart\n    cmake-args: -DCONFIG_ZMK_STUDIO=y\n\n// 3. <keyboard>.keymap: Studio で編集するときだけ解除\n&studio_unlock',
        },
      },
    ],
    related: [
      "/developer-guide/modules/keymap",
      "/developer-guide/modules/settings",
      "/developer-guide/troubleshooting",
    ],
    next: "/developer-guide/level-2",
  },
  "/developer-guide/level-2": {
    route: "/developer-guide/level-2",
    title: "レベル 2: Custom Studio Protocol 対応モジュールを組み合わせる",
    summary:
      "Custom Studio Protocol 対応の ZMK と必要なモジュールだけを組み合わせさまざまな機能を有効にします。",
    level: 2,
    sections: [
      {
        title: "Custom Studio Protocol 対応の ZMK fork に切り替える",
        body: [
          "ZMK のバージョンを Custom Studio Protocol に対応した cormoran/zmk#main+dya に変更します。",
          "変更すると、内部的に次のプログラムとインターフェースが追加されます。",
        ],
        bullets: [
          "Custom Studio Protocol に対応した ZMK モジュールへの対応",
          "&studio_unlock 実行時に DYA Studio と BLE 接続できるようになる機能",
          "分割キーボードの左右で柔軟にデータをやり取りできる機能",
          "IO ピン 1 本で左右有線通信をできる機能（回路側のサポートが必要）",
          "以下で紹介する ZMK モジュールで必要な機能を提供するためのインターフェース追加",
        ],
        links: [
          {
            label: "cormoran/zmk#main+dya",
            href: "https://github.com/cormoran/zmk/tree/main+dya",
          },
          {
            label: "cormoran/zephyr#v4.1.0+zmk-fixes+nrf-half-duplex-uart",
            href: "https://github.com/cormoran/zephyr/tree/v4.1.0+zmk-fixes+nrf-half-duplex-uart",
          },
        ],
        code: {
          language: "yaml",
          value:
            "# config/west.yml\nmanifest:\n  remotes:\n    - name: cormoran\n      url-base: https://github.com/cormoran\n  projects:\n    - name: zmk\n      remote: cormoran\n      revision: main+dya\n      import:\n        file: app/west.yml\n    - name: zephyr\n      remote: cormoran\n      revision: v4.1.0+zmk-fixes+nrf-half-duplex-uart\n      clone-depth: 1\n      import:\n        name-blocklist:\n          - ci-tools\n          - hal_altera\n          - hal_cypress\n          - hal_infineon\n          - hal_microchip\n          - hal_nxp\n          - hal_openisa\n          - hal_xtensa\n          - hal_st\n          - hal_ti\n          - loramac-node\n          - mcuboot\n          - mcumgr\n          - net-tools\n          - openthread\n          - edtt\n          - trusted-firmware-m",
        },
      },
      {
        title: "スタックとバッファの推奨設定",
        body: [
          "複数の Custom Studio Protocol モジュールを有効にするとスタック不足でクラッシュすることがあります。まずは次の値でビルドし、メモリに余裕がない場合だけ実機で確認しながら小さくします。",
        ],
        code: {
          language: "conf",
          value:
            "# <keyboard>.conf — Custom Studio Protocol を複数使う場合の推奨値\nCONFIG_ZMK_SPLIT_RELAY_EVENT=y\nCONFIG_ZMK_SETTINGS_SAVE_DEBOUNCE=10000\nCONFIG_ZMK_SPLIT_BLE_CENTRAL_SPLIT_RUN_STACK_SIZE=768\nCONFIG_ZMK_LOW_PRIORITY_THREAD_STACK_SIZE=4096\nCONFIG_ZMK_STUDIO_RPC_RX_BUF_SIZE=256\nCONFIG_ZMK_STUDIO_RPC_TX_BUF_SIZE=256\nCONFIG_ZMK_STUDIO_RPC_CUSTOM_SUBSYSTEM_REQUEST_PAYLOAD_MAX_BYTES=256\nCONFIG_ZMK_SPLIT_RELAY_EVENT_DATA_LEN=240\nCONFIG_SYSTEM_WORKQUEUE_STACK_SIZE=4096\nCONFIG_ZMK_STUDIO_RPC_THREAD_STACK_SIZE=6000\nCONFIG_ZMK_CUSTOM_SETTINGS_LARGE_VALUE_MAX_SIZE=256",
        },
      },
      {
        title: "コアモジュールを導入する",
        body: [
          "さまざまなモジュールが依存する設定モジュールと、キーマップ読み込みを高速化/高機能化するモジュールを追加します。",
        ],
        links: [
          {
            label: "zmk-feature-custom-settings",
            href: "https://github.com/cormoran/zmk-feature-custom-settings",
          },
          {
            label: "zmk-feature-fast-keymap",
            href: "https://github.com/cormoran/zmk-feature-fast-keymap",
          },
        ],
        code: {
          language: "text",
          value:
            "# config/west.yml (manifest.projects)\n- name: zmk-feature-custom-settings\n  remote: cormoran\n  revision: main\n- name: zmk-feature-fast-keymap\n  remote: cormoran\n  revision: main\n\n# <keyboard>.conf\nCONFIG_ZMK_CUSTOM_SETTINGS=y\nCONFIG_ZMK_CUSTOM_SETTINGS_SPLIT_RPC_RELAY=y\nCONFIG_ZMK_CUSTOM_SETTINGS_STUDIO_RPC=y\nCONFIG_ZMK_FAST_KEYMAP=y\nCONFIG_ZMK_FAST_KEYMAP_STUDIO_RPC=y\nCONFIG_ZMK_FAST_KEYMAP_DEFAULT_LAYER=y",
        },
      },
      {
        title: "機能モジュールを導入する",
        body: [
          "以下の一覧から必要な機能を追加してください。各モジュールの .conf / .dtsi の確認点は詳細ページにあります。",
        ],
        linkGroups: [
          {
            title: "Keymap / Macro / Combo タブのモジュール",
            href: "/developer-guide/modules/keymap",
            links: [
              {
                label: "zmk-feature-runtime-macro",
                href: "https://github.com/cormoran/zmk-feature-runtime-macro",
              },
              {
                label: "zmk-feature-runtime-combo",
                href: "https://github.com/cormoran/zmk-feature-runtime-combo",
              },
              {
                label: "zmk-feature-input-stream",
                href: "https://github.com/cormoran/zmk-feature-input-stream",
              },
            ],
          },
          {
            title: "Trackball タブのモジュール",
            href: "/developer-guide/modules/trackball",
            links: [
              {
                label: "zmk-driver-pmw3610-with-custom-studio-rpc",
                href: "https://github.com/cormoran/zmk-driver-pmw3610-with-custom-studio-rpc",
              },
              {
                label: "zmk-module-runtime-input-processor",
                href: "https://github.com/cormoran/zmk-module-runtime-input-processor",
              },
            ],
          },
          {
            title: "Connection タブのモジュール",
            href: "/developer-guide/modules/connection",
            links: [
              {
                label: "zmk-module-ble-management",
                href: "https://github.com/cormoran/zmk-module-ble-management",
              },
              {
                label: "zmk-feature-default-layer",
                href: "https://github.com/cormoran/zmk-feature-default-layer",
              },
              {
                label: "zmk-feature-os-detection",
                href: "https://github.com/cormoran/zmk-feature-os-detection",
              },
            ],
          },
          {
            title: "Settings タブのモジュール",
            href: "/developer-guide/modules/settings",
            links: [
              {
                label: "zmk-module-settings-rpc",
                href: "https://github.com/cormoran/zmk-module-settings-rpc",
              },
              {
                label: "zmk-feature-module-physical-layout",
                href: "https://github.com/cormoran/zmk-feature-module-physical-layout",
              },
              {
                label: "zmk-feature-custom-settings",
                href: "https://github.com/cormoran/zmk-feature-custom-settings",
              },
            ],
          },
          {
            title: "診断と開発補助タブのモジュール",
            href: "/developer-guide/modules/diagnostics",
            links: [
              {
                label: "zmk-feature-device-info",
                href: "https://github.com/cormoran/zmk-feature-device-info",
              },
              {
                label: "zmk-feature-watchdog",
                href: "https://github.com/cormoran/zmk-feature-watchdog",
              },
              {
                label: "zmk-module-devtool",
                href: "https://github.com/cormoran/zmk-module-devtool",
              },
              {
                label: "zmk-feature-kscan-diagnostics",
                href: "https://github.com/cormoran/zmk-feature-kscan-diagnostics",
              },
            ],
          },
        ],
      },
      {
        title: "参考実装",
        body: ["DYA シリーズの設定ファイルを参考にしてください"],
        links: [
          {
            label: "DYA2 の west-dependency.yml",
            href: allInOneManifest,
          },
        ],
      },
    ],
    related: [
      "/developer-guide/modules/keymap",
      "/developer-guide/modules/trackball",
      "/developer-guide/modules/connection",
      "/developer-guide/modules/settings",
      "/developer-guide/modules/diagnostics",
    ],
    next: "/developer-guide/modules/keymap",
  },
  "/developer-guide/modules/keymap": {
    route: "/developer-guide/modules/keymap",
    title: "キーマップ、Macro、Combo",
    summary:
      "キー割り当てをファームウェア再書き込みなしで変更できるようにします。",
    level: 2,
    screenshots: [
      screenshot(
        "keymap.png",
        "ライトモードの Keymap エディタ",
        "キーとレイヤーの編集",
      ),
      screenshot(
        "macro.png",
        "ライトモードの Macro エディタ",
        "キー列を実行中に作成・変更",
      ),
      screenshot(
        "combo.png",
        "ライトモードの Combo エディタ",
        "同時押しとタイムアウトを調整",
      ),
    ],
    sections: [
      {
        title: "できること",
        body: [],
        bullets: [
          "ZMK Studio — キー割り当てを編集",
          "Physical layout — プレビューに拡張モジュールを表示",
          "Runtime Macro — 連続するキー入力を設定",
          "Runtime Combo — 同時押しでのキー入力を設定",
          "Input stream — 押下キーをリアルタイム表示",
        ],
      },
      {
        title: "west.yml に追加する依存",
        body: ["必要な機能だけを manifest.projects に追加します。"],
        code: {
          language: "yaml",
          value:
            "manifest:\n  remotes:\n    - name: cormoran\n      url-base: https://github.com/cormoran\n  projects:\n    - name: zmk-feature-runtime-macro\n      remote: cormoran\n      revision: main\n    - name: zmk-feature-runtime-combo\n      remote: cormoran\n      revision: main\n    - name: zmk-feature-input-stream # 押下キー表示が必要な場合だけ\n      remote: cormoran\n      revision: main\n    - name: zmk-feature-module-physical-layout # プレビューに拡張モジュールを表示する場合だけ\n      remote: cormoran\n      revision: main",
        },
      },
      {
        title: "設定の確認点",
        body: ["必要な機能だけを有効にします。"],
        code: {
          language: "conf",
          value:
            "# <keyboard>.conf\nCONFIG_ZMK_STUDIO=y\nCONFIG_ZMK_RUNTIME_MACRO=y\nCONFIG_ZMK_RUNTIME_MACRO_STUDIO_RPC=y\nCONFIG_ZMK_RUNTIME_COMBO=y\nCONFIG_ZMK_RUNTIME_COMBO_STUDIO_RPC=y\n# 押下キー表示も必要な場合だけ\nCONFIG_ZMK_INPUT_STREAM_FEATURE=y\nCONFIG_ZMK_INPUT_STREAM_FEATURE_STUDIO_RPC=y\n# プレビューにトラックボールやロータリーエンコーダー、トラックパッドを表示する場合\nCONFIG_ZMK_PHYSICAL_LAYOUTS_FEATURE=y\nCONFIG_ZMK_PHYSICAL_LAYOUTS_FEATURE_STUDIO_RPC=y",
        },
      },
      {
        title: "プレビューにトラックボールなどを表示する",
        body: [
          "表示したいモジュールだけを <keyboard>.dtsi に定義します。座標と大きさは、キーの physical layout と同じ単位です。",
        ],
        links: [
          {
            label: "zmk-feature-module-physical-layout README",
            href: "https://github.com/cormoran/zmk-feature-module-physical-layout#readme",
          },
        ],
        code: {
          language: "text",
          value:
            '/ {\n  // 必要な node だけを追加する\n  trackball0: trackball0 {\n    compatible = "cormoran,physical-layout-trackball";\n    display-name = "Trackball";\n    size = <120>;\n    x = <425>;\n    y = <125>;\n  };\n\n  rotary_encoders0: rotary_encoders0 {\n    compatible = "cormoran,physical-layout-rotary-encoders";\n    encoders = <&encoder0>;\n  };\n  encoder0: encoder0 {\n    compatible = "cormoran,physical-layout-rotary-encoder";\n    size = <120>;\n    x = <600>;\n    y = <80>;\n  };\n\n  touchpad0: touchpad0 {\n    compatible = "cormoran,physical-layout-touch-pad";\n    display-name = "Touch Pad";\n    width = <240>;\n    height = <180>;\n    x = <625>;\n    y = <180>;\n  };\n};',
        },
      },
      {
        title: "検証",
        body: [
          "DYA Studio の Keymap タブを開き、Keymap / Macro / Combo の編集 UI が表示されることを確認します。「未対応です」と表示される場合は、必要な module または *_STUDIO_RPC が有効になっていません。",
        ],
      },
    ],
    related: [
      "/developer-guide/level-1",
      "/developer-guide/modules/settings",
      "/developer-guide/troubleshooting",
    ],
    next: "/developer-guide/modules/trackball",
  },
  "/developer-guide/modules/trackball": {
    route: "/developer-guide/modules/trackball",
    title: "トラックボール",
    summary:
      "トラックボールの設定を Web から編集できるようにします。センサーが PMW3610 の場合は、センサーの詳細な設定も変更できます。",
    level: 2,
    screenshots: [
      screenshot(
        "trackball.png",
        "ライトモードの Trackball 調整画面",
        "Runtime input processor と PMW3610 ドライバーを有効にした状態",
      ),
    ],
    sections: [
      {
        title: "できること",
        body: [],
        bullets: [
          "Runtime input processor — ポインター / スクロール、感度、有効レイヤー",
          "PMW3610 driver — CPI、回転、省電力設定など",
        ],
      },
      {
        title: "west.yml に追加する依存",
        body: [],
        code: {
          language: "yaml",
          value:
            "manifest:\n  projects:\n    - name: zmk-driver-pmw3610-with-custom-studio-rpc\n      url: https://github.com/cormoran/zmk-driver-pmw3610-with-custom-studio-rpc\n      revision: main\n    - name: zmk-module-runtime-input-processor\n      url: https://github.com/cormoran/zmk-module-runtime-input-processor\n      revision: main",
        },
      },
      {
        title: "設定の確認点",
        body: [
          "SPI と input listener を定義し、PMW3610 と Studio RPC を有効にします。",
        ],
        links: [
          {
            label: "DYA2 の right-trackball.conf",
            href: "https://github.com/cormoran/zmk-keyboard-dya2/blob/eca79a3a9adfb0b9015508db1fa4572f6680152f/snippets/right-trackball/right-trackball.conf",
          },
        ],
        code: {
          language: "conf",
          value:
            "# <keyboard>.conf\nCONFIG_ZMK_POINTING=y\nCONFIG_PMW3610=y\nCONFIG_ZMK_PMW3610_STUDIO_RPC=y\nCONFIG_ZMK_PMW3610_CUSTOM_SETTINGS=y\nCONFIG_ZMK_RUNTIME_INPUT_PROCESSOR=y\nCONFIG_ZMK_RUNTIME_INPUT_PROCESSOR_STUDIO_RPC=y",
        },
      },
      {
        title: "PMW3610 センサーを Devicetree に追加する",
        body: [
          "SPI のチップセレクトと割り込みピンは、使うボードに合わせて指定します。",
        ],
        links: [
          {
            label: "PMW3610 driver README",
            href: "https://github.com/cormoran/zmk-driver-pmw3610-with-custom-studio-rpc#module-user-guide",
          },
        ],
        code: {
          language: "text",
          value:
            '#include <zephyr/dt-bindings/input/input-event-codes.h>\n\n&spi0 {\n  status = "okay";\n  cs-gpios = <&gpio0 10 GPIO_ACTIVE_LOW>; // ボードに合わせる\n\n  trackball: trackball@0 {\n    compatible = "cormoran,pmw3610";\n    reg = <0>;\n    spi-max-frequency = <2000000>;\n    irq-gpios = <&gpio0 9 (GPIO_ACTIVE_LOW | GPIO_PULL_UP)>;\n    evt-type = <INPUT_EV_REL>;\n    x-input-code = <INPUT_REL_X>;\n    y-input-code = <INPUT_REL_Y>;\n  };\n};\n\n/ {\n  trackball_listener {\n    compatible = "zmk,input-listener";\n    device = <&trackball>;\n  };\n};',
        },
      },
      {
        title: "検証",
        body: [
          "DYA Studio の Trackball タブを開き、CPI や processor の調整 UI が表示されることを確認します。「未対応です」と表示される場合は、driver または input processor RPC が有効になっていません。",
        ],
      },
    ],
    related: [
      "/developer-guide/modules/settings",
      "/developer-guide/reference/keyboard-config",
      "/developer-guide/troubleshooting",
    ],
    next: "/developer-guide/modules/connection",
  },
  "/developer-guide/modules/connection": {
    route: "/developer-guide/modules/connection",
    title: "接続先と OS に合わせる",
    summary:
      "BLE profile、接続先別レイヤー、OS 別デフォルトレイヤーを管理します。",
    level: 2,
    screenshots: [
      screenshot(
        "connection.png",
        "ライトモードの Connection 画面",
        "BLE、接続先レイヤー、OS 検出を管理",
      ),
    ],
    sections: [
      {
        title: "できること",
        body: [],
        bullets: [
          "BLE Management — profile 管理",
          "Default Layer — USB / profile 別レイヤー",
          "OS Detection — OS の自動検出と OS ごとの自動レイヤー切り替え",
        ],
      },
      {
        title: "west.yml に追加する依存",
        body: [],
        code: {
          language: "yaml",
          value:
            "manifest:\n  projects:\n    - name: zmk-module-ble-management\n      url: https://github.com/cormoran/zmk-module-ble-management\n      revision: main\n    - name: zmk-feature-default-layer\n      url: https://github.com/cormoran/zmk-feature-default-layer\n      revision: codex/custom-rpc-rewrite\n    - name: zmk-feature-os-detection\n      url: https://github.com/cormoran/zmk-feature-os-detection\n      revision: main",
        },
      },
      {
        title: "設定の確認点",
        body: ["必要な機能だけを有効にします。"],
        code: {
          language: "conf",
          value:
            "# <keyboard>.conf\nCONFIG_ZMK_BLE_MANAGEMENT=y\nCONFIG_ZMK_BLE_MANAGEMENT_STUDIO_RPC=y\n\nCONFIG_ZMK_DEFAULT_LAYER=y\nCONFIG_ZMK_DEFAULT_LAYER_MIN_INDEX=0\nCONFIG_ZMK_DEFAULT_LAYER_MAX_INDEX=4\nCONFIG_ZMK_DEFAULT_LAYER_STUDIO_RPC=y\nCONFIG_ZMK_DEFAULT_LAYER_OS_DETECTION=y\n\nCONFIG_ZMK_OS_DETECTION=y\nCONFIG_ZMK_OS_DETECTION_USB=y\nCONFIG_ZMK_OS_DETECTION_BLE=y\nCONFIG_ZMK_OS_DETECTION_STUDIO_RPC=y",
        },
      },
      {
        title: "検証",
        body: [
          "DYA Studio の Connection タブを開き、BLE profile、接続先レイヤー、OS 検出の UI が表示されることを確認します。「未対応です」と表示される場合は、対応する module または *_STUDIO_RPC が有効になっていません。",
        ],
      },
    ],
    related: [
      "/developer-guide/modules/keymap",
      "/developer-guide/modules/settings",
      "/developer-guide/troubleshooting",
    ],
    next: "/developer-guide/modules/settings",
  },
  "/developer-guide/modules/settings": {
    route: "/developer-guide/modules/settings",
    title: "設定",
    summary: "全体的な設定や、より詳細で高度な設定を変更できるようにします。",
    level: 2,
    screenshots: [
      screenshot(
        "settings.png",
        "ライトモードの Settings 画面",
        "sleep と custom setting の設定",
      ),
    ],
    sections: [
      {
        title: "できること",
        body: [],
        bullets: ["スリープまでの時間を設定する", "より高度な設定を変更する"],
      },
      {
        title: "west.yml に追加する依存",
        body: [],
        code: {
          language: "yaml",
          value:
            "manifest:\n  projects:\n    - name: zmk-module-settings-rpc\n      url: https://github.com/cormoran/zmk-module-settings-rpc\n      revision: main\n    - name: zmk-feature-custom-settings\n      url: https://github.com/cormoran/zmk-feature-custom-settings\n      revision: main",
        },
      },
      {
        title: "設定の確認点",
        body: [
          "公開する値だけを RPC に載せ、範囲と初期値は firmware 側でも検証します。",
        ],
        code: {
          language: "conf",
          value:
            "# <keyboard>.conf\n# スリープまでの時間を設定する\nCONFIG_ZMK_SETTINGS_RPC=y\nCONFIG_ZMK_SETTINGS_RPC_STUDIO=y\n\n# より高度な設定を変更する\nCONFIG_ZMK_CUSTOM_SETTINGS=y\nCONFIG_ZMK_CUSTOM_SETTINGS_SPLIT_RPC_RELAY=y\nCONFIG_ZMK_CUSTOM_SETTINGS_STUDIO_RPC=y",
        },
      },
      {
        title: "検証",
        body: [
          "DYA Studio の Settings タブを開き、公開した sleep / custom setting の UI が表示されることを確認します。「未対応です」と表示される場合は、対応する module または *_STUDIO_RPC が有効になっていません。",
        ],
      },
      {
        title: "分割キーボード",
        body: [
          "設定が中央側・非中央側のどちらへ適用されるかを UI と仕様で明示します。",
        ],
      },
    ],
    related: [
      "/developer-guide/level-1",
      "/developer-guide/modules/trackball",
      "/developer-guide/reference/keyboard-config",
    ],
    next: "/developer-guide/modules/diagnostics",
  },
  "/developer-guide/modules/diagnostics": {
    route: "/developer-guide/modules/diagnostics",
    title: "診断と開発補助",
    summary:
      "ユーザー向けには不具合発生時の原因調査を助ける情報を、開発者向けには開発中に使える便利な機能を提供します。",
    level: 2,
    screenshots: [
      screenshot(
        "troubleshooting.png",
        "ライトモードの Troubleshooting 画面",
        "device info と診断情報を表示",
      ),
    ],
    sections: [
      {
        title: "できること",
        body: [],
        bullets: [
          "Device Info — firmware build、battery、uptime を確認する",
          "Watchdog — 再起動原因と状態を確認する",
          "KSCAN Diagnostics — キー行列を確認する",
          "Devtool / Zephyr Setting Expose — 開発中の内部情報を扱う",
        ],
      },
      {
        title: "west.yml に追加する依存",
        body: [],
        code: {
          language: "yaml",
          value:
            "manifest:\n  projects:\n    - name: zmk-feature-device-info\n      url: https://github.com/cormoran/zmk-feature-device-info\n      revision: main\n    - name: zmk-feature-watchdog\n      url: https://github.com/cormoran/zmk-feature-watchdog\n      revision: main\n    - name: zmk-module-devtool\n      url: https://github.com/cormoran/zmk-module-devtool\n      revision: main\n    - name: zmk-feature-zephyr-setting-expose\n      url: https://github.com/cormoran/zmk-feature-zephyr-setting-expose\n      revision: main\n    - name: zmk-feature-kscan-diagnostics\n      url: https://github.com/cormoran/zmk-feature-kscan-diagnostics\n      revision: main",
        },
      },
      {
        title: "設定の確認点",
        body: [
          "製品版で公開する情報を最小化し、必要な診断だけを有効にします。",
        ],
        code: {
          language: "conf",
          value:
            "# <keyboard>.conf\nCONFIG_ZMK_DEVICE_INFO=y\nCONFIG_ZMK_DEVICE_INFO_STUDIO_RPC=y\nCONFIG_ZMK_WATCHDOG=y\nCONFIG_ZMK_WATCHDOG_STUDIO_RPC=y",
        },
      },
      {
        title: "Device Info",
        body: [
          "不具合報告に必要な、ファームウェアと実機の基本情報を確認できます。",
        ],
        table: {
          headers: ["情報", "確認できる内容"],
          rows: [
            ["Firmware", "ZMK / config / module / Zephyr のバージョン"],
            ["Build", "firmware の commit とビルド時刻"],
            ["Hardware", "board、shield、battery"],
            ["Runtime", "uptime と接続状態"],
          ],
        },
      },
      {
        title: "Watchdog",
        body: [
          "予期しない再起動や、起動直後に繰り返しリセットされるときに確認します。再起動原因と直前の状態を手がかりに、電源・firmware・周辺機器の問題を切り分けます。書き込み用 firmware をアップロードすると、さらに詳しく原因を調べることもできます。",
        ],
      },
      {
        title: "KSCAN Diagnostics",
        body: [
          "キーを押して行・列・position が期待どおりに検出されるかを確認します。キーが反応しない、別のキーとして入力される、といった配線や matrix 定義の確認に役立ちます。",
        ],
      },
      {
        title: "Devtool",
        body: [
          "開発中に使うポップアップです。ログを表示・コピー・保存でき、Studio の lock 状態を確認して unlock / lock を切り替えられます。",
        ],
        links: [
          {
            label: "zmk-module-devtool",
            href: "https://github.com/cormoran/zmk-module-devtool",
          },
        ],
        image: screenshot(
          "devtool.png",
          "ライトモードの Devtool ポップアップ",
          "ログ表示と Studio の lock 操作",
        ),
      },
      {
        title: "検証",
        body: [
          "DYA Studio の Troubleshooting タブを開き、Device Info や Watchdog の UI が表示されることを確認します。「未対応です」と表示される場合は、対応する diagnostic module または *_STUDIO_RPC が有効になっていません。",
        ],
      },
    ],
    related: [
      "/developer-guide/troubleshooting",
      "/developer-guide/reference/keyboard-config",
      "/developer-guide/level-3",
    ],
    next: "/developer-guide/level-3",
  },
  "/developer-guide/level-3": {
    route: "/developer-guide/level-3",
    title: "レベル 3: 独自 Custom Studio Protocol モジュールを作る",
    summary:
      "既存モジュールにないハードウェアや設定用の firmware RPC と Studio 画面を作ります。",
    level: 3,
    sections: [
      {
        title: "対象",
        body: [
          "独自のセンサー設定を Web から編集したり、DYA Studio よりも使いやすい設定画面を作ったり、より多くの機能を設定できるようにしたいキーボード開発者向けです。",
        ],
      },
      {
        title: "テンプレート",
        body: [
          "このテンプレートには Custom Studio Protocol handler、protobuf、React UI、firmware / build / Web UI test が含まれます。",
        ],
        links: [
          {
            label: "zmk-module-template-with-custom-studio-rpc",
            href: "https://github.com/cormoran/zmk-module-template-with-custom-studio-rpc",
          },
        ],
      },
      {
        title: "作成の流れ",
        body: [],
        ordered: true,
        bullets: [
          "テンプレートからレポジトリを作る。",
          "protobuf と firmware handler を実装する。",
          "React + TypeScript の設定画面を実装する。",
          "firmware / build / Web UI のテストを追加する。",
        ],
      },
      {
        title: "AI と進める",
        body: [
          "対象のレポジトリで AI を開き、やりたいことを伝えてください。Web UI から firmware、テストまでまとめて実装を進められます。",
        ],
      },
      {
        title: "互換性と安全性",
        body: [],
        bullets: [
          "Custom Studio Protocol の subsystem ID は、他のモジュールと重複しない固有の値にする。",
          "個人情報やキーボードの動作を悪用できる設定は、Studio を unlock した状態でだけ読み書きできるようにする。",
          "キー入力を変更・直接取得するモジュールはキーロガーとして悪用されるおそれがあります。実装には特に注意し、必要がなければ実装しない。",
        ],
      },
    ],
    prerequisites: [
      "レベル 2 の Custom Studio Protocol 構成",
      "firmware と React UI の実装・テスト",
    ],
    related: [
      "/developer-guide/reference/keyboard-config",
      "/developer-guide/troubleshooting",
      "/developer-guide/modules/diagnostics",
    ],
    next: "/developer-guide/reference/keyboard-config",
  },
  "/developer-guide/reference/keyboard-config": {
    route: "/developer-guide/reference/keyboard-config",
    title: "リファレンス: DYA2 のコードを読む",
    summary: "DYA2 の設定ファイルについて簡単に解説したページです。",
    sections: [
      {
        title: "west-dependency.yml",
        body: [
          "DYA2 で使っている ZMK / Zephyr の revision と、機能ごとのモジュール一覧です。必要な依存だけを自分の west.yml に追加します。",
        ],
        links: [
          {
            label: "全部入りの west-dependency.yml",
            href: allInOneManifest,
          },
        ],
      },
      {
        title: "dya2_right.conf",
        body: [
          "Studio、接続、sleep、各 *_STUDIO_RPC、buffer / stack などの Kconfig 設定をまとめています。",
        ],
        links: [{ label: "右側の dya2_right.conf", href: dya2Config }],
      },
      {
        title: "dya2.dtsi",
        body: [
          "physical layout、matrix / touch、trackball listener / processor、wired split、LED、battery などの Devicetree 定義です。",
        ],
        links: [{ label: "共通の dya2.dtsi", href: dya2Dtsi }],
      },
    ],
    related: [
      "/developer-guide/level-2",
      "/developer-guide/modules/trackball",
      "/developer-guide/modules/settings",
      "/developer-guide/modules/diagnostics",
    ],
    next: "/developer-guide/troubleshooting",
  },
  "/developer-guide/troubleshooting": {
    route: "/developer-guide/troubleshooting",
    title: "トラブルシューティング",
    summary: "接続、画面表示、保存、メモリ、入力位置を症状から切り分けます。",
    screenshots: [
      screenshot(
        "troubleshooting.png",
        "ライトモードの Troubleshooting 画面",
        "サポートに必要な device info と診断",
      ),
    ],
    sections: [
      {
        title: "DYA Studio に接続できない",
        body: [
          "USB の Studio RPC snippet、中央側の build、CONFIG_ZMK_STUDIO を確認します。",
        ],
      },
      {
        title: "Keymap は出るが変更できない",
        body: ["&studio_unlock と Studio の lock 状態を確認します。"],
      },
      {
        title: "期待した画面が出ない",
        body: [
          "対応 module と *_STUDIO_RPC、DYA Studio が対応する subsystem を確認します。",
        ],
      },
      {
        title: "キーボードがリセットされたり、フリーズ後に復帰したりする",
        body: [
          "stack overflow または時間のかかる処理によって Watchdog timer が動作した可能性が高いです。thread stack と処理時間を確認してください。",
        ],
      },
      {
        title: "キーやトラックボールがおかしい",
        body: [
          "キー位置は .dtsi の physical layout、KSCAN topology、keymap position を確認します。トラックボールは SPI/pin、sensor node、rotation、input processor の有効 layer を確認します。",
        ],
      },
    ],
    related: [
      "/developer-guide/level-1",
      "/developer-guide/modules/trackball",
      "/developer-guide/modules/diagnostics",
      "/developer-guide/reference/keyboard-config",
    ],
  },
};

const dyaStudioSampleRepository =
  "https://github.com/cormoran/zmk-config-dya-studio-sample";

const dyaStudioSamplePullRequests: Partial<
  Record<DeveloperGuideRoute, string>
> = {
  "/developer-guide": "1",
  "/developer-guide/level-1": "2",
  "/developer-guide/level-2": "3",
  "/developer-guide/modules/keymap": "4",
  "/developer-guide/modules/trackball": "5",
  "/developer-guide/modules/connection": "6",
  "/developer-guide/modules/settings": "7",
  "/developer-guide/modules/diagnostics": "8",
  // The PMW3610 driver is itself a Custom Studio Protocol implementation.
  "/developer-guide/level-3": "5",
  "/developer-guide/reference/keyboard-config": "3",
  "/developer-guide/troubleshooting": "8",
};

for (const [route, pullRequest] of Object.entries(
  dyaStudioSamplePullRequests,
)) {
  developerGuidePages[route as DeveloperGuideRoute].sections.unshift({
    title: "参照実装",
    body: ["このページに対応する dya-studio-sample の PR です。"],
    links: [
      {
        label: "GitHub で PR を開く",
        href: `${dyaStudioSampleRepository}/pull/${pullRequest}`,
      },
    ],
  });
}

export const developerGuideRoutes = Object.keys(
  developerGuidePages,
) as DeveloperGuideRoute[];

export function getDeveloperGuidePage(
  route: string,
): DeveloperGuidePage | undefined {
  return developerGuidePages[route as DeveloperGuideRoute];
}

const guideLabels: Record<DeveloperGuideRoute, string> = {
  "/developer-guide": "はじめに",
  "/developer-guide/level-1": "レベル 1: ZMK Studio",
  "/developer-guide/level-2": "レベル 2: DYA 拡張",
  "/developer-guide/modules/keymap": "Keymap / Macro / Combo",
  "/developer-guide/modules/trackball": "トラックボール",
  "/developer-guide/modules/connection": "接続先と OS",
  "/developer-guide/modules/settings": "設定",
  "/developer-guide/modules/diagnostics": "診断と開発補助",
  "/developer-guide/level-3": "レベル 3: 独自 RPC",
  "/developer-guide/reference/keyboard-config": "DYA2 リファレンス",
  "/developer-guide/troubleshooting": "トラブルシューティング",
};

/** Navigation is static so it is available before a keyboard is connected. */
export const developerGuideNavigation: DeveloperGuideNavigationItem[] = [
  {
    id: "/developer-guide",
    label: guideLabels["/developer-guide"],
    href: "/developer-guide",
  },
  {
    id: "/developer-guide/level-1",
    label: guideLabels["/developer-guide/level-1"],
    href: "/developer-guide/level-1",
  },
  {
    id: "/developer-guide/level-2",
    label: guideLabels["/developer-guide/level-2"],
    href: "/developer-guide/level-2",
    items: [
      {
        id: "/developer-guide/modules/keymap",
        label: guideLabels["/developer-guide/modules/keymap"],
        href: "/developer-guide/modules/keymap",
      },
      {
        id: "/developer-guide/modules/trackball",
        label: guideLabels["/developer-guide/modules/trackball"],
        href: "/developer-guide/modules/trackball",
      },
      {
        id: "/developer-guide/modules/connection",
        label: guideLabels["/developer-guide/modules/connection"],
        href: "/developer-guide/modules/connection",
      },
      {
        id: "/developer-guide/modules/settings",
        label: guideLabels["/developer-guide/modules/settings"],
        href: "/developer-guide/modules/settings",
      },
      {
        id: "/developer-guide/modules/diagnostics",
        label: guideLabels["/developer-guide/modules/diagnostics"],
        href: "/developer-guide/modules/diagnostics",
      },
    ],
  },
  {
    id: "/developer-guide/level-3",
    label: guideLabels["/developer-guide/level-3"],
    href: "/developer-guide/level-3",
  },
  {
    id: "/developer-guide/reference/keyboard-config",
    label: guideLabels["/developer-guide/reference/keyboard-config"],
    href: "/developer-guide/reference/keyboard-config",
  },
  {
    id: "/developer-guide/troubleshooting",
    label: guideLabels["/developer-guide/troubleshooting"],
    href: "/developer-guide/troubleshooting",
  },
];

function renderSections(
  page: DeveloperGuidePage,
): RenderedDeveloperGuideSection[] {
  const sections: RenderedDeveloperGuideSection[] = [];

  for (const [index, section] of page.sections.entries()) {
    sections.push({
      type: "heading",
      id: `section-${index + 1}`,
      title: section.title,
      number: index + 1,
    });
    sections.push(
      ...section.body.map((content) => ({
        type: "paragraph" as const,
        content,
      })),
    );
    if (section.bullets) {
      sections.push({
        type: "list",
        items: section.bullets,
        ordered: section.ordered,
      });
    }
    if (section.links) {
      sections.push({
        type: "list",
        items: section.links.map((link) =>
          createElement(
            "a",
            {
              href: link.href,
              className: "text-[var(--color-electric)] hover:underline",
              target: link.href.startsWith("http") ? "_blank" : undefined,
              rel: link.href.startsWith("http") ? "noreferrer" : undefined,
            },
            link.label,
          ),
        ),
      });
    }
    if (section.linkGroups) {
      sections.push({
        type: "list",
        items: section.linkGroups.map((group) =>
          createElement(
            "div",
            null,
            createElement(
              group.href ? "a" : "p",
              {
                href: group.href,
                className: group.href
                  ? "font-medium text-[var(--color-electric)] hover:underline"
                  : "font-medium text-[var(--color-text)]",
              },
              group.title,
            ),
            createElement(
              "ul",
              { className: "mt-1 list-disc space-y-1 pl-5" },
              group.links.map((link) =>
                createElement(
                  "li",
                  { key: link.href },
                  createElement(
                    "a",
                    {
                      href: link.href,
                      className: "text-[var(--color-electric)] hover:underline",
                      target: link.href.startsWith("http")
                        ? "_blank"
                        : undefined,
                      rel: link.href.startsWith("http")
                        ? "noreferrer"
                        : undefined,
                    },
                    link.label,
                  ),
                ),
              ),
            ),
          ),
        ),
      });
    }
    if (section.table) {
      sections.push({ type: "table", table: section.table });
    }
    if (section.code) {
      sections.push({
        type: "code",
        code:
          section.code.language === "yaml" &&
          section.code.value.includes("url: https://github.com/cormoran/")
            ? section.code.value
                .replace(
                  "manifest:\n  projects:",
                  "manifest:\n  remotes:\n    - name: cormoran\n      url-base: https://github.com/cormoran\n  projects:",
                )
                .replaceAll(
                  /url: https:\/\/github\.com\/cormoran\/[\w-]+/g,
                  "remote: cormoran",
                )
            : section.code.value,
        language: section.code.language,
      });
    }
    if (section.image) {
      sections.push({
        type: "image",
        src: section.image.src,
        alt: section.image.alt,
        caption: section.image.caption,
        placeholderLabel: "ライトモードのスクリーンショットを準備中",
      });
    }
  }

  for (const image of page.screenshots ?? []) {
    sections.push({
      type: "image",
      src: image.src,
      alt: image.alt,
      caption: image.caption,
      placeholderLabel: "ライトモードのスクリーンショットを準備中",
    });
  }

  return sections;
}

/**
 * UI-ready page data. This is intentionally derived from the content above so
 * a route renderer can consume it without connecting to a keyboard.
 */
const englishText: Record<string, string> = {
  "あなたの ZMK キーボードを DYA Studio に対応させる":
    "Make your ZMK keyboard work with DYA Studio",
  "キーマップ編集から始め、必要に応じて既存モジュールや独自 RPC を段階的に追加します。":
    "Start with keymap editing, then add existing modules or your own RPC as needed.",
  "ZMK 公式の機能から始め、必要に応じて既存モジュールや独自 RPC を段階的に追加します。":
    "Start with official ZMK features, then add existing modules or your own RPC as needed.",
  "3 つの対応レベル": "Three levels of support",
  "初めからすべてに対応する必要はありません。まずは ZMK 公式の機能だけから始め、必要になったときに機能を追加できます。":
    "You do not need to support everything from the start. Begin with official ZMK features, then add capabilities when you need them.",
  "レベル 1 — 公式 ZMK Studio: Keymap を編集できるようにする":
    "Level 1 — Official ZMK Studio: edit the keymap",
  "レベル 2 — DYA 拡張: Macro / Combo、Trackball、Connection、Settings、診断を追加する":
    "Level 2 — DYA extensions: add macros, combos, trackball, connections, settings, and diagnostics",
  "レベル 3 — 独自 RPC: 独自ハードウェアや設定の画面を作る":
    "Level 3 — Custom RPC: build screens for your own hardware and settings",
  "レベル 3 — 独自モジュール: Web からの編集に対応した ZMK モジュールや設定の画面を作る":
    "Level 3 — Custom modules: build ZMK modules and settings screens that can be edited from the web",
  "レベル 1: 公式 ZMK Studio に対応する":
    "Level 1: Add official ZMK Studio support",
  "DYA Studio の Keymap 画面でキー割り当てを変更できる最小構成です。":
    "The smallest setup for changing key bindings in DYA Studio's Keymap screen.",
  "ライトモードの Keymap エディタ": "Keymap editor in light mode",
  "カスタムモジュールを無効にしたライトモードの Keymap エディタ":
    "Keymap editor in light mode with custom modules disabled",
  キーとレイヤーを再書き込みなしで編集:
    "Edit keys and layers without reflashing",
  "公式 ZMK Studio の Keymap 機能だけを有効にした状態":
    "Only the official ZMK Studio Keymap feature is enabled",
  できること: "What you can do",
  できないこと: "What you cannot do",
  キー割り当てを編集する: "Edit key bindings",
  レイヤー名や並びを編集する: "Edit layer names and order",
  レイアウトを変更する: "Change layouts",
  "マクロ、コンボ、トラックボール設定などの Web からの編集":
    "Edit macros, combos, trackball settings, and more from the web",
  "Linux 以外での BLE 接続による Web からの編集":
    "Edit from the web over BLE on operating systems other than Linux",
  その他いろいろ: "And more",
  レイヤー名を編集する: "Edit layer names",
  "予約済みレイヤーを Studio から使えるようにする":
    "Make reserved layers available in Studio",
  "公式 Studio RPC を使い、キー割り当て、レイヤー名、予約済みレイヤーを実行中に編集します。":
    "Use the official Studio RPC to edit key bindings, layer names, and reserved layers while the keyboard is running.",
  最短手順: "Quick start",
  "分割キーボードでは中央側だけに Studio RPC を入れます。":
    "For a split keyboard, add Studio RPC only to the half that communicates with the PC.",
  "分割キーボードでは、PC と通信する側だけに Studio RPC を入れます。":
    "For a split keyboard, add Studio RPC only to the half that communicates with the PC.",
  "ZMK 公式の方法で対応できます。分割キーボードでは、PC と通信する側だけに Studio RPC を入れます。":
    "You can add support using the official ZMK method. For a split keyboard, add Studio RPC only to the half that communicates with the PC.",
  "1. physical layout の keys と matrix transform を定義する":
    "1. Define the physical-layout keys and matrix transform",
  "2. studio-rpc-usb-uart snippet と CONFIG_ZMK_STUDIO を追加する":
    "2. Add the studio-rpc-usb-uart snippet and CONFIG_ZMK_STUDIO",
  "3. keymap に &studio_unlock と必要な reserved layer を追加する":
    "3. Add &studio_unlock and any required reserved layers to the keymap",
  注意: "Notes",
  "Studio に保存した後は .keymap の変更だけでは戻りません。ファームウェア側へ戻すときは Restore Stock Settings を実行します。RAM とビルドサイズも確認してください。":
    "After saving in Studio, editing only .keymap will not restore the original values. Use Restore Stock Settings when returning to firmware defaults, and check RAM and build size.",
  "レベル 2: Custom Studio Protocol 対応モジュールを組み合わせる":
    "Level 2: Combine Custom Studio Protocol modules",
  "Custom Studio Protocol 対応の ZMK と必要なモジュールだけを組み合わせさまざまな機能を有効にします。":
    "Combine a Custom Studio Protocol-enabled ZMK build with only the modules you need to enable a range of features.",
  土台を切り替える: "Use the DYA-compatible ZMK base",
  "Custom Studio Protocol 対応の ZMK fork に切り替える":
    "Switch to the Custom Studio Protocol-enabled ZMK fork",
  "ZMK は cormoran/zmk#main+dya、Zephyr は cormoran/zephyr#v4.1.0+zmk-fixes+nrf-half-duplex-uart を使います。revision は動作確認済みの組み合わせで pin してください。":
    "Use cormoran/zmk#main+dya with cormoran/zephyr#v4.1.0+zmk-fixes+nrf-half-duplex-uart. Pin revisions to a combination you have tested.",
  "ZMK と Zephyr は、動作確認済みの revision に固定して使います。":
    "Pin ZMK and Zephyr to revisions that you have tested together.",
  "ZMK のバージョンを Custom Studio Protocol に対応した cormoran/zmk#main+dya に変更します。":
    "Switch ZMK to cormoran/zmk#main+dya, which supports the Custom Studio Protocol.",
  "変更すると、内部的に次のプログラムとインターフェースが追加されます。":
    "This adds the following internal programs and interfaces.",
  "Custom Studio Protocol に対応した ZMK モジュールへの対応":
    "Support for ZMK modules that use the Custom Studio Protocol",
  "&studio_unlock 実行時に DYA Studio と BLE 接続できるようになる機能":
    "BLE connection to DYA Studio when &studio_unlock runs",
  分割キーボードの左右で柔軟にデータをやり取りできる機能:
    "Flexible data exchange between the two halves of a split keyboard",
  "IO ピン 1 本で左右有線通信をできる機能（回路側のサポートが必要）":
    "Wired inter-half communication over one IO pin (requires circuit support)",
  "以下で紹介する ZMK モジュールで必要な機能を提供するためのインターフェース追加":
    "Interfaces required by the ZMK modules introduced below",
  スタックとバッファの推奨設定: "Recommended stack and buffer settings",
  "複数の Custom Studio Protocol モジュールを有効にするとスタック不足でクラッシュすることがあります。まずは次の値でビルドし、メモリに余裕がない場合だけ実機で確認しながら小さくします。":
    "Enabling several Custom Studio Protocol modules can cause a stack overflow. Start with these values, then reduce them only after verifying memory usage on hardware.",
  コアモジュールを導入する: "Add the core modules",
  "さまざまなモジュールが依存する設定モジュールと、キーマップ読み込みを高速化するモジュールを追加します。":
    "Add the settings module required by several modules and the module that speeds up keymap loading.",
  "さまざまなモジュールが依存する設定モジュールと、キーマップ読み込みを高速化/高機能化するモジュールを追加します。":
    "Add the settings module required by several modules and a module that makes keymap loading faster and more capable.",
  参考実装: "Reference implementation",
  "DYA2 の全部入り manifest は、モジュールの組み合わせを確認するための参照実装です。必要な依存だけを選んで使ってください。":
    "The full DYA2 manifest is a reference implementation for checking module combinations. Select only the dependencies you need.",
  "DYA シリーズの設定ファイルを参考にしてください":
    "Refer to the DYA series configuration files.",
  "最短の出発点は DYA2 の全部入り manifest です: https://github.com/cormoran/zmk-keyboard-dya2/blob/eca79a3a9adfb0b9015508db1fa4572f6680152f/config/west-dependency.yml#L14-L64":
    "The DYA2 full manifest is the fastest starting point.",
  "DYA2 の全部入り west-dependency.yml": "DYA2 full west-dependency.yml",
  "DYA2 の west-dependency.yml": "DYA2 west-dependency.yml",
  機能からモジュールを選ぶ: "Choose modules by feature",
  機能モジュールを導入する: "Add feature modules",
  "導入後は必要なものだけを残します。各モジュールの .conf / .dtsi の確認点は詳細ページにあります。":
    "Keep only the modules you need. Each feature page explains the relevant .conf and .dtsi settings.",
  "以下の一覧から必要な機能を追加してください。各モジュールの .conf / .dtsi の確認点は詳細ページにあります。":
    "Add the features you need from the list below. Each feature page explains the relevant .conf and .dtsi settings.",
  詳細ページ: "Feature guide",
  診断と開発補助: "Diagnostics and development tools",
  "Keymap / Macro / Combo タブのモジュール":
    "Modules for the Keymap / Macro / Combo tabs",
  "Trackball タブのモジュール": "Modules for the Trackball tab",
  "Connection タブのモジュール": "Modules for the Connection tab",
  "Settings タブのモジュール": "Modules for the Settings tab",
  診断と開発補助タブのモジュール:
    "Modules for the Diagnostics and development tools tab",
  "キーマップ、Macro、Combo": "Keymap, Macro, and Combo",
  "キー割り当てと、キー入力から派生する動作をファームウェア再書き込みなしで調整します。":
    "Adjust key bindings and key-driven actions without reflashing firmware.",
  "キー割り当てをファームウェア再書き込みなしで変更できるようにします。":
    "Make key bindings editable without reflashing firmware.",
  キーとレイヤーの編集: "Edit keys and layers",
  "ライトモードの Macro エディタ": "Macro editor in light mode",
  "キー列を実行中に作成・変更": "Create and change key sequences while running",
  "ライトモードの Combo エディタ": "Combo editor in light mode",
  同時押しとタイムアウトを調整: "Adjust chorded keys and timeouts",
  "ZMK Studio — キー割り当てを編集": "ZMK Studio — edit key bindings",
  "Runtime Macro — キー列を編集": "Runtime Macro — edit key sequences",
  "Runtime Macro — 連続するキー入力を設定":
    "Runtime Macro — configure consecutive key inputs",
  "Runtime Combo — 同時押しを編集": "Runtime Combo — edit key chords",
  "Runtime Combo — 同時押しでのキー入力を設定":
    "Runtime Combo — configure key inputs triggered by chords",
  "Input stream — 押下キーをリアルタイム表示":
    "Input stream — show pressed keys in real time",
  "Physical layout — プレビューに拡張モジュールを表示":
    "Physical layout — show extension modules in the preview",
  "west.yml に追加する依存": "Add dependencies to west.yml",
  "必要な機能だけを manifest.projects に追加します。":
    "Add only the features you need to manifest.projects.",
  設定の確認点: "Configuration checklist",
  プレビューにトラックボールなどを表示する:
    "Show trackballs and other modules in the preview",
  "表示したいモジュールだけを <keyboard>.dtsi に定義します。座標と大きさは、キーの physical layout と同じ単位です。":
    "Define only the modules you want to show in <keyboard>.dtsi. Coordinates and sizes use the same units as the key physical layout.",
  検証: "Verify",
  "Macro と Combo を保存し、割り当てたキーで動作すること、再接続後にも値が復元されることを確認します。":
    "Save a macro and combo, verify that their assigned keys work, then reconnect and confirm the values are restored.",
  "DYA Studio の Keymap タブを開き、Keymap / Macro / Combo の編集 UI が表示されることを確認します。「未対応です」と表示される場合は、必要な module または *_STUDIO_RPC が有効になっていません。":
    "Open the Keymap tab and confirm that the Keymap, Macro, or Combo controls are shown. If Studio says the feature is unsupported, the required module or *_STUDIO_RPC is not enabled.",
  トラックボール: "Trackball",
  "PMW3610 の読み取りと、ポインター / スクロールへの変換を実機に合わせて調整します。":
    "Tune PMW3610 input and pointer or scroll conversion for your hardware.",
  "トラックボールの設定を Web から編集できるようにします。センサーが PMW3610 の場合は、センサーの詳細な設定も変更できます。":
    "Make trackball settings editable from the web. If the sensor is a PMW3610, you can also change its detailed settings.",
  "ライトモードの Trackball 調整画面": "Trackball controls in light mode",
  "CPI、回転、processor を調整": "Adjust CPI, rotation, and processors",
  "Runtime input processor と PMW3610 ドライバーを有効にした状態":
    "Runtime input processor and PMW3610 driver enabled",
  "PMW3610 driver — CPI、回転、電源":
    "PMW3610 driver — CPI, rotation, and power",
  "PMW3610 driver — CPI、回転、省電力設定など":
    "PMW3610 driver — CPI, rotation, and power-saving settings",
  "Runtime input processor — ポインター / スクロール、感度、有効レイヤー":
    "Runtime input processor — pointer or scroll, sensitivity, and active layers",
  "PMW3610 センサーを Devicetree に追加する":
    "Add a PMW3610 sensor to Devicetree",
  "SPI のチップセレクトと割り込みピンは、使うボードに合わせて指定します。":
    "Set the SPI chip-select and interrupt pins for your board.",
  "SPI と input listener を定義し、Studio RPC を有効にします。":
    "Define SPI and an input listener, then enable Studio RPC.",
  "SPI と input listener を定義し、PMW3610 と Studio RPC を有効にします。":
    "Define SPI and an input listener, then enable PMW3610 and Studio RPC.",
  "DYA2 の right-trackball.conf": "DYA2 right-trackball.conf",
  "ポインターとスクロールの両方を確認し、回転、軸、レイヤー別の有効化を一つずつ調整します。":
    "Test both pointer and scroll modes, then adjust rotation, axes, and per-layer enablement one at a time.",
  "DYA Studio の Trackball タブを開き、CPI や processor の調整 UI が表示されることを確認します。「未対応です」と表示される場合は、driver または input processor RPC が有効になっていません。":
    "Open the Trackball tab and confirm that CPI and processor controls are shown. If Studio says the feature is unsupported, the driver or input-processor RPC is not enabled.",
  "接続先と OS に合わせる": "Connections and operating systems",
  "BLE profile、接続先別レイヤー、OS 別デフォルトレイヤーを管理します。":
    "Manage BLE profiles, per-host layers, and OS-specific default layers.",
  "ライトモードの Connection 画面": "Connection screen in light mode",
  "BLE、接続先レイヤー、OS 検出を管理":
    "Manage BLE, host layers, and OS detection",
  "BLE Management — profile 管理": "BLE Management — manage profiles",
  "Default Layer — USB / profile 別レイヤー":
    "Default Layer — layers per USB connection or profile",
  "OS Detection — OS の自動検出と OS ごとの自動レイヤー切り替え":
    "OS Detection — automatically detect the OS and switch layers for it",
  "提供する機能だけを有効にし、profile 数を Bluetooth 設定に合わせます。":
    "Enable only the features you expose and set the profile count to match your Bluetooth configuration.",
  "必要な機能だけを有効にします。": "Enable only the features you need.",
  "USB と各 BLE profile を切り替え、指定した優先順位でデフォルトレイヤーが変わることを確認します。":
    "Switch between USB and each BLE profile and confirm that the default layer changes according to the configured priority.",
  "DYA Studio の Connection タブを開き、BLE profile、接続先レイヤー、OS 検出の UI が表示されることを確認します。「未対応です」と表示される場合は、対応する module または *_STUDIO_RPC が有効になっていません。":
    "Open the Connection tab and confirm that BLE profile, host-layer, and OS-detection controls are shown. If Studio says a feature is unsupported, its module or *_STUDIO_RPC is not enabled.",
  設定と物理レイアウト: "Settings and physical layouts",
  設定: "Settings",
  "全体的な設定や、より詳細で高度な設定を変更できるようにします。":
    "Make general settings and more detailed, advanced settings editable.",
  "sleep と custom setting の設定": "Sleep and custom-setting controls",
  スリープまでの時間を設定する: "Set the time until sleep",
  より高度な設定を変更する: "Change more advanced settings",
  "DYA Studio の Settings タブを開き、公開した sleep / custom setting の UI が表示されることを確認します。「未対応です」と表示される場合は、対応する module または *_STUDIO_RPC が有効になっていません。":
    "Open the Settings tab and confirm that the published sleep or custom-setting controls are shown. If Studio says a feature is unsupported, its module or *_STUDIO_RPC is not enabled.",
  "利用者が変更してよい実機設定と、画面に描くキー配置を安全に公開します。":
    "Expose safe hardware settings and the key layout shown in Studio.",
  "ライトモードの Settings 画面": "Settings screen in light mode",
  "sleep と physical layout の設定": "Sleep and physical-layout settings",
  "Settings RPC で idle / deep sleep を、Physical Layout Module で実機のキー配置を、Custom Settings で独自の数値や選択値を公開します。physical layout は入力を変える機能ではなく、正しい位置に描画・選択するための定義です。":
    "Use Settings RPC for idle and deep-sleep settings, Physical Layout Module for the keyboard layout, and Custom Settings for your own numeric or selectable values. A physical layout does not change input behavior; it tells Studio how to draw and select the keys.",
  "公開する値だけを RPC に載せ、範囲と初期値は firmware 側でも検証します。":
    "Expose only the values you need, and validate their ranges and defaults in firmware as well.",
  分割キーボード: "Split keyboards",
  "設定が中央側・非中央側のどちらへ適用されるかを UI と仕様で明示します。":
    "Make it clear in both the UI and documentation whether a setting applies to the central or non-central half.",
  "DYA Studio の Settings タブを開き、公開した sleep / physical layout / custom setting の UI が表示されることを確認します。「未対応です」と表示される場合は、対応する module または *_STUDIO_RPC が有効になっていません。":
    "Open the Settings tab and confirm that the published sleep, physical-layout, or custom-setting controls are shown. If Studio says a feature is unsupported, its module or *_STUDIO_RPC is not enabled.",
  "出荷後に状況を把握でき、開発中には再現と切り分けをしやすくします。":
    "Make field diagnosis possible after shipping and make reproduction and isolation easier during development.",
  "ユーザー向けには不具合発生時の原因調査を助ける情報を、開発者向けには開発中に使える便利な機能を提供します。":
    "Provide users with information that helps investigate problems, and developers with useful features for development.",
  "ライトモードの Troubleshooting 画面": "Troubleshooting screen in light mode",
  "device info と診断情報を表示": "Show device information and diagnostics",
  "Device Info は firmware build、battery、uptime を、Watchdog は状態と再起動原因の調査材料を提供します。KSCAN Diagnostics はキー行列、Devtool と Zephyr Setting Expose は開発中の内部情報を扱います。":
    "Device Info exposes the firmware build, battery, and uptime. Watchdog provides information for investigating state and reboot causes. KSCAN Diagnostics covers the key matrix, while Devtool and Zephyr Setting Expose expose development-time internals.",
  "Device Info — firmware build、battery、uptime を確認する":
    "Device Info — check firmware build, battery, and uptime",
  "Watchdog — 再起動原因と状態を確認する":
    "Watchdog — check restart causes and status",
  "KSCAN Diagnostics — キー行列を確認する":
    "KSCAN Diagnostics — check the key matrix",
  "Devtool / Zephyr Setting Expose — 開発中の内部情報を扱う":
    "Devtool / Zephyr Setting Expose — work with internal development information",
  "不具合報告に必要な、ファームウェアと実機の基本情報を確認できます。":
    "Check the basic firmware and hardware information needed for a bug report.",
  情報: "Information",
  確認できる内容: "What you can check",
  "ZMK / config / module / Zephyr のバージョン":
    "ZMK, config, module, and Zephyr versions",
  "firmware の commit とビルド時刻": "Firmware commit and build time",
  "board、shield、battery": "Board, shield, and battery",
  "uptime と接続状態": "Uptime and connection status",
  "予期しない再起動や、起動直後に繰り返しリセットされるときに確認します。再起動原因と直前の状態を手がかりに、電源・firmware・周辺機器の問題を切り分けます。":
    "Check this after an unexpected restart or repeated resets just after boot. Use the restart cause and preceding state to isolate power, firmware, or peripheral problems.",
  "予期しない再起動や、起動直後に繰り返しリセットされるときに確認します。再起動原因と直前の状態を手がかりに、電源・firmware・周辺機器の問題を切り分けます。書き込み用 firmware をアップロードすると、さらに詳しく原因を調べることもできます。":
    "Check this after an unexpected restart or repeated resets just after boot. Use the restart cause and preceding state to isolate power, firmware, or peripheral problems. Uploading a diagnostic firmware can help investigate the cause in more detail.",
  "キーを押して行・列・position が期待どおりに検出されるかを確認します。キーが反応しない、別のキーとして入力される、といった配線や matrix 定義の確認に役立ちます。":
    "Press keys to confirm that their row, column, and position are detected as expected. This helps check wiring and matrix definitions when a key does not respond or is registered as another key.",
  Devtool: "Devtool",
  "開発中に使うポップアップです。ログを表示・コピー・保存でき、Studio の lock 状態を確認して unlock / lock を切り替えられます。":
    "This popup is for development. You can view, copy, and save logs, check Studio's lock state, and switch between unlock and lock.",
  "ライトモードの Devtool ポップアップ": "Devtool popup in light mode",
  "ログ表示と Studio の lock 操作": "Log display and Studio lock controls",
  "製品版で公開する情報を最小化し、必要な診断だけを有効にします。":
    "Minimize the information exposed in production and enable only the diagnostics you need.",
  "Troubleshooting report、firmware commit / build 時刻、board・shield、再現手順を取得できることを確認します。":
    "Confirm that you can collect a troubleshooting report, firmware commit and build time, board and shield, and reproduction steps.",
  "DYA Studio の Troubleshooting タブを開き、Device Info や Watchdog の UI が表示されることを確認します。「未対応です」と表示される場合は、対応する diagnostic module または *_STUDIO_RPC が有効になっていません。":
    "Open the Troubleshooting tab and confirm that Device Info and Watchdog controls are shown. If Studio says a feature is unsupported, its diagnostic module or *_STUDIO_RPC is not enabled.",
  "レベル 3: 独自 Custom Studio Protocol モジュールを作る":
    "Level 3: Build a custom Studio Protocol module",
  "既成モジュールにないハードウェアや設定用の firmware RPC と Studio 画面を作ります。":
    "Create firmware RPC and a Studio screen for hardware or settings that existing modules do not cover.",
  "既存モジュールにないハードウェアや設定用の firmware RPC と Studio 画面を作ります。":
    "Create firmware RPC and a Studio screen for hardware or settings that existing modules do not cover.",
  対象: "Use cases",
  "独自センサーのキャリブレーション、ノブの動作モード、ケース LED、実機固有の診断値などを読み書きできます。":
    "Read and write values such as custom-sensor calibration, knob modes, case LEDs, and hardware-specific diagnostics.",
  "独自のセンサー設定を Web から編集したり、DYA Studio よりも使いやすい設定画面を作ったり、より多くの機能を設定できるようにしたいキーボード開発者向けです。":
    "For keyboard developers who want to edit custom sensor settings on the web, create settings screens that are easier to use than DYA Studio, or configure more capabilities.",
  作成の流れ: "Build flow",
  "west manifest に module と対応 ZMK を追加する。":
    "Add the module and its compatible ZMK version to the west manifest.",
  "protobuf に Get / Set / notification を定義する。":
    "Define Get, Set, and notification messages in protobuf.",
  "firmware handler で検証・保存・通知を実装する。":
    "Implement validation, persistence, and notifications in the firmware handler.",
  "React + TypeScript UI と firmware / build / Web UI のテストを追加する。":
    "Add a React and TypeScript UI plus firmware, build, and web-UI tests.",
  "テンプレートからレポジトリを作る。":
    "Create a repository from the template.",
  "protobuf と firmware handler を実装する。":
    "Implement protobuf and the firmware handler.",
  "React + TypeScript の設定画面を実装する。":
    "Implement the React and TypeScript settings screen.",
  "firmware / build / Web UI のテストを追加する。":
    "Add firmware, build, and web-UI tests.",
  "AI と進める": "Working with AI",
  "まず AGENTS.md と README を読ませ、実装したい値・単位・範囲・保存要否を一つに絞って伝える。":
    "Start by having the AI read AGENTS.md and README. Give it one value to implement, including its unit, range, and whether it must persist.",
  "proto → firmware handler → web UI → test の順で、小さな変更単位ごとに実装を依頼する。":
    "Ask for small changes in this order: proto, firmware handler, web UI, then tests.",
  "各変更後に build と unit / Web UI test を実行させ、protobuf の既存 field 番号を変更していないことをレビューする。":
    "After every change, run the build and unit or web-UI tests, and review that no existing protobuf field number changed.",
  "実機で値を読む・書く・再接続後に復元する、までを完了条件にする。":
    "Treat reading, writing, and restoring the value after reconnecting on real hardware as the definition of done.",
  "対象のレポジトリで AI を開き、やりたいことを伝えてください。Web UI から firmware、テストまでまとめて実装を進められます。":
    "Open AI in the target repository and describe what you want to build. It can help implement everything from the web UI to firmware and tests.",
  互換性と安全性: "Compatibility and safety",
  "Custom Studio Protocol の subsystem ID は、他のモジュールと重複しない固有の値にする。":
    "Use a unique Custom Studio Protocol subsystem ID that does not overlap with another module.",
  "個人情報やキーボードの動作を悪用できる設定は、Studio を unlock した状態でだけ読み書きできるようにする。":
    "Allow settings that could expose personal information or be used to misuse keyboard behavior to be read or written only while Studio is unlocked.",
  "キー入力を変更・直接取得するモジュールはキーロガーとして悪用されるおそれがあります。実装には特に注意し、必要がなければ実装しない。":
    "Modules that modify or directly capture keystrokes can be abused as keyloggers. Treat them with particular care, and do not implement them unless needed.",
  "公開済み protobuf field 番号を再利用せず、unknown field / unsupported feature を扱い、値は firmware 側でも検証する。":
    "Do not reuse published protobuf field numbers, handle unknown fields and unsupported features, and validate values in firmware as well.",
  テンプレート: "Template",
  "このテンプレートには Custom Studio Protocol handler、protobuf、React UI、firmware / build / Web UI test が含まれます。":
    "This template includes a Custom Studio Protocol handler, protobuf definitions, a React UI, and firmware, build, and web-UI tests.",
  "レベル 2 の Custom Studio Protocol 構成":
    "The Level 2 Custom Studio Protocol setup",
  "firmware と React UI の実装・テスト":
    "Firmware and React UI implementation and testing",
  "リファレンス: DYA2 のコードを読む":
    "Reference: Reading the DYA2 configuration",
  "設定のコピー集ではなく、DYA2 で依存、Kconfig、Devicetree がどうつながるかを読む案内です。":
    "Rather than a set of settings to copy, this page shows how dependencies, Kconfig, and Devicetree connect in DYA2.",
  "DYA2 の設定ファイルについて簡単に解説したページです。":
    "A brief guide to the DYA2 configuration files.",
  "west-dependency.yml": "west-dependency.yml",
  "DYA2 で使っている ZMK / Zephyr の revision と、機能ごとのモジュール一覧です。必要な依存だけを自分の west.yml に追加します。":
    "Lists the ZMK and Zephyr revisions used by DYA2, together with modules for each feature. Add only the dependencies you need to your west.yml.",
  "dya2_right.conf": "dya2_right.conf",
  "Studio、接続、sleep、各 *_STUDIO_RPC、buffer / stack などの Kconfig 設定をまとめています。":
    "Collects Kconfig settings for Studio, connections, sleep, each *_STUDIO_RPC option, and buffers and stacks.",
  "dya2.dtsi": "dya2.dtsi",
  "physical layout、matrix / touch、trackball listener / processor、wired split、LED、battery などの Devicetree 定義です。":
    "Contains Devicetree definitions for the physical layout, matrix and touch, trackball listeners and processors, wired split, LEDs, battery, and more.",
  "最初に読む 3 ファイル": "The first three files to read",
  "依存、Kconfig、Devicetree の順で確認します。":
    "Read dependencies first, then Kconfig, then Devicetree.",
  "全部入りの west-dependency.yml": "Full west-dependency.yml",
  "右側の dya2_right.conf": "Right-side dya2_right.conf",
  "共通の dya2.dtsi": "Shared dya2.dtsi",
  "manifest では ZMK / Zephyr revision と機能別 module を確認する。":
    "In the manifest, check the ZMK and Zephyr revisions and the feature modules.",
  "right.conf では Studio、接続、sleep、各 *_STUDIO_RPC、buffer / stack の順で読む。":
    "In right.conf, read Studio, connections, sleep, each *_STUDIO_RPC option, then buffers and stacks.",
  "dtsi では physical layout、matrix / touch、trackball listener / processor、wired split、LED、battery をたどる。":
    "In dtsi, trace the physical layout, matrix and touch, trackball listener and processor, wired split, LEDs, and battery.",
  読む順番: "How to read it",
  "DYA2 は全部入りの参照実装です。作りたい画面に対応する module が manifest にあるかを確認し、該当機能ページへ戻って .conf / .dtsi の確認点を適用します。buffer / stack / save debounce は DYA2 の値をそのままコピーせず、小さく始めてビルドと実機通信で調整します。":
    "DYA2 is a full reference implementation. Check whether the module for the screen you want is in the manifest, return to the relevant feature guide, and apply its .conf and .dtsi checklist. Do not copy DYA2 buffer, stack, or save-debounce values blindly; start small and tune them with builds and real hardware.",
  コピーしないもの: "Do not copy these values",
  "pin、matrix map、battery 抵抗値、LED 構成は DYA2 固有です。コピーするのは node の役割と参照関係だけです。":
    "Pins, matrix maps, battery resistor values, and LED configuration are specific to DYA2. Copy only the roles of nodes and their references.",
  トラブルシューティング: "Troubleshooting",
  "接続、画面表示、保存、メモリ、入力位置を症状から切り分けます。":
    "Diagnose connection, UI, persistence, memory, and input-position issues by symptom.",
  "サポートに必要な device info と診断":
    "Device information and diagnostics for support",
  "DYA Studio に接続できない": "Cannot connect to DYA Studio",
  "USB の Studio RPC snippet、中央側の build、CONFIG_ZMK_STUDIO を確認します。":
    "Check the USB Studio RPC snippet, the build for the half connected to the PC, and CONFIG_ZMK_STUDIO.",
  "Keymap は出るが変更できない":
    "The Keymap screen appears but cannot be edited",
  "&studio_unlock と Studio の lock 状態を確認します。":
    "Check &studio_unlock and the Studio lock state.",
  期待した画面が出ない: "An expected screen does not appear",
  "対応 module と *_STUDIO_RPC、DYA Studio が対応する subsystem を確認します。":
    "Check the required module and *_STUDIO_RPC option, and whether DYA Studio supports that subsystem.",
  "キーボードがリセットされたり、フリーズ後に復帰したりする":
    "The keyboard resets or recovers after freezing",
  "stack overflow または時間のかかる処理によって Watchdog timer が動作した可能性が高いです。thread stack と処理時間を確認してください。":
    "A stack overflow or long-running operation likely triggered the watchdog timer. Check thread stack sizes and processing time.",
  キーやトラックボールがおかしい: "Keys or trackball behave unexpectedly",
  "キー位置は .dtsi の physical layout、KSCAN topology、keymap position を確認します。トラックボールは SPI/pin、sensor node、rotation、input processor の有効 layer を確認します。":
    "For key positions, check the physical layout in .dtsi, KSCAN topology, and keymap positions. For the trackball, check SPI and pins, the sensor node, rotation, and the active layers of the input processor.",
  はじめに: "Introduction",
  "レベル 1: ZMK Studio": "Level 1: ZMK Studio",
  "レベル 2: DYA 拡張": "Level 2: DYA extensions",
  "接続先と OS": "Connections and OS",
  "レベル 3: 独自 RPC": "Level 3: Custom RPC",
  "DYA2 リファレンス": "DYA2 reference",
  参照実装: "Reference implementation",
  "このページに対応する dya-studio-sample の PR です。":
    "This is the dya-studio-sample PR for this page.",
  "GitHub で PR を開く": "Open PR on GitHub",
  開発者ガイド: "Developer guide",
  "関連: ": "Related: ",
  "次へ: ": "Next: ",
  ライトモードのスクリーンショットを準備中: "Light-mode screenshot coming soon",
};

function translateGuideText(value: string): string {
  return englishText[value] ?? value;
}

function translateGuideCode(value: string): string {
  return value
    .replace("Studio 用の physical layout", "physical layout for Studio")
    .replace("Studio RPC を有効化", "Enable Studio RPC")
    .replace(
      "Studio で編集するときだけ解除",
      "Unlock only when editing in Studio",
    )
    .replace("押下キー表示が必要な場合だけ", "only when showing pressed keys")
    .replace("押下キー表示も必要な場合だけ", "only when showing pressed keys")
    .replace("スリープまでの時間を設定する", "Set the time until sleep")
    .replace("より高度な設定を変更する", "Change more advanced settings")
    .replace(
      "プレビューに拡張モジュールを表示する場合だけ",
      "only when showing extension modules in the preview",
    )
    .replace("ボードに合わせる", "set for your board")
    .replace(
      "Custom Studio Protocol を複数使う場合の推奨値",
      "recommended values when using multiple Custom Studio Protocol modules",
    )
    .replace(
      "プレビューにトラックボールやロータリーエンコーダー、トラックパッドを表示する場合",
      "only when showing trackballs, rotary encoders, or touch pads in the preview",
    )
    .replace("必要な node だけを追加する", "Add only the nodes you need");
}

function translatePage(page: DeveloperGuidePage): DeveloperGuidePage {
  return {
    ...page,
    title: translateGuideText(page.title),
    summary: translateGuideText(page.summary),
    screenshots: page.screenshots?.map((image) => ({
      ...image,
      alt: translateGuideText(image.alt),
      caption: translateGuideText(image.caption),
    })),
    sections: page.sections.map((section) => ({
      ...section,
      title: translateGuideText(section.title),
      body: section.body.map(translateGuideText),
      bullets: section.bullets?.map(translateGuideText),
      links: section.links?.map((link) => ({
        ...link,
        label: translateGuideText(link.label),
      })),
      linkGroups: section.linkGroups?.map((group) => ({
        ...group,
        title: translateGuideText(group.title),
        links: group.links.map((link) => ({
          ...link,
          label: translateGuideText(link.label),
        })),
      })),
      table: section.table
        ? {
            headers: section.table.headers.map(translateGuideText),
            rows: section.table.rows.map((row) => row.map(translateGuideText)),
          }
        : undefined,
      image: section.image
        ? {
            ...section.image,
            alt: translateGuideText(section.image.alt),
            caption: translateGuideText(section.image.caption),
          }
        : undefined,
      code: section.code
        ? {
            ...section.code,
            value: translateGuideCode(translateGuideText(section.code.value)),
          }
        : undefined,
    })),
    prerequisites: page.prerequisites?.map(translateGuideText),
  };
}

const englishGuidePages = Object.fromEntries(
  developerGuideRoutes.map((route) => [
    route,
    translatePage(developerGuidePages[route]),
  ]),
) as Record<DeveloperGuideRoute, DeveloperGuidePage>;

function localizeGuideLabels(
  language: Language,
): Record<DeveloperGuideRoute, string> {
  if (language === "ja") return guideLabels;
  return Object.fromEntries(
    developerGuideRoutes.map((route) => [
      route,
      translateGuideText(guideLabels[route]),
    ]),
  ) as Record<DeveloperGuideRoute, string>;
}

function createNavigation(
  labels: Record<DeveloperGuideRoute, string>,
): DeveloperGuideNavigationItem[] {
  return developerGuideNavigation.map((item) => ({
    ...item,
    label: labels[item.id as DeveloperGuideRoute],
    items: item.items?.map((child) => ({
      ...child,
      label: labels[child.id as DeveloperGuideRoute],
    })),
  }));
}

function createPageDefinitions(
  pages: Record<DeveloperGuideRoute, DeveloperGuidePage>,
  language: Language,
): Record<DeveloperGuideRoute, DeveloperGuidePageDefinition> {
  const labels = localizeGuideLabels(language);
  const navigation = createNavigation(labels);
  const developerGuideLabel = translateGuideText("開発者ガイド");
  const relatedLabel = translateGuideText("関連: ");
  const nextLabel = translateGuideText("次へ: ");

  return Object.fromEntries(
    developerGuideRoutes.map((route) => {
      const page = pages[route];
      return [
        route,
        {
          title: page.title,
          description: page.summary,
          breadcrumbs:
            route === "/developer-guide"
              ? undefined
              : [
                  { label: developerGuideLabel, href: "/developer-guide" },
                  { label: labels[route] },
                ],
          navigation,
          activeNavigationId: route,
          sections: renderSections(page).map((section) =>
            section.type === "image" && section.placeholderLabel
              ? {
                  ...section,
                  placeholderLabel: translateGuideText(
                    section.placeholderLabel,
                  ),
                }
              : section,
          ),
          previous: page.related[0]
            ? {
                label: `${relatedLabel}${labels[page.related[0]]}`,
                href: page.related[0],
              }
            : undefined,
          next: page.next
            ? { label: `${nextLabel}${labels[page.next]}`, href: page.next }
            : undefined,
        } satisfies DeveloperGuidePageDefinition,
      ];
    }),
  ) as Record<DeveloperGuideRoute, DeveloperGuidePageDefinition>;
}

/** UI-ready Japanese page data for existing consumers. */
export const developerGuidePageDefinitions = createPageDefinitions(
  developerGuidePages,
  "ja",
);

const englishDeveloperGuidePageDefinitions = createPageDefinitions(
  englishGuidePages,
  "en",
);

export function getDeveloperGuidePageDefinition(
  route: string,
  language: Language = "ja",
): DeveloperGuidePageDefinition | undefined {
  const pages =
    language === "en"
      ? englishDeveloperGuidePageDefinitions
      : developerGuidePageDefinitions;
  return pages[route as DeveloperGuideRoute];
}

export function isDeveloperGuidePath(path: string): boolean {
  return (
    path === DEVELOPER_GUIDE_PATH || path.startsWith(`${DEVELOPER_GUIDE_PATH}/`)
  );
}
