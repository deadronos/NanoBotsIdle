import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import type { FC } from "react";

import { useConfig } from "../config/useConfig";

// Selective bloom: materials opt in by using colors above 1.0 with
// toneMapped={false} (lasers, outpost cores, beacons, deposit flashes).
// The composer renders to an HDR buffer, which skips the renderer's own tone
// mapping, so ACES is reapplied as the final effect.
export const PostEffects: FC = () => {
  const { bloom } = useConfig().render;
  if (!bloom.enabled) return null;

  return (
    <EffectComposer multisampling={4}>
      <Bloom
        mipmapBlur
        intensity={bloom.intensity}
        luminanceThreshold={bloom.luminanceThreshold}
        luminanceSmoothing={bloom.luminanceSmoothing}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
};
