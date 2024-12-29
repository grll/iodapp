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

const root = createRoot(document.getElementById("root"));
root.render(<App />);
