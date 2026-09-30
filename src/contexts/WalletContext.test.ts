import assert from "node:assert/strict";
import { test } from "node:test";
import { act, createElement, useLayoutEffect } from "react";
import { JSDOM } from "jsdom";

import { WalletProvider, useWallet } from "./WalletContext";
import {
  disconnectWallet,
  KONDOR_ACCOUNTS_KEY,
  CHOSEN_ADDRESS_KEY,
  type KondorAccount,
} from "../koinos/wallets";

const alice = { name: "Alice", address: "1GGxRhLN7Ek54xycG5XaZBE4bCgwV2xtvk" };
const bob = { name: "Bob", address: "1FiBcmCus5N2bWv2RHwyiA1YRVVSE8uPqF" };
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 20));

async function mountWallet(restored = false) {
  const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "http://localhost" });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [name, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    localStorage: dom.window.localStorage,
    navigator: dom.window.navigator,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  if (restored) {
    localStorage.setItem(KONDOR_ACCOUNTS_KEY, JSON.stringify([alice, bob]));
    localStorage.setItem(CHOSEN_ADDRESS_KEY, alice.address);
  }

  let wallet!: ReturnType<typeof useWallet>;
  let accountsReply: () => Promise<KondorAccount[]> = async () => [alice, bob];
  // Simulate only the extension transport. The SDK, provider, state and storage are real.
  dom.window.addEventListener("message", async (event) => {
    if (event.data?.command !== "getAccounts") return;
    const accounts = await accountsReply();
    dom.window.postMessage({ id: event.data.id, result: accounts }, "*");
  });
  function Consumer() {
    const context = useWallet();
    useLayoutEffect(() => { wallet = context; }, [context]);
    return createElement("output", null, context.signer?.getAddress() ?? "disconnected");
  }
  const { createRoot } = await import("react-dom/client");
  const root = createRoot(dom.window.document.getElementById("root")!);
  await act(async () => root.render(createElement(WalletProvider, null, createElement(Consumer))));

  return {
    get wallet() { return wallet; },
    get displayedAddress() { return dom.window.document.querySelector("output")?.textContent; },
    setReply(reply: () => Promise<KondorAccount[]>) { accountsReply = reply; },
    async refresh() {
      await act(async () => {
        dom.window.dispatchEvent(new dom.window.Event("kondor_accountsChanged"));
        await settle();
      });
    },
    async close() {
      await act(async () => root.unmount());
      dom.window.close();
      for (const [name, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else Reflect.deleteProperty(globalThis, name);
      }
    },
  };
}

test("connecting Kondor updates the shared account list without a reload", async () => {
  const app = await mountWallet();
  try {
    await act(async () => {
      await app.wallet.connect("kondor");
    });
    assert.deepEqual(app.wallet.kondorAccounts, [alice, bob]);
    assert.equal(app.wallet.savedAddress, null);
    assert.equal(app.displayedAddress, "disconnected");
    await act(async () => app.wallet.chooseKondorAccount(bob));
    assert.equal(app.displayedAddress, bob.address);
    assert.equal(localStorage.getItem(CHOSEN_ADDRESS_KEY), bob.address);
  } finally { await app.close(); }
});

test("Forget then reconnect offers shared accounts without silently restoring the old one", async () => {
  const app = await mountWallet(true);
  try {
    await act(async () => app.wallet.forgetAddress());
    await act(async () => { assert.equal(await app.wallet.connect("kondor"), "choose-account"); });
    assert.equal(app.displayedAddress, "disconnected");
    assert.equal(app.wallet.savedAddress, null);
    assert.equal(localStorage.getItem(CHOSEN_ADDRESS_KEY), null);
    assert.equal(localStorage.getItem(KONDOR_ACCOUNTS_KEY), null);
    assert.deepEqual(app.wallet.kondorAccounts, [alice, bob]);
    await act(async () => app.wallet.chooseKondorAccount(bob));
    assert.equal(app.displayedAddress, bob.address);
    assert.equal(localStorage.getItem(CHOSEN_ADDRESS_KEY), bob.address);
    assert.deepEqual(JSON.parse(localStorage.getItem(KONDOR_ACCOUNTS_KEY)!), [alice, bob]);
  } finally { await app.close(); }
});

test("a single shared account also needs an explicit choice after Forget", async () => {
  const app = await mountWallet(true);
  try {
    await act(async () => app.wallet.forgetAddress());
    app.setReply(async () => [alice]);
    await act(async () => { await app.wallet.connect("kondor"); });
    assert.equal(app.displayedAddress, "disconnected");
    assert.deepEqual(app.wallet.kondorAccounts, [alice]);
    await act(async () => app.wallet.chooseKondorAccount(alice));
    assert.equal(app.displayedAddress, alice.address);
  } finally { await app.close(); }
});

test("Disconnect then reconnect preserves an explicitly remembered account", async () => {
  const app = await mountWallet(true);
  try {
    await act(async () => app.wallet.chooseKondorAccount(bob));
    await act(async () => app.wallet.setSigner(undefined));
    await act(async () => { assert.equal(await app.wallet.connect("kondor"), "connected"); });
    assert.equal(app.displayedAddress, bob.address);
  } finally { await app.close(); }
});

test("a delayed account picker cannot undo disconnect", async () => {
  const app = await mountWallet(true);
  try {
    let reply!: (accounts: KondorAccount[]) => void;
    app.setReply(() => new Promise((resolve) => { reply = resolve; }));
    let pending!: ReturnType<typeof app.wallet.pickDifferentKondorAccount>;
    await act(async () => { pending = app.wallet.pickDifferentKondorAccount(); await settle(); });
    await act(async () => app.wallet.setSigner(undefined));
    await act(async () => { reply([bob]); await pending; });
    assert.equal(app.displayedAddress, "disconnected");
    assert.equal(localStorage.getItem(KONDOR_ACCOUNTS_KEY), null);
    assert.equal(localStorage.getItem(CHOSEN_ADDRESS_KEY), alice.address);
  } finally { await app.close(); }
});

test("a delayed connection cannot undo Forget Address or restore its storage", async () => {
  const app = await mountWallet(true);
  try {
    await act(async () => app.wallet.setSigner(undefined));
    let reply!: (accounts: KondorAccount[]) => void;
    app.setReply(() => new Promise((resolve) => { reply = resolve; }));
    let pending!: ReturnType<typeof app.wallet.connect>;
    await act(async () => { pending = app.wallet.connect("kondor"); await settle(); });
    await act(async () => app.wallet.forgetAddress());
    await act(async () => { reply([alice, bob]); assert.equal(await pending, "cancelled"); });
    assert.equal(app.displayedAddress, "disconnected");
    assert.equal(app.wallet.savedAddress, null);
    assert.equal(localStorage.getItem(KONDOR_ACCOUNTS_KEY), null);
    assert.equal(localStorage.getItem(CHOSEN_ADDRESS_KEY), null);
  } finally { await app.close(); }
});

test("the picker switches when Kondor shares only a different known account", async () => {
  const app = await mountWallet(true);
  try {
    app.setReply(async () => [bob]);
    await act(async () => { await app.wallet.pickDifferentKondorAccount(); });
    assert.equal(app.displayedAddress, bob.address);
    assert.deepEqual(app.wallet.kondorAccounts, [bob]);
    assert.equal(app.wallet.savedAddress, bob.address);
  } finally { await app.close(); }
});

test("background account events do not cancel an explicit account picker", async () => {
  const app = await mountWallet(true);
  try {
    let reply!: (accounts: KondorAccount[]) => void;
    app.setReply(() => new Promise((resolve) => { reply = resolve; }));
    let pending!: ReturnType<typeof app.wallet.pickDifferentKondorAccount>;
    await act(async () => { pending = app.wallet.pickDifferentKondorAccount(); await settle(); });
    app.setReply(async () => [alice, bob]);
    await app.refresh();
    await act(async () => { reply([bob]); await pending; });
    assert.equal(app.displayedAddress, bob.address);
    assert.deepEqual(app.wallet.kondorAccounts, [bob]);
  } finally { await app.close(); }
});

test("a pending Kondor refresh cannot reconnect a disconnected wallet", async () => {
  const app = await mountWallet(true);
  try {
    let reply!: (accounts: KondorAccount[]) => void;
    app.setReply(() => new Promise((resolve) => { reply = resolve; }));
    await app.refresh();
    await act(async () => {
      await disconnectWallet("kondor");
      app.wallet.setSigner(undefined);
    });
    await act(async () => { reply([alice, bob]); await settle(); });
    assert.equal(app.displayedAddress, "disconnected");
    assert.equal(app.wallet.signer, undefined);
    assert.deepEqual(app.wallet.kondorAccounts, []);
    assert.equal(localStorage.getItem(KONDOR_ACCOUNTS_KEY), null);
  } finally { await app.close(); }
});

test("a disconnected wallet ignores later Kondor account-change events", async () => {
  const app = await mountWallet(true);
  try {
    await act(async () => {
      await disconnectWallet("kondor");
      app.wallet.setSigner(undefined);
    });
    await app.refresh();
    assert.equal(app.displayedAddress, "disconnected");
    assert.equal(localStorage.getItem(KONDOR_ACCOUNTS_KEY), null);
  } finally { await app.close(); }
});

test("an old refresh cannot replace a newly selected Kondor account", async () => {
  const app = await mountWallet(true);
  try {
    let reply!: (accounts: KondorAccount[]) => void;
    app.setReply(() => new Promise((resolve) => { reply = resolve; }));
    await app.refresh();
    await act(async () => app.wallet.chooseKondorAccount(bob));
    await act(async () => { reply([alice]); await settle(); });
    assert.equal(app.displayedAddress, bob.address);
    assert.equal(app.wallet.savedAddress, bob.address);
    assert.equal(localStorage.getItem(CHOSEN_ADDRESS_KEY), bob.address);
  } finally { await app.close(); }
});

test("an account refreshed by Kondor uses the current provider and saved identity", async () => {
  const app = await mountWallet(true);
  try {
    app.setReply(async () => [bob]);
    await app.refresh();
    assert.equal(app.displayedAddress, bob.address);
    assert.equal(app.wallet.savedAddress, bob.address);
    assert.equal(app.wallet.signer?.provider, app.wallet.provider);
    assert.equal(localStorage.getItem(CHOSEN_ADDRESS_KEY), bob.address);
  } finally { await app.close(); }
});
