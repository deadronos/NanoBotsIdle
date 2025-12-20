type StartOverlayProps = {
  onStart: () => void;
};

export default function StartOverlay({ onStart }: StartOverlayProps) {
  return (
    <div className="overlay start">
      <div className="panel start-panel">
        <div className="title">Enter the Frontier</div>
        <p>WASD move | Space jump | Shift sprint | 1-9 hotbar | E inventory</p>
        <p>Left click breaks blocks | Right click places blocks | Esc unlocks</p>
        <button className="action" onClick={onStart}>
          Start
        </button>
        <div className="hint">
          Tip: You can craft planks, bricks, glass, and torches from the inventory screen.
        </div>
      </div>
    </div>
  );
}
