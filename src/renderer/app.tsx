import { createRoot } from "react-dom/client";

import { Header } from "./components/Header";
import { Instructions } from "./components/Instructions";
import { Toaster } from "./components/ui/toaster";

const root = createRoot(document.getElementById("root"));
root.render(
  <>
    <Header />
    <Instructions />
    <Toaster />
  </>
);
