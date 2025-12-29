import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type StartOverlayProps = {
  onStart: () => void;
};

export default function StartOverlay({ onStart }: StartOverlayProps) {
  return (
    <div className="overlay start">
      <Card className="w-[min(520px,90vw)] border-white/10 bg-[var(--panel)] text-center">
        <CardHeader className="space-y-3">
          <CardTitle className="font-display text-lg uppercase tracking-[0.18em]">
            Enter the Frontier
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            WASD move | Space jump | Shift sprint | 1-9 hotbar | E inventory
          </p>
          <p className="text-xs text-muted-foreground">
            Left click breaks blocks | Right click places blocks | Esc unlocks
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button size="lg" onClick={onStart}>
            Start
          </Button>
          <div className="text-xs text-muted-foreground">
            Tip: You can craft planks, bricks, glass, and torches from the inventory screen.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
