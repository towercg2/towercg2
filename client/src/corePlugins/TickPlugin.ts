import { Message } from "../Messages";

export const TickPluginName: "tick" = "tick";

export type TickElapsedName = "tick:elapsed";

export const TickEventNames =
  new class {
    ELAPSED: TickElapsedName = `tick:elapsed`;
  }();

export interface TickPayload {
  name: string;
  value: number;
}

export interface TickEvent extends Message<TickElapsedName, TickPayload> {}

export interface TickerState {
  [name: string]: number;
}

export interface TickPluginState {
  ticks: TickerState
}
