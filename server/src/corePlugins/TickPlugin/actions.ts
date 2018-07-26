import {
  Action,
  AnyAction,

  ActionCreator
} from "redux";

export interface IncrementTickAction extends Action {
  type: "@@TickPlugin/INCREMENT_TICK";
  payload: {
    tickerName: string;
  };
};

export const incrementTick: ActionCreator<IncrementTickAction> =
  (tickerName: string) => ({
    type: "@@TickPlugin/INCREMENT_TICK",
    payload: {
      tickerName
    }
  });
