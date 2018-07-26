import * as React from 'react';

import {
  ClientConsumer,
  ClientProvider,

  RosterContext,
  TickContext
} from "@towercg2/react";

import {
  Client
} from '@towercg2/client';

import {
  Ticks
} from "./Ticks";

const protocol = window.location.protocol;
const hostname = window.location.hostname;
const appPort = 1776;

class App extends React.Component {
  public render() {
    return (
      <ClientProvider localUri={`${protocol}//${hostname}:${appPort}`} clientId="somebody" clientSecret="password">
        <ClientConsumer>
          {
            (client: Client): React.ReactNode =>
                <TickContext.Provider client={client}>
                  <RosterContext.Provider client={client}>
                    <Ticks />
                  </RosterContext.Provider>
                </TickContext.Provider>
          }
        </ClientConsumer>
      </ClientProvider>
    );
  }
}

export default App;
