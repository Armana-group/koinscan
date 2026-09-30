import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { connectWallet, disconnectWallet } from "./wallets";

test("WalletConnect reconnect waits until the previous disconnect finishes", async () => {
  const sdk = createRequire(import.meta.url)("@armana/walletconnect-koinos-sdk-js");
  const original = sdk.WebWalletConnectKoinos;
  let finishDisconnect!: () => void;
  const disconnected = new Promise<void>((resolve) => { finishDisconnect = resolve; });
  const events: string[] = [];
  const session = (topic: string, address: string) => ({
    topic,
    namespaces: { koinos: { chains: ["koinos:mainnet"], accounts: [`koinos:mainnet:${address}`] } },
  });
  let sessions = [session("old-session", "old-account")];
  const client = Object.assign(Object.create(original.prototype), {
    topic: "old-session", chainId: "koinos:mainnet", accounts: ["old-account"], options: {},
    web3Modal: {
      async getSessions() { return sessions; },
      async connect() {
        events.push("connect");
        const next = session("new-session", "new-account");
        sessions = [next];
        return next;
      },
      async disconnect() {
        events.push("disconnect started");
        await disconnected;
        sessions = [];
        await client.onSessionDelete({ topic: "old-session" });
        events.push("disconnect finished");
      },
    },
  });
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  // Run the installed SDK's real connect/disconnect methods. Only the modal
  // transport is simulated; SDK 0.1.4 returns before its modal deletion finishes.
  sdk.WebWalletConnectKoinos = function () { return client; };
  try {
    const disconnect = disconnectWallet("walletConnect");
    await new Promise((resolve) => setImmediate(resolve));
    const reconnect = connectWallet("walletConnect");
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(events, ["disconnect started"]);
    finishDisconnect();
    await disconnect;
    assert.equal((await reconnect).address, "new-account");
    assert.deepEqual(events, ["disconnect started", "disconnect finished", "connect"]);
    assert.deepEqual(client.getAccounts(), ["new-account"]);
    assert.equal(client.topic, "new-session");
    assert.equal(client.chainId, "koinos:mainnet");
  } finally {
    finishDisconnect();
    sdk.WebWalletConnectKoinos = original;
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
