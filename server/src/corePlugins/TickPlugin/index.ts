import lodash from "lodash";
import { Reducer, DeepPartial, AnyAction } from "redux";

import {
  TickPayload,
  TickEvent,
  TickEventNames,
  TickPluginState,
  TickPluginName
} from "@towercg2/client";

import { ServerPlugin } from "../../ServerPlugin";
import { reducer } from "./reducer";
import { incrementTick } from "./actions";

export interface TickPluginConfig {
  tickers: {
    [name: string]: {
      disabled?: boolean;
      interval: number;
    }
  }
}

export class TickPlugin extends ServerPlugin<TickPluginConfig, TickPluginState> {
  static readonly pluginName: string = TickPluginName;

  readonly DEFAULT_CONFIG: Partial<TickPluginConfig> = {};

  private tickIntervals: { [tickerName: string]: NodeJS.Timer } = {};

  protected buildDefaultConfig(): TickPluginConfig {
    return {
      tickers: {
        default: {
          interval: 1000
        }
      }
    };
  }

  protected buildDefaultState(): DeepPartial<TickPluginState> {
    return {};
  }

  protected buildReducer(): Reducer<TickPluginState, AnyAction> {
    return reducer;
  }

  async initialize(http: Express.Application): Promise<void> {
    for (const [tickerName, tickerConfig] of lodash.toPairs(this.config.tickers)) {
      const tickerInterval = tickerConfig.interval;
      this.logger.debug({ tickerName, tickerInterval }, "Setting ticker.");
      this.tickIntervals[tickerName] = setInterval(() => this._handleTick(tickerName), tickerInterval);
    }

    this.client.handleEvent("tick:elapsed", async (payload: TickPayload) => {
      this.logger.debug("Ponging from own tick.");
    });
  }

  async cleanup(): Promise<void> {
    for (const [tickerName, tickerConfig] of lodash.toPairs(this.config.tickers)) {
      const interval = this.tickIntervals[tickerName];
      clearInterval(interval);
    }
  }

  private _handleTick(tickerName: string) {
    this.logger.debug({ tickerName }, "Tick.");
    this.store.dispatch(incrementTick(tickerName));

    const event: TickEvent = {
      type: TickEventNames.ELAPSED,
      payload: { name: tickerName, value: this.store.getState().ticks[tickerName] }
    }
    this.broadcastEvent(event);
  }
}
