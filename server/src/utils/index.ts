import SocketIO from "socket.io";

import {
  ClientInfo
} from "@towercg2/client";

export interface Constructor {
  new(...args: any[]): any
}

export function socketToClientInfo(socket: SocketIO.Socket): ClientInfo {
  return {
    clientId: socket.id,
    clientAddress: socket.handshake.address,
    clientConnectedAt: socket.handshake.time
  };
}
