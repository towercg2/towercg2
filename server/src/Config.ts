import Bunyan from "bunyan";
import { default as deepFreeze, DeepReadonly } from "deep-freeze";
import lodash from "lodash";
import path from "path";

import { ServerPluginConfig, ServerPluginClassBase, ServerPluginClass, ServerPlugin } from "./ServerPlugin";
import { AuthnFunction, SinglePassword } from "./auth";

export interface ServerPluginRecordBase {
  type: ServerPluginClassBase;
  config: Partial<ServerPluginConfig>;
};

export interface ServerPluginRecord<
  TConfig extends ServerPluginConfig,
  TState extends object,
  TPlugin extends ServerPlugin<TConfig, TState>
> extends ServerPluginRecordBase {
  type: ServerPluginClass<TConfig, TPlugin>;
  config: Partial<TConfig>;
}

export class Config {
  port: number = 1776;
  logger: Bunyan = Bunyan.createLogger({
    name: "towercg2",
    level: "debug"
  });

  authnFn: AuthnFunction = SinglePassword("password");
  dataDirectory: string = path.resolve(process.cwd(), "data");

  readonly plugins: Array<ServerPluginRecordBase> = [];

  registerPlugin<
    TConfig extends ServerPluginConfig,
    TState extends object,
    TPlugin extends ServerPlugin<TConfig, TState>
  >(
    type: ServerPluginClass<TConfig, TPlugin>,
    config: Partial<TConfig> = {}
  ): void {
    const record: ServerPluginRecord<TConfig, TState, TPlugin> = { config, type };

    if (this.plugins.find(p => p.type === type)) {
      throw new Error(`Duplicate plugin type: ${type.name}.`);
    }

    this.plugins.push(record);
  }
}
