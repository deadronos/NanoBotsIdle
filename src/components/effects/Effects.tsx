import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import React from "react";

export const Effects: React.FC = () => {
  return (
    <EffectComposer enableNormalPass={false}>
      <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} intensity={1.5} />
      <Vignette eskil={false} offset={0.1} darkness={0.5} />
    </EffectComposer>
  );
};
