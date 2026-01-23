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
    // Mock CSS imports
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|svg)$": "<rootDir>/src/__mocks__/fileMock.ts",
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/main.tsx",
    "!src/vite-env.d.ts",
  ],
  transformIgnorePatterns: ["node_modules/(?!(@cormoran|@zmkfirmware)/)"],
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
