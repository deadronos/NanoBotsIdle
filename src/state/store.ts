import { create } from "zustand";
import type { StateCreator } from "zustand";

import { createMetaSlice } from "./metaSlice";
import { createRunSlice } from "./runSlice";
import type { GameState } from "./types";

const initializer: StateCreator<GameState> = (set, get, api) => ({
  ...createMetaSlice(set, get, api),
  ...createRunSlice(set, get, api),
});

export const useGameStore = create<GameState>()(initializer);

export type { GameState, MetaSlice, RunSlice, UISnapshot, Phase } from "./types";
