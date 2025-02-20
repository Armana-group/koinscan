import styles from "./contractInfo.module.css";

export const ContractInfo = (props: {
  nickname: string;
  address: string;
  description: string;
  image: string;
}) => {
  const defaultImage = "https://upload.wikimedia.org/wikipedia/commons/b/bc/Unknown_person.jpg";
  
  return (
    <div className={styles.contractInfo}>
      <div className={styles.image}>
        <img 
          src={props.image || defaultImage} 
          alt={props.nickname ? `@${props.nickname}` : "Contract"} 
          onError={(e) => {
            e.currentTarget.src = defaultImage;
          }}
        />
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
