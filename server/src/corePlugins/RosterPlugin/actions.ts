import {
  Action,

  ActionCreator
} from "redux";

import { ClientInfo } from "@towercg2/client";

export interface UpdateClientAction extends Action {
  type: "@@RosterPlugin/UPDATE_CLIENTS";
  payload: Array<ClientInfo>
};

export const updateClients: ActionCreator<UpdateClientAction> =
  (clients: Array<ClientInfo>) => ({
    type: "@@RosterPlugin/UPDATE_CLIENTS",
    payload: clients
  });

export const clearClients: ActionCreator<UpdateClientAction> =
  () => ({
    type: "@@RosterPlugin/UPDATE_CLIENTS",
    payload: []
  });
