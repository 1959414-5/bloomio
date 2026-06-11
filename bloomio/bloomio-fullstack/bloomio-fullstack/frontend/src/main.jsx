import React from "react";
import { createRoot } from "react-dom/client";
import BloomioApp from "./BloomioApp.jsx";

// reset básico para o app ocupar a tela toda
const style = document.createElement("style");
style.textContent = "html,body,#root{margin:0;padding:0;min-height:100%}";
document.head.appendChild(style);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BloomioApp />
  </React.StrictMode>
);
