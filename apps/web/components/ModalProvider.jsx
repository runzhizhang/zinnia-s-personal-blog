"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const ModalContext = createContext(null);

function normalizeAlert(options) {
  if (typeof options === "string") return { title: "提示", message: options };
  return { title: options.title ?? "提示", message: options.message ?? "" };
}

function normalizeConfirm(options) {
  if (typeof options === "string") {
    return {
      title: "确认",
      message: options,
      confirmText: "确定",
      cancelText: "取消",
    };
  }
  return {
    title: options.title ?? "确认",
    message: options.message ?? "",
    confirmText: options.confirmText ?? "确定",
    cancelText: options.cancelText ?? "取消",
  };
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error("useModal 必须在 ModalProvider 内使用");
  }
  return ctx;
}

export function ModalProvider({ children }) {
  const [state, setState] = useState(null);

  useEffect(() => {
    if (!state) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [state]);

  useEffect(() => {
    if (!state) return undefined;
    function onKey(e) {
      if (e.key === "Escape") {
        if (state.kind === "confirm") state.onCancel();
        else state.onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  const alert = useCallback((options) => {
    const { title, message } = normalizeAlert(options);
    return new Promise((resolve) => {
      setState({
        kind: "alert",
        title,
        message,
        onClose: () => {
          setState(null);
          resolve();
        },
      });
    });
  }, []);

  const confirm = useCallback((options) => {
    const { title, message, confirmText, cancelText } = normalizeConfirm(options);
    return new Promise((resolve) => {
      setState({
        kind: "confirm",
        title,
        message,
        confirmText,
        cancelText,
        onConfirm: () => {
          setState(null);
          resolve(true);
        },
        onCancel: () => {
          setState(null);
          resolve(false);
        },
      });
    });
  }, []);

  return (
    <ModalContext.Provider value={{ alert, confirm }}>
      {children}
      {state ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() =>
            state.kind === "confirm" ? state.onCancel() : state.onClose()
          }
        >
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-modal-title"
            data-testid="app-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="app-modal-title" className="modal-title">
              {state.title}
            </h2>
            <div className="modal-body" data-testid="modal-body">
              {state.message}
            </div>
            <div className="modal-actions">
              {state.kind === "confirm" ? (
                <>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={state.onCancel}
                  >
                    {state.cancelText}
                  </button>
                  <button type="button" onClick={state.onConfirm}>
                    {state.confirmText}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  data-testid="modal-ok"
                  onClick={state.onClose}
                >
                  确定
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </ModalContext.Provider>
  );
}
