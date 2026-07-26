import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  moduleNameMapper: {
    // Map the base paths first
    "^@zmkfirmware/zmk-studio-ts-client$":
      "<rootDir>/node_modules/@zmkfirmware/zmk-studio-ts-client/lib/index.js",
    // Map the specific module paths
    "^@zmkfirmware/zmk-studio-ts-client/transport/serial$":
      "<rootDir>/node_modules/@zmkfirmware/zmk-studio-ts-client/lib/transport/serial.js",
    "^@zmkfirmware/zmk-studio-ts-client/(.*)$":
      "<rootDir>/node_modules/@zmkfirmware/zmk-studio-ts-client/lib/$1.js",
    "^@cormoran/zmk-studio-react-hook/testing$":
      "<rootDir>/node_modules/@cormoran/zmk-studio-react-hook/lib/testing/index.js",
    "^@cormoran/zmk-studio-react-hook$":
      "<rootDir>/node_modules/@cormoran/zmk-studio-react-hook/lib/index.js",
    // Collapse the adapter's copy of the ZMK Studio client onto the fork this
    // app uses, so `call_rpc` has a single module-level mutex per connection.
    // Mirrored in vite.config.ts and tsconfig.app.json.
    "^@keyboard-hub/zmk-studio-ts-client$":
      "<rootDir>/node_modules/@zmkfirmware/zmk-studio-ts-client/lib/index.js",
    "^@keyboard-hub/zmk-studio-ts-client/(.*)$":
      "<rootDir>/node_modules/@zmkfirmware/zmk-studio-ts-client/lib/$1.js",
    // @keyboard-hub/abyss-client publishes untranspiled ESM TypeScript and
    // declares only the "types" and "import" export conditions, so the
    // CommonJS test runtime can neither resolve nor execute it. Swap it for a
    // stub; the real SDK is exercised by the Vite build and in the browser.
    "^@keyboard-hub/abyss-client$": "<rootDir>/src/__mocks__/abyssClientSdk.ts",
    // Same story for the ZMK adapter. Its diff/compare helpers live in
    // @keyboard-hub/adapter-common and are covered by that repo's own test
    // suite; what DYA Studio tests here is its wiring around them.
    "^@keyboard-hub/adapter-zmk$": "<rootDir>/src/__mocks__/abyssAdapterZmk.ts",
    // viteEnv reads `import.meta.env`, which the CommonJS test runtime can't
    // parse; swap it for the stub in src/lib/__mocks__/viteEnv.ts. Matches any
    // relative specifier for it ("./viteEnv", "../viteEnv", "../lib/viteEnv"),
    // not just the one shape used from inside src/lib.
    "(?:^|/)viteEnv$": "<rootDir>/src/lib/__mocks__/viteEnv.ts",
    // Mock CSS imports
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    // vite-plugin-svgr imports (`*.svg?react`) are React components, not URLs,
    // so they need a component stub rather than the plain string one. Must come
    // before the generic asset rule.
    "\\.svg\\?react$": "<rootDir>/src/__mocks__/svgComponentMock.tsx",
    "\\.(jpg|jpeg|png|gif|svg)$": "<rootDir>/src/__mocks__/fileMock.ts",
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/main.tsx",
    "!src/vite-env.d.ts",
  ],
  // @keyboard-hub packages ship untranspiled ESM TypeScript sources, so they
  // have to go through the transform like the ZMK client packages do.
  transformIgnorePatterns: [
    "node_modules/(?!(@cormoran|@zmkfirmware|@keyboard-hub)/)",
  ],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
        diagnostics: false,
      },
    ],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  testMatch: ["**/__tests__/**/*.ts?(x)", "**/?(*.)+(spec|test).ts?(x)"],
};
export default config;
