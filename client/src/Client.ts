import lodash from "lodash";
import SocketIOClient from "socket.io-client";
import { EventEmitter2 } from "eventemitter2";

import { LoggerStub } from "./LoggerStub";
import {
  ProtocolNames,
  MessageEnvelope,
  Event,
  Message,
  RequestMessage,
  Response,

  AuthenticateMessage,
  AuthenticatePayload,
  responseEventName,
  generateResponseId
} from "./Messages";

export interface Credentials extends AuthenticatePayload {}

export class Client {
  readonly socket: SocketIOClient.Socket;
  private readonly events: EventEmitter2 = new EventEmitter2();

  constructor(
    readonly uri: string,
    private readonly credentials: Credentials,
    private readonly logger: LoggerStub = console
  ) {
    this.logger.info({ uri }, "Instantiating TowerCG2 client.");
    this.socket = SocketIOClient(uri, {
      autoConnect: false
    });
  }

  connect() {
    this.logger.info("TowerCG2 client connecting.");

    this.socket.on("connecting", () => this.logger.debug("Connecting."));
    this.socket.on("reconnecting", () => this.logger.debug("Reconnecting."));
    this.socket.on("connect_error", (error: any) => this.logger.error({ error, uri: this.uri }, "Connection error."));
    this.socket.on("error", (error: any) => this.logger.error({ error }, "Runtime error."))

    this.socket.on(ProtocolNames.PLEASE_AUTHENTICATE, () => this.sendAuthentication());
    this.socket.on(ProtocolNames.YOU_ARE_CONNECTED, () => {
      this.logger.info("TowerCG2 client connected!");
    })

    this.socket.on(ProtocolNames.MESSAGE, (envelope: MessageEnvelope) => {
      const { messageName, messageBody } = envelope;
      this.events.emit(messageName, messageBody);
    });

    this.socket.connect();
  }

  handleEvent<
    TEventType extends string,
    TPayload extends object,
    TEvent extends Event<TEventType, TPayload>
  >(
    eventType: TEventType,
    fn: (payload: TPayload) => Promise<any> | any
  ): void {
    this.events.on(eventType, fn);
  }

  sendMessage<
    TMessageType extends string,
    TPayload extends object,
    TMessage extends Message<TMessageType, TPayload>
  >(
    message: TMessage
  ): void {
    this.socket.emit(message.type, message);
  }

  sendRequest<
    TRequestType extends string,
    TPayload extends object,
    TResponseData extends object,
    TMessage extends Message<TRequestType, TPayload>
  >(
    requestMessage: TMessage
  ): Promise<TResponseData> {
    const requestId = generateResponseId();
    const request: RequestMessage<TRequestType, TPayload, TResponseData> = {
      type: requestMessage.type,
      requestId,
      payload: requestMessage.payload
    };

    const responseEvent = responseEventName(requestId);
    return new Promise<TResponseData>((resolve, reject) => {
      this.socket.on(responseEvent, (response: Response<TResponseData>) => {
        this.socket.removeListener(responseEvent);
        if (response.data) {
          resolve(response.data);
        } else {
          reject(response.error);
        }
      });

      this.socket.emit(request.type, {});
    });
  }

  private sendAuthentication() {
    this.logger.debug("Authentication required; sending.");

    const authMsg: AuthenticateMessage = {
      type: ProtocolNames.CLIENT_AUTHENTICATE,
      payload: this.credentials
    };
    this.socket.emit(ProtocolNames.CLIENT_AUTHENTICATE, authMsg);
  }
}
