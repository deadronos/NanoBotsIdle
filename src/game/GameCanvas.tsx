import { Canvas } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import GameScene from "./GameScene";
import { useGameStore } from "./store";

function SkyDome() {
  const timeOfDay = useGameStore((state) => state.stats.timeOfDay);
  const angle = timeOfDay * Math.PI * 2;
  const sunPosition: [number, number, number] = [
    Math.cos(angle) * 90,
    Math.sin(angle) * 120,
    Math.sin(angle) * 90
  ];

  return (
    <Sky
      distance={450000}
      sunPosition={sunPosition}
      turbidity={7}
      rayleigh={1.2}
      mieCoefficient={0.004}
      mieDirectionalG={0.82}
    />
  );
}

export default function GameCanvas() {
  return (
    <Canvas
      className="game-canvas"
      gl={{ antialias: false, powerPreference: "high-performance" }}
      dpr={[1, 2]}
      camera={{ fov: 75, near: 0.05, far: 900, position: [8, 24, 8] }}
    >
      <SkyDome />
      <GameScene />
    </Canvas>
  );
}
