import GameCanvas from "../game/GameCanvas";
import Hud from "./components/Hud";

export default function App() {
  return (
    <div className="app">
      <GameCanvas />
      <Hud />
    </div>
  );
}
