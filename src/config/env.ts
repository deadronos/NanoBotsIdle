type EnvConfig = Record<string, Record<string, string | number>>;

export const parseEnvToConfig = (env: Record<string, string | undefined>): EnvConfig => {
  const partial: EnvConfig = {};
  Object.entries(env).forEach(([k, v]) => {
    if (!v) return;
    // support keys like VITE_TERRAIN_BASE_SEED or VITE_PLAYER_PLAYERHEIGHT
    if (!k.startsWith("VITE_")) return;
    const key = k.slice(5); // drop VITE_
    const parts = key.split("_").map((p) => p.toLowerCase());
    if (parts.length < 2) return; // need at least category and property
    const category = parts.shift()!; // terrain, player, etc.
    const leaf = parts.join("_"); // e.g., base_seed or surface_bias
    const camelLeaf = leaf.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (!partial[category]) partial[category] = {};
    const num = Number(v);
    partial[category][camelLeaf] = Number.isNaN(num) ? v : num;
  });
  return partial;
};

export const parseImportMetaEnv = (importMetaEnv: Record<string, string | undefined>) =>
  parseEnvToConfig(importMetaEnv);

export default parseEnvToConfig;
