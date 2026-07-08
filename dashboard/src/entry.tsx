import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./index.css";

const elem = document.getElementById("root")!;
(import.meta.hot.data.root ??= createRoot(elem)).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
