import * as path from "path";

import { Config } from "@towercg2/server";

export async function withConfig<T>(configPath: string, fn: (config: Config) => T | Promise<T>): Promise<T> {
  try {
    const tsNode = require("ts-node");
    tsNode.register({});
    const obj = require(path.resolve(configPath));

    if (!(obj instanceof Config)) {
      throw new Error(`'${configPath}' is not a TowerCG2 server config object.`);
    }

    const config = obj as Config;
    config.logger.info("Config loaded.");
    return fn(config);
  } catch (error) {
    console.error("An error occurred during initial config bootstrap.");
    console.error(error);
    process.exit(1);

    throw error; // tsc doesn't realize that the function terminates with process.exit
  }
}
