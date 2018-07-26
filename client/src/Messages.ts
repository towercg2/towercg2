import uuidV4 from "uuid/v4";

import { ClientInfo } from "./domain";

export const ProtocolNames =
  new (class {
    PLEASE_AUTHENTICATE: "direct:pleaseAuthenticate" = "direct:pleaseAuthenticate";
    CLIENT_AUTHENTICATE: "client:authenticate" = "client:authenticate";
    YOU_ARE_CONNECTED: "direct:youAreConnected" = "direct:youAreConnected";
    MESSAGE: "!!:message" = "!!:message";
    NEW_CLIENT_CONNECTED: "global:newClientConnected" = "global:newClientConnected";
    STATE_UPDATED: "global:stateUpdated" = "global:stateUpdated";
  })();

export interface MessageEnvelope {
  messageName: string;
  messageBody: {};
}

export interface Event<TType extends string, TPayload extends object> {
  type: TType;
  payload: TPayload;
}

export interface Message<TType extends string, TPayload extends object> {
  type: TType;
  payload: TPayload;
}

export interface RequestMessage<TType extends string, TPayload extends object, TData extends object> extends Message<TType, TPayload> {
  requestId: string;
}

export type Response<TData extends object> = {
  data?: TData;
  error?: string;
};

export interface AuthenticatePayload {
  clientId: string;
  clientSecret: string;
}
export interface AuthenticateMessage extends Message<"client:authenticate", AuthenticatePayload> {}

export interface ClientConnectedPayload extends ClientInfo {}
export interface ClientConnectedEvent extends Event<"global:newClientConnected", ClientConnectedPayload> {}

export interface StateUpdatedPayload {
  pluginName: string;
  newState: object;
}
export interface StateUpdatedEvent extends Event<"global:stateUpdated", StateUpdatedPayload> {}

export function generateResponseId(): string {
  return uuidV4();
}

export function responseEventName(id: string) {
  return `!response:${id}`;
}
