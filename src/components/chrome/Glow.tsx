/** Two soft colour fields drifting behind every page; the home page adds a third. */
export function Glow({ home = false }: { home?: boolean }) {
  const extra = home ? " home" : "";
  return (
    <>
      <div className={`ks-glow ks-g1${extra}`} aria-hidden="true" />
      <div className={`ks-glow ks-g2${extra}`} aria-hidden="true" />
      {home && <div className="ks-glow ks-g3 home" aria-hidden="true" />}
    </>
  );
}
