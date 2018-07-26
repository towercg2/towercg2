import lodash from "lodash";

import { combineReducers, Reducer, AnyAction } from "redux";

import {
  TickerState,
  TickPluginState
} from "@towercg2/client";
import { IncrementTickAction } from "./actions";

const ticks: Reducer<TickerState, IncrementTickAction> =
  (state: TickerState = {}, action: IncrementTickAction) => {
    switch (action.type) {
      case "@@TickPlugin/INCREMENT_TICK":
        const { tickerName } = action.payload;
        const v = state[tickerName] || 0;
        return lodash.merge({}, state, { [tickerName]: v + 1 });
    }

    return state;
  }

export const reducer: Reducer<TickPluginState, AnyAction> =
  combineReducers<TickPluginState>({
    ticks
  });
