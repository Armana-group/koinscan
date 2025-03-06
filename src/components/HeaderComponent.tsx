import styles from "../app/page.module.css";
import { Navbar } from "./Navbar";

interface HeaderComponentProps {
  onChange?: (signer: any) => void;
}

export const HeaderComponent = ({ onChange }: HeaderComponentProps) => {
  return (
    <div className={styles.header}>
      <Navbar />
    </div>
  );
}; 