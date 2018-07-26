import * as React from "react";

import {
  Client,

  RosterPluginState,
  TickPluginState
} from "@towercg2/client";

export interface PluginStateProviderProps {
  client: Client;
}

export interface PluginStateProviderState<TPluginState extends object> {
  pluginState: TPluginState | null;
}

export type PluginStateContextProviderClass<TPluginState extends object> =
  { new(props: any): React.Component<PluginStateProviderProps, PluginStateProviderState<TPluginState>> };
export type PluginStateContextConsumer<TPluginState extends object> =
  React.Consumer<TPluginState | null>;

export interface PluginStateContext<TPluginState extends object> {
  Provider: PluginStateContextProviderClass<TPluginState>,
  Consumer: PluginStateContextConsumer<TPluginState>
}

export function buildPluginStateProvider<
  TPluginState extends object
>(
  pluginName: string
): PluginStateContext<TPluginState> {
  const context = React.createContext<TPluginState | null>(null);
  const Consumer = context.Consumer;

  const Provider =
    class extends React.Component<PluginStateProviderProps, PluginStateProviderState<TPluginState>> {
      constructor(props: PluginStateProviderProps) {
        super(props);

        this.state = { pluginState: null };
      }

      componentWillMount() {
        const { client } = this.props;

        if (client) {
          this.attachEventToClient(client);
        }
      }

      componentWillReceiveProps(nextProps: PluginStateProviderProps) {
        const { client } = nextProps;

        if (client) {
          this.attachEventToClient(client);
        }
      }

      render() {
        return (
          <context.Provider value={this.state.pluginState}>
            {this.props.children}
          </context.Provider>
        );
      }

      private attachEventToClient(client: Client) {
        client.handleEvent(`${pluginName}:stateUpdated`, (pluginState: TPluginState) => {
          this.setState({ pluginState });
          this.forceUpdate();
        });
      }
    }

  return {
    Provider,
    Consumer
  };
}

export const TickContext = buildPluginStateProvider<TickPluginState>("tick");
export const RosterContext = buildPluginStateProvider<RosterPluginState>("roster");

