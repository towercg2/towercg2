// TowerCG2's `cli` module includes the `ts-node` library, which allows a
// running NodeJS process to process a TypeScript config file. It's not
// necessary, and you can write a JavaScript config file anytime you'd like,
// but I think you should default to TypeScript because it'll make your life
// easier in the long run.
//
// The config expected by TowerCG2 can be built however you'd like. The only
// requirements are that you set `module.exports` to an object that is of
// type `Config`.

import * as path from "path";

import { Config, CorePlugins } from "@towercg2/server";

const config = new Config();
config.dataDirectory = path.resolve(__dirname, "..", "data");

config.registerPlugin(CorePlugins.TickPlugin);
config.registerPlugin(CorePlugins.RosterPlugin);

config.logger.level("info");

module.exports = config;
