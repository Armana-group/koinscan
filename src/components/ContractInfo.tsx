import styles from "./contractInfo.module.css";

export const ContractInfo = (props: {
  nickname: string;
  address: string;
  description: string;
  image: string;
}) => {
  return (
    <div className={styles.contractInfo}>
      <div className={styles.image}>
        <img src={props.image} alt="" />
      </div>
      <div className={styles.description}>
        <h2 className={styles.h2Wrap}>
          {props.nickname ? `@${props.nickname}` : "Koinos address"}
        </h2>
        <p>{props.address ? props.address : "loading..."}</p>
        <p>{props.description}</p>
      </div>
    </div>
  );
};
