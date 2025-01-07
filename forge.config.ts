import type { ForgeConfig, ForgePackagerOptions } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

import { config as dotenvConfig } from "dotenv";

// Updated argument parsing
const platformIndex = process.argv.indexOf('--platform');
const archIndex = process.argv.indexOf('--arch');
const targetPlatform = platformIndex !== -1 ? process.argv[platformIndex + 1] : process.platform;
const targetArch = archIndex !== -1 ? process.argv[archIndex + 1] : process.arch;

function getConfig(buildPlatform: string, buildArch: string, targetPlatform: string, targetArch: string): ForgeConfig {
  const packagerConfig: ForgePackagerOptions = {
    asar: true,
    icon: "./images/icon",
    protocols: [
      {
        name: "iod",
        schemes: ["iod"],
      },
    ],
    extraResource: [
      `binaries/${targetPlatform}/${targetArch}`,
    ],
  }
 

  // add macos signing if we are building and targetting darwin.
  if (buildPlatform === "darwin" && targetPlatform === "darwin") {
    dotenvConfig();
    if (!process.env.APPLE_ID || !process.env.APPLE_PASSWORD || !process.env.APPLE_TEAM_ID) {
      throw new Error("Missing Apple ID, password, or team ID");
    }

    packagerConfig.osxSign = {};
    packagerConfig.osxNotarize = {
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    };
  }


  return {
    packagerConfig,
    rebuildConfig: {},
    makers: [
      new MakerSquirrel({}),
      new MakerZIP({}, ["darwin"]),
      new MakerRpm({}),
      new MakerDeb({}),
      {
        name: "@electron-forge/maker-dmg",
        config: {
          format: "ULFO",
        },
      },
    ],
    plugins: [
      new VitePlugin({
        // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
        // If you are familiar with Vite configuration, it will look really familiar.
        build: [
          {
            // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
            entry: "src/main/main.ts",
            config: "vite.main.config.ts",
            target: "main",
          },
          {
            entry: "src/preload/preload.ts",
            config: "vite.preload.config.ts",
            target: "preload",
          },
        ],
        renderer: [
          {
            name: "main_window",
            config: "vite.renderer.config.ts",
          },
        ],
      }),
      // Fuses are used to enable/disable various Electron functionality
      // at package time, before code signing the application
      new FusesPlugin({
        version: FuseVersion.V1,
        [FuseV1Options.RunAsNode]: false,
        [FuseV1Options.EnableCookieEncryption]: true,
        [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
        [FuseV1Options.EnableNodeCliInspectArguments]: false,
        [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
        [FuseV1Options.OnlyLoadAppFromAsar]: true,
      }),
    ],
  };

}

const config = getConfig(process.platform, process.arch, targetPlatform, targetArch);
export default config;
