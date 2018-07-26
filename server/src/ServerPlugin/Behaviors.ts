export type ReduxStorageDecoratorFilterKeys = string | Array<String>
export type StorageKeysArg = Array<ReduxStorageDecoratorFilterKeys>;

export type JSONReviver = (key: any, value: any) => any;
export type JSONReplacer = (key: any, value: any) => any;

export interface Behaviors {
  enableFileServing: boolean;

  storeJsonReviver: JSONReviver | null;
  storeJsonReplacer: JSONReplacer | null;
}
