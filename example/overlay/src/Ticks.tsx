import * as lodash from "lodash";
import * as React from "react";

import {
  TickPluginState
} from "@towercg2/client";
import {
  TickContext
} from "@towercg2/react";

export class Ticks extends React.Component {
  public render() {
    return (
      <TickContext.Consumer>
        {
          (tickState: TickPluginState) =>
            tickState
              ? <div id="TICKS">
                  <ul>
                    {
                      lodash.toPairs(tickState!.ticks).map((tuple, idx) => <li key={idx}>{tuple[0]}: {tuple[1]}</li>)
                    }
                  </ul>
                </div>
              : null
        }
      </TickContext.Consumer>
    );
  }
}
