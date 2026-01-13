export type KeyIndex<T> = {
  keys: T[];
  index: Map<T, number>;
};

export const createKeyIndex = <T>(): KeyIndex<T> => {
  return { keys: [], index: new Map() };
};

export const resetKeyIndex = <T>(store: KeyIndex<T>, keys: T[]) => {
  store.keys = keys;
  store.index.clear();
  store.keys.forEach((key, index) => store.index.set(key, index));
};

export const addKey = <T>(store: KeyIndex<T>, key: T) => {
  if (store.index.has(key)) return;
  store.index.set(key, store.keys.length);
  store.keys.push(key);
};

export const removeKey = <T>(store: KeyIndex<T>, key: T) => {
  const idx = store.index.get(key);
  if (idx === undefined) return;
  const lastIdx = store.keys.length - 1;
  const lastKey = store.keys[lastIdx];
  store.keys[idx] = lastKey;
  store.index.set(lastKey, idx);
  store.keys.pop();
  store.index.delete(key);
};
