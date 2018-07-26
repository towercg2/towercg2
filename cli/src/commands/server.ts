import { Command, command, metadata, param } from "clime";
import { Server as TowerCG2Server } from "@towercg2/server";

import { withConfig } from "../utils";
import { start } from "repl";

@command({
  description: "starts a TowerCG2 server"
})
export default class Server extends Command {
  @metadata
  execute(
    @param({ required: true, description: "application config file" })
    configFile: string
  ) {
    withConfig(configFile, async (config) => {
      const server = new TowerCG2Server(config);
      server.baseLogger.info("Starting server through CLI path.");

      const startAwaiter = server.start(); // joins into the server

      const ON_DEATH = require("death");
      ON_DEATH(async (signal: any, err: any) => {
        if (server.started) {
          await server.stop();
        }

        process.exit(0);
      });

      await startAwaiter;
    });
  }
}
