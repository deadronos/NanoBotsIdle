import { Sky } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

import { RENDERING, SKY } from "../config/rendering";
import GameScene from "./GameScene";
import { useGameStore } from "./store";

function SkyDome() {
  const timeOfDay = useGameStore((state) => state.stats.timeOfDay);
  const angle = timeOfDay * Math.PI * 2;
  const sunPosition: [number, number, number] = [
    Math.cos(angle) * SKY.sunOrbitRadius,
    Math.sin(angle) * SKY.sunHeight,
    Math.sin(angle) * SKY.sunOrbitRadius,
  ];

  return (
    <Sky
      distance={SKY.distance}
      sunPosition={sunPosition}
      turbidity={SKY.turbidity}
      rayleigh={SKY.rayleigh}
      mieCoefficient={SKY.mieCoefficient}
      mieDirectionalG={SKY.mieDirectionalG}
    />
  );
}

export default function GameCanvas() {
  return (
    <Canvas
      className="game-canvas"
      gl={RENDERING.gl}
      dpr={RENDERING.dpr}
      camera={RENDERING.camera}
    >
      <SkyDome />
      <GameScene />
    </Canvas>
  );
}
