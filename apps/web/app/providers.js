"use client";

import { ModalProvider } from "../components/ModalProvider";

export function Providers({ children }) {
  return <ModalProvider>{children}</ModalProvider>;
}
