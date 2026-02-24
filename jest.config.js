const path = require("path");
const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("./tsconfig.json");
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  transformIgnorePatterns: ["node_modules/(?!isomorphic-git)"],
  transform: {
    "^.+\\.html$": "<rootDir>/html-loader.js",
  },
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: "<rootDir>/src/" }),
    // "^webextension-polyfill$":
    //     path.join(process.cwd(), "src", "__mocks__", "runtime.ts"),
    // '\\.(css|scss)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
};
