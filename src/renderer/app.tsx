import { createRoot } from "react-dom/client";

import { Toaster } from "./components/ui/toaster";
import { Test } from "./components/Test";

const root = createRoot(document.getElementById("root"));
root.render(
  <main>
    <Test />
    <Toaster />
  </main>
);
