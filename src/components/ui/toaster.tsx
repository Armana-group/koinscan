"use client";

import { Toaster as HotToaster } from "react-hot-toast";

export function Toaster() {
  return (
    <HotToaster
      position="bottom-center"
      toastOptions={{
        style: {
          padding: "14px 18px",
          borderRadius: "20px",
          background: "#fff",
          color: "var(--ink)",
          boxShadow: "var(--card-shadow)",
          maxWidth: "420px",
          fontSize: "14px",
          fontWeight: 400,
        },
        success: { iconTheme: { primary: "var(--gold)", secondary: "#fff" } },
        error: { iconTheme: { primary: "var(--bad)", secondary: "#fff" } },
      }}
    />
  );
}
