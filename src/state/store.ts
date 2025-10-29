import { create } from "zustand";
import { createMetaSlice, MetaSlice } from "./metaSlice";
import { createRunSlice, RunSlice } from "./runSlice";

export type GameState = RunSlice & MetaSlice;

export const useGameStore = create<GameState>()((...a) => ({
  ...createMetaSlice(...a),
  ...createRunSlice(...a),
}));
