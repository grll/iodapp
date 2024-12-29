import { createRoot } from "react-dom/client";

import { Toaster } from "./components/ui/toaster";

import { Header } from "./components/Header";
import { Instructions } from "./components/Instructions";
import { ServersManager } from "./components/ServersManager";

import { useNotifications } from "./hooks/useNotifications";

function App() {
  useNotifications();
  return (
    <>
      <Header />
      <Instructions />
      <ServersManager />
      <Toaster />
    </>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
} else {
  throw new Error("Root element not found");
}
