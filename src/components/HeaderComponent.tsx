import { useState } from "react";
import { Button, Dropdown, notification } from "antd";
import Image from "next/image";
import { SignerInterface } from "koilib";
import styles from "../app/page.module.css";
import {
  WalletName,
  connectWallet,
  disconnectWallet,
  getWalletSigner,
} from "../koinos/wallets";
import kondorLogo from "./images/kondor-logo.png";
import walletConnectLogo from "./images/wallet-connect-logo.png";
import mkwLogo from "./images/mkw-logo.png";

function shortAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(address.length - 4)}`;
}

export const HeaderComponent = (props: {
  onChange?: (signer: SignerInterface | undefined) => void;
}) => {
  const [addr, setAddr] = useState<string>("");
  const [walletName, setWalletName] = useState<WalletName | undefined>(
    undefined,
  );
  return (
    <nav className={styles.nav}>
      <div className={styles.titleHeader}>
        <div className={styles.headerColor1}></div>
        <div className={styles.headerColor2}></div>
        <div className={styles.headerColor3}></div>
        <h1>Koinos Contract</h1>
      </div>
      <Dropdown
        menu={{
          items: [
            {
              label: (
                <div className={styles.walletItem}>
                  <Image
                    className={styles.r1}
                    src={kondorLogo}
                    alt="kondor"
                    height={40}
                  ></Image>{" "}
                  Kondor
                </div>
              ),
              key: "kondor",
            },
            {
              label: (
                <div className={styles.walletItem}>
                  <Image
                    className={styles.r1}
                    src={walletConnectLogo}
                    alt="wallet-connect"
                    height={40}
                  ></Image>{" "}
                  Wallet Connect
                </div>
              ),
              key: "walletConnect",
            },
            {
              label: (
                <div className={styles.walletItem}>
                  <Image
                    className={styles.r1}
                    src={mkwLogo}
                    alt="my-koinos-wallet"
                    height={40}
                  ></Image>{" "}
                  My Koinos Wallet
                </div>
              ),
              key: "mkw",
            },
            {
              label: "Disconnect",
              key: "disconnect",
              disabled: !walletName,
            },
          ],
          onClick: async (e: { key: string }) => {
            try {
              if (e.key === "disconnect") {
                if (walletName) {
                  await disconnectWallet(walletName);
                  setWalletName(undefined);
                }
                setAddr("");
                if (props.onChange) props.onChange(undefined);
                return;
              }
              const wName = e.key as WalletName;
              const address = await connectWallet(wName);
              const signer = getWalletSigner(wName, address);

              setAddr(shortAddress(address));
              setWalletName(wName);
              if (props.onChange) props.onChange(signer);
            } catch (error) {
              notification.error({
                message: (error as Error).message,
              });
              console.error(error);
            }
          },
        }}
      >
        <Button type="primary">
          {addr ? (
            <div className={styles.walletItem}>
              <div className={styles.imageContainer}>
                <Image
                  src={
                    walletName === "kondor"
                      ? kondorLogo
                      : walletName === "walletConnect"
                        ? walletConnectLogo
                        : mkwLogo
                  }
                  alt="wallet"
                  height={15}
                ></Image>
              </div>{" "}
              {addr}
            </div>
          ) : (
            "Connect Wallet"
          )}
        </Button>
      </Dropdown>
    </nav>
  );
};
