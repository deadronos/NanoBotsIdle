export type KeyIndex = {
  keys: string[];
  index: Map<string, number>;
};

export const createKeyIndex = (): KeyIndex => {
  return { keys: [], index: new Map() };
};

export const resetKeyIndex = (store: KeyIndex, keys: string[]) => {
  store.keys = keys;
  store.index.clear();
  store.keys.forEach((key, index) => store.index.set(key, index));
};

export const addKey = (store: KeyIndex, key: string) => {
  if (store.index.has(key)) return;
  store.index.set(key, store.keys.length);
  store.keys.push(key);
};

export const removeKey = (store: KeyIndex, key: string) => {
  const idx = store.index.get(key);
  if (idx === undefined) return;
  const lastIdx = store.keys.length - 1;
  const lastKey = store.keys[lastIdx];
  store.keys[idx] = lastKey;
  store.index.set(lastKey, idx);
  store.keys.pop();
  store.index.delete(key);
};
