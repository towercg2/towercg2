import Bunyan from "bunyan";
import lodash from "lodash";
import Express from "express";
import http from "http";
import SocketIO from "socket.io";
import sleep from "sleep-promise";
import uuidV4 from "uuid/v4";

import {
  ProtocolNames,
  AuthenticateMessage,
  ClientConnectedEvent
} from "@towercg2/client";

import { Config } from "../Config";
import { ServerPluginBase } from "../ServerPlugin";
import { LookupAuth } from "../auth";
import { socketToClientInfo } from "../utils";

const AUTHENTICATED_CLIENTS = "AUTHENTICATED_CLIENTS";

export class Server {
  readonly config: Readonly<Config>;
  private readonly logger: Bunyan;

  private _started: boolean = false;
  private _stopping: boolean = false;
  private http!: Express.Application;
  private httpServer!: http.Server;
  private io!: SocketIO.Server;
  private readonly plugins: Array<ServerPluginBase> = [];

  constructor(baseConfig: Config) {
    this.config = baseConfig;

    this.logger = this.baseLogger.child({ component: this.constructor.name });
    this.logger.info(
      { port: this.config.port, dataDirectory: this.config.dataDirectory },
      "Instantiating server."
    );
  }

  get started(): boolean { return this._started; }
  get baseLogger(): Bunyan { return this.config.logger; }
  get dataDirectory(): string { return this.config.dataDirectory; }

  get state(): { [pluginName: string]: object } {
    return lodash.fromPairs(this.plugins.map((plugin) => [plugin.name, plugin.state]));
  }

  get authenticatedSockets(): Array<SocketIO.Socket> {
    return Object.values(this.io.in(AUTHENTICATED_CLIENTS).sockets);
  }

  async start(returnImmediately: boolean = false): Promise<void> {
    if (this._started) {
      throw new Error("Server cannot be started a second time. Create a new one.");
    }

    this.logger.info("Starting server...");

    this._started = true;
    for (const pluginRecord of this.config.plugins) {
      const pluginClassName = pluginRecord.type.name;

      this.logger.debug({ pluginClassName }, "Instantiating plugin.");
      const plugin = new pluginRecord.type(pluginRecord.config, this);
      this.plugins.push(plugin);
    }

    this.http = Express();
    const localIdentifiers: { [name: string]: string } = {};
    const pluginAuthLookup = LookupAuth(localIdentifiers);

    const localUri = `http://127.0.0.1:${this.config.port}`;
    for (const plugin of this.plugins) {
      this.logger.debug(
        { pluginName: plugin.name, pluginClassName: plugin.constructor.name },
        "Initializing plugin."
      );

      const pluginApp = Express();
      const clientId = `LOCAL-${plugin.name}`;
      const clientSecret = uuidV4();

      localIdentifiers[clientId] = clientSecret;

      plugin.doSetClientConnection(localUri, clientId, clientSecret);
      await plugin.doInitialize(pluginApp);
      this.http.use(`/${plugin.name}`, pluginApp);
    }

    this.http.get("/state", (_req, res) => res.json(this.state));

    const port = this.config.port;
    this.logger.info({ port }, `Starting HTTP server on port ${port}.`)
    this.httpServer = this.http.listen(port);

    this.io = this.initializeSocketIO(localIdentifiers);
    this.logger.info("Server started.");

    if (!returnImmediately) {
      while (!this._stopping) {
        await sleep(1000);
      }
    }
  }

  async stop(): Promise<void> {
    if (!this._started) {
      throw new Error("Server cannot be stopped before starting.");
    }

    this.logger.info("Stopping server...");
    this._stopping = true;

    if (this.httpServer) {
      this.logger.debug("Stopping HTTP.");
      this.httpServer.close();
    }

    for (const plugin of this.plugins) {
      this.logger.debug({ pluginName: plugin.name }, "Cleaning up plugin.");
      await plugin.cleanup();
    }

    this.logger.info("Server stopped.");
  }

  messageToAuthenticated(messageName: string, messageBody: object) {
    if (!this.io) {
      throw new Error("Attempted to emit before socket.io enabled.");
    }

    this.io.to(AUTHENTICATED_CLIENTS).emit(ProtocolNames.MESSAGE, { messageName, messageBody });
  }

  notifyClientsOfStateChange(pluginName: string) {
  }

  private initializeSocketIO(localIdentifiers: { [name: string]: string }): SocketIO.Server {
    const io = SocketIO();
    const pluginAuthLookup = LookupAuth(localIdentifiers);

    io.on("connect", (socket: SocketIO.Socket) => {
      const logger = this.logger.child({ socket: socket.id });
      logger.info("Connection request received.");

      socket.on(ProtocolNames.CLIENT_AUTHENTICATE, async (msg: AuthenticateMessage) => {
        const auth = (await this.config.authnFn(msg.payload.clientId, msg.payload.clientSecret)) ||
          await pluginAuthLookup(msg.payload.clientId, msg.payload.clientSecret);

        if (auth) {
          logger.info("Socket has authenticated.");
          const ev: ClientConnectedEvent = {
            type: ProtocolNames.NEW_CLIENT_CONNECTED,
            payload: socketToClientInfo(socket)
          };
          this.messageToAuthenticated(ev.type, ev);
          socket.join(AUTHENTICATED_CLIENTS);

          this.attachSocketIOHandlers(socket);
          socket.emit(ProtocolNames.YOU_ARE_CONNECTED);
        } else {
          logger.info("Socket failed to authenticate; closing.");
          socket.disconnect();
        }
      });

      socket.emit(ProtocolNames.PLEASE_AUTHENTICATE);
    });

    io.attach(this.httpServer);
    return io;
  }

  private attachSocketIOHandlers(socket: SocketIO.Socket) {
    for (const plugin of this.plugins) {
      plugin.doBindSocketIOHandlers(socket);
    }
  }
}
