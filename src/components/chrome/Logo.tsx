import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="ks-logo" aria-label="KoinScan home">
      <i className="a" />
      <i className="b" />
      <i className="c" />
      <b>KoinScan</b>
    </Link>
  );
}
