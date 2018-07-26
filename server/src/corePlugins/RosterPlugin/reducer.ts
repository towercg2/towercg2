import lodash from "lodash";

import { combineReducers, Reducer, AnyAction } from "redux";

import {
  RosterPluginState, ClientInfo, ClientMap
} from "@towercg2/client";
import { UpdateClientAction } from "./actions";

const clients: Reducer<ClientMap, UpdateClientAction> =
  (state: ClientMap = {}, action: UpdateClientAction) => {
    switch (action.type) {
      case "@@RosterPlugin/UPDATE_CLIENTS":
        return lodash.fromPairs(action.payload.map((c) => [c.clientId, c]));
    }

    return state;
  }

export const reducer: Reducer<RosterPluginState, AnyAction> =
  combineReducers<RosterPluginState>({
    clients
  });
