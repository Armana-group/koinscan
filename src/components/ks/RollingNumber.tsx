/** A number whose digits roll to their new value. Each digit column is as wide as its widest digit, so the text never shifts sideways. */
export function RollingNumber({ value }: { value: string }) {
  const chars = [...value];
  return (
    <span className="ks-roll">
      <span className="sr-only">{value}</span>
      {chars.map((ch, index) => {
        // Keyed from the right so the ones digit keeps its column when the number grows a digit.
        const key = chars.length - index;
        if (!/\d/.test(ch)) {
          return (
            <span key={key} aria-hidden>
              {ch}
            </span>
          );
        }
        return (
          <span key={key} className="ks-roll-d" aria-hidden>
            <span style={{ transform: `translateY(-${Number(ch) * 10}%)` }}>
              {"0123456789".split("").map((digit) => (
                <span key={digit}>{digit}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
