import { Message } from "../Messages";
import { ClientInfo } from "../domain";

export const RosterPluginName: "roster" = "roster";
export type ClientMap = { [clientId: string]: ClientInfo };

export interface RosterPluginState {
  clients: ClientMap
}
