import * as React from "react";

import {
  Client
} from "@towercg2/client";

export type ClientProviderProps = {
  localUri: string;
  clientId: string;
  clientSecret: string;
  children?: React.ReactNode;
}

export type ClientProviderState = {
  client: Client | null;
  connected: boolean;
}

const clientContext: React.Context<Client | null> = React.createContext<Client | null>(null);
export const ClientConsumer = clientContext.Consumer;

export class ClientProvider extends React.Component<ClientProviderProps, ClientProviderState> {
  constructor(props: ClientProviderProps) {
    super(props);

    this.state = { client: null, connected: false };
  }

  componentWillMount() {
    const { localUri, clientId, clientSecret } = this.props;
    const client = new Client(localUri, { clientId, clientSecret });
    client.socket.on("connect", () => this.setState({ connected: true }));
    client.socket.on("reconnect", () => this.setState({ connected: true }));
    client.socket.on("disconnect", () => this.setState({ connected: false }));

    this.setState({
      client,
      connected: false
    });

    client.connect();
  }

  render() {
    const { client, connected } = this.state;

    return (
      <clientContext.Provider value={ connected && client ? client : null}>
        {this.props.children}
      </clientContext.Provider>
    );
  }
}
