type CrosshairProps = {
  locked: boolean;
};

export default function Crosshair({ locked }: CrosshairProps) {
  return <div className={`crosshair ${locked ? "locked" : ""}`} />;
}
