import Express from "express";
import { DeepPartial, AnyAction, Reducer } from "redux";

import {
  RosterPluginState,
  RosterPluginName,
  ProtocolNames
} from "@towercg2/client";

import { ServerPlugin } from "../../ServerPlugin";
import { reducer } from "./reducer";
import { socketToClientInfo } from "../../utils";
import { updateClients } from "./actions";

export interface RosterPluginConfig {}

export class RosterPlugin extends ServerPlugin<RosterPluginConfig, RosterPluginState> {
  static readonly pluginName: string = RosterPluginName

  private interval!: NodeJS.Timer;

  protected buildDefaultConfig(): RosterPluginConfig {
    return {};
  }

  protected buildDefaultState(): DeepPartial<RosterPluginState> {
    return {};
  }

  protected buildReducer(): Reducer<RosterPluginState, AnyAction> {
    return reducer;
  }

  async initialize(http: Express.Application): Promise<void> {
    this.interval = setInterval(() => this.updateRoster(), 250);
    this.client.handleEvent(ProtocolNames.NEW_CLIENT_CONNECTED, () => this.updateRoster());
  }
  async cleanup(): Promise<void> {
    clearInterval(this.interval);
  }

  private updateRoster() {
    const sockets = this.server.authenticatedSockets;
    const clients = sockets.map((s) => socketToClientInfo(s));

    this.store.dispatch(updateClients(clients));
  }
}
