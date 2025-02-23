import { useRouter } from "next/navigation";
import styles from "../app/page.module.css";

export function Logo() {
  const router = useRouter();

  return (
    <div
      className={styles.titleHeader}
      onClick={() => {
        router.push("/");
      }}
    >
      <div className={styles.headerColor1}></div>
      <div className={styles.headerColor2}></div>
      <div className={styles.headerColor3}></div>
    </div>
  );
} 