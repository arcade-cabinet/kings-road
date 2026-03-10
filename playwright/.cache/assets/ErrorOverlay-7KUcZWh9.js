import { j as jsxRuntimeExports } from './jsx-runtime-CLliEFxU.js';
import './index-BAe1oPKr.js';

function ErrorOverlay({
  error,
  componentStack,
  source
}) {
  const errorObj = typeof error === "string" ? new Error(error) : error;
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      id: "error-overlay",
      role: "alert",
      "aria-live": "assertive",
      "data-testid": "error-overlay",
      "data-error-name": errorObj.name,
      "data-error-message": errorObj.message,
      "data-error-source": source ?? "unknown",
      "data-error-timestamp": timestamp,
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(20, 10, 5, 0.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        fontFamily: "monospace",
        color: "#f5f0e8",
        padding: "24px"
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          "data-testid": "error-overlay-content",
          style: {
            background: "#1a1210",
            border: "2px solid #d94040",
            borderRadius: "4px",
            padding: "32px",
            maxWidth: "800px",
            width: "100%",
            maxHeight: "90vh",
            overflow: "auto"
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "h1",
              {
                id: "error-overlay-title",
                "data-testid": "error-title",
                style: {
                  color: "#ff6b6b",
                  fontSize: "20px",
                  margin: "0 0 8px 0",
                  fontFamily: "monospace",
                  fontWeight: 700
                },
                children: [
                  errorObj.name,
                  ": ",
                  errorObj.message
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "p",
              {
                id: "error-overlay-meta",
                "data-testid": "error-meta",
                style: {
                  color: "#888",
                  fontSize: "12px",
                  margin: "0 0 24px 0"
                },
                children: [
                  "Source: ",
                  source ?? "unknown",
                  " | ",
                  timestamp
                ]
              }
            ),
            errorObj.stack && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: "16px" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "h2",
                {
                  style: {
                    color: "#d4a040",
                    fontSize: "14px",
                    margin: "0 0 8px 0",
                    textTransform: "uppercase",
                    letterSpacing: "1px"
                  },
                  children: "Stack Trace"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "pre",
                {
                  id: "error-overlay-stack",
                  "data-testid": "error-stack",
                  style: {
                    background: "#0d0a08",
                    padding: "16px",
                    fontSize: "12px",
                    lineHeight: "1.6",
                    overflow: "auto",
                    maxHeight: "300px",
                    color: "#e0d0c0",
                    border: "1px solid #333",
                    borderRadius: "2px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    userSelect: "text",
                    cursor: "text"
                  },
                  children: errorObj.stack
                }
              )
            ] }),
            componentStack && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: "16px" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "h2",
                {
                  style: {
                    color: "#d4a040",
                    fontSize: "14px",
                    margin: "0 0 8px 0",
                    textTransform: "uppercase",
                    letterSpacing: "1px"
                  },
                  children: "Component Stack"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "pre",
                {
                  id: "error-overlay-component-stack",
                  "data-testid": "error-component-stack",
                  style: {
                    background: "#0d0a08",
                    padding: "16px",
                    fontSize: "12px",
                    lineHeight: "1.6",
                    overflow: "auto",
                    maxHeight: "200px",
                    color: "#e0d0c0",
                    border: "1px solid #333",
                    borderRadius: "2px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    userSelect: "text",
                    cursor: "text"
                  },
                  children: componentStack
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: "12px", marginTop: "24px" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  "data-testid": "error-reload-button",
                  onClick: () => window.location.reload(),
                  style: {
                    padding: "10px 20px",
                    background: "#d94040",
                    border: "none",
                    borderRadius: "2px",
                    color: "#fff",
                    fontFamily: "monospace",
                    fontSize: "13px",
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "1px"
                  },
                  children: "Reload"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  "data-testid": "error-copy-button",
                  onClick: () => {
                    const text = [
                      `${errorObj.name}: ${errorObj.message}`,
                      `Source: ${source ?? "unknown"}`,
                      `Timestamp: ${timestamp}`,
                      "",
                      "--- Stack Trace ---",
                      errorObj.stack ?? "(none)",
                      componentStack ? `
--- Component Stack ---
${componentStack}` : ""
                    ].join("\n");
                    navigator.clipboard.writeText(text);
                  },
                  style: {
                    padding: "10px 20px",
                    background: "transparent",
                    border: "1px solid #666",
                    borderRadius: "2px",
                    color: "#aaa",
                    fontFamily: "monospace",
                    fontSize: "13px",
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "1px"
                  },
                  children: "Copy to Clipboard"
                }
              )
            ] })
          ]
        }
      )
    }
  );
}

export { ErrorOverlay };
//# sourceMappingURL=ErrorOverlay-7KUcZWh9.js.map
