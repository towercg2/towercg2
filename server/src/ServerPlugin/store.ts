import Bunyan from "bunyan";
import * as fsx from "fs-extra";
import {
  createStore,
  applyMiddleware,
  Store,

  Reducer,
  DeepPartial,
  AnyAction
} from "redux";

import { JSONReviver, JSONReplacer } from "./Behaviors";

export function buildStore<TState>(
  baseLogger: Bunyan,
  reducer: Reducer<TState>,
  initialState: DeepPartial<TState>,
  jsonReviver: JSONReviver | null,
  jsonReplacer: JSONReplacer | null,
  filename: string
): Store<TState> {
  const logger = baseLogger.child({ component: "Store" });

  let state = initialState;

  if (fsx.pathExistsSync(filename)) {
    logger.debug("Existing state file; rehydrating for store.");
    const text = fsx.readFileSync(filename, { encoding: "UTF8" });
    state = JSON.parse(text, jsonReviver || undefined);
  }

  const store = createStore(reducer, state);

  store.subscribe(() => {
    // TODO: this is potentially slow. Eventually it might make sense to
    //       turn this into an asynchronous save, but writing it properly
    //       for linearizable saves is tricky. This at least guarantees
    //       that writes finish before the next does and won't cause a
    //       write storm from heavy, un-debounced updates.
    logger.trace("Writing to state.");
    const currentState = store.getState();
    const text = JSON.stringify(currentState, jsonReplacer || undefined);
    fsx.writeFileSync(filename, text, { encoding: "UTF8" });
  });

  return store;
}
