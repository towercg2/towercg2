import Bunyan from "bunyan";
import * as Express from "express";
import * as lodash from "lodash";
import * as path from "path";
import * as fsx from "fs-extra";
import { Store, DeepPartial, Reducer, AnyAction } from "redux";

import {
  Message,
  RequestMessage,
  Response,
  responseEventName,
  Client,
  ProtocolNames
} from "@towercg2/client";

import { Server } from "../Server/index";
import { Behaviors } from "./Behaviors";
import { buildStore } from "./store";

export interface ServerPluginClassBase {
  new(config: Partial<ServerPluginConfig>, server: Server): ServerPluginBase;

  readonly pluginName: string;
};

export interface ServerPluginClass<TConfig extends ServerPluginConfig, TPlugin extends ServerPluginBase> extends ServerPluginClassBase {
  new(config: Partial<TConfig>, server: Server): TPlugin;
}

export interface ServerPluginConfig {

}

export abstract class ServerPluginBase {
  private static readonly DEFAULT_BEHAVIORS: Behaviors = {
    enableFileServing: true,
    storeJsonReviver: null,
    storeJsonReplacer: null
  };

  readonly name: string;
  protected readonly logger: Bunyan;
  /**
   * As opposed to configuration, which determines the runtime behavior of this plugin,
   * _behaviors_ determine immutable aspects of the plugin, such as what portions of its data
   * store are skipped when serializing to disk.
   */
  readonly behaviors: Behaviors;

  private _client: Client | null = null;
  protected get client(): Client {
    if (!this._client) {
      throw new Error("Attempted to get client before instantiation.");
    }

    return this._client;
  }

  constructor(
    protected readonly server: Server
  ) {
    this.name = (this.constructor as ServerPluginClassBase).pluginName;
    this.logger = server.baseLogger.child({ plugin: this.constructor.name, pluginName: this.name });

    this.behaviors = this.behaviors = lodash.merge({}, ServerPluginBase.DEFAULT_BEHAVIORS, this.buildPluginBehaviors());
  }

  abstract get state(): object;

  protected buildPluginBehaviors(): Partial<Behaviors> { return {}; }
  get dataDirectory(): string { return path.resolve(this.server.config.dataDirectory, this.name); }

  protected abstract get config(): ServerPluginConfig;
  protected abstract buildDefaultConfig(): ServerPluginConfig;
  protected bindHttpEndpoints(app: Express.Application): void {}
  abstract doBindHttpEndpoints(app: Express.Application): void;
  protected bindSocketIOHandlers(socket: SocketIO.Socket): void {}
  abstract doBindSocketIOHandlers(socket: SocketIO.Socket): void;
  doSetClientConnection(localUri: string, clientId: string, clientSecret: string): void {
    if (this._client) {
      throw new Error("Cannot reset client.");
    }

    this._client = new Client(localUri, { clientId, clientSecret }, this.logger.child({ component: "TowerCG2Client" }));
  }

  abstract async doInitialize(http: Express.Application): Promise<void>;
  abstract async initialize(http: Express.Application): Promise<void>;
  abstract async cleanup(): Promise<void>;

  protected eventName(eventName: string): string {
    return `${this.name}:${eventName}`;
  }
}

export abstract class ServerPlugin<TConfig extends ServerPluginConfig, TState extends {}> extends ServerPluginBase {
  protected readonly config: TConfig;
  protected readonly store: Store<TState>;

  constructor(
    config: Partial<TConfig>,
    server: Server
  ) {
    super(server);

    fsx.mkdirpSync(this.dataDirectory);

    this.config = lodash.merge({}, this.buildDefaultConfig(), config);
    this.store = buildStore<TState>(
      this.logger,
      this.buildReducer(),
      this.buildDefaultState(),
      this.behaviors.storeJsonReviver,
      this.behaviors.storeJsonReplacer,
      path.resolve(this.dataDirectory, "store.json")
    );

    this.store.subscribe(() => {
      this.logger.debug("Store updated; pushing out.");
      this.server.messageToAuthenticated(`${this.name}:stateUpdated`, this.store.getState());
    });
  }

  get state(): TState {
    return lodash.cloneDeep(this.store.getState());
  }

  protected abstract buildDefaultConfig(): TConfig;
  protected abstract buildDefaultState(): DeepPartial<TState>;
  protected abstract buildReducer(): Reducer<TState, AnyAction>;

  async doInitialize(http: Express.Application) {
    await this.initialize(http);

    this.store.subscribe(() => {
      this.server.messageToAuthenticated(`${this.name}:stateUpdated`, this.store.getState());
    });

    this.client.connect();
  }

  doBindHttpEndpoints(app: Express.Application): void {
    if (this.behaviors.enableFileServing) {
      const fileDirectory = path.resolve(this.dataDirectory, "files");
      this.logger.debug({ fileDirectory }, "Enabling express-static for plugin.");
      app.use("/files", Express.static(fileDirectory));
    }

    app.use("/state", (req, res) => {
      const json = JSON.stringify(this.store.getState(), this.behaviors.storeJsonReplacer || undefined, 2);
      res.send(json);
    });

    this.bindHttpEndpoints(app);
  }

  doBindSocketIOHandlers(socket: SocketIO.Socket): void {
    this.bindSocketIOHandlers(socket);
  }

  // PROBLEM: this method does accept poorly defined events despite its signature!
  // Ideally this method would infer TEventType and TPayload when passed a generic
  // event interface, i.e. `this.emit<TickEvent>(event)`. But it can't. So we need
  // higher-kinded types. (And people say category theory isn't useful.)
  //
  // The current workaround is to create the event and strictly define its type,
  // then pass it in, because you can't create a misnamed event without TypeScript
  // throwing an error.
  //
  // This is issue #1213 in TypeScript.
  protected broadcastEvent<
    TEventType extends string,
    TPayload extends object,
    TEvent extends Message<TEventType, TPayload>
  >(event: TEvent) {
    this.logger.trace({ event }, "Emitting event.");
    this.server.messageToAuthenticated(event.type, event);
  }

  protected handleMessage<
    TMessageType extends string,
    TPayload extends object
  >(
    messageType: TMessageType,
    client: SocketIO.Socket,
    fn: (payload: TPayload, sender: SocketIO.Socket) => Promise<any>
  ): void {
    client.on(messageType, async (message: Message<TMessageType, TPayload>) => {
      const { payload } = message;
      try {
        this.logger.trace({ messageType }, "Message received.");
        await fn(payload, client);
      } catch (error) {
        // as events are fire-and-forget, we do not return an error.
        this.logger.error({ messageType, payload, error }, "Message when handling event.");
      }
    });
  }

  protected handleRequest<
    TRequestType extends string,
    TPayload extends object,
    TData extends object
  >(
    requestType: TRequestType,
    client: SocketIO.Socket,
    fn: (payload: TPayload, sender: SocketIO.Socket) => Promise<TData>
  ): void {
    client.on(requestType, async (request: RequestMessage<TRequestType, TPayload, TData>): Promise<void> => {
      const { requestId, payload } = request;
      const responseName = responseEventName(requestId);

      try {
        this.logger.trace({ requestType, requestId }, "Request received.");
        const data = await fn(payload, client);

        client.emit(responseName, data);
      } catch (error) {
        const errorResponse: Response<TData> = { error: error.message || "No message in error." };
        client.emit(responseName, errorResponse);
      }
    })
  }
}
