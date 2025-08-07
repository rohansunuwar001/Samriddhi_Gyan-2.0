import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Provider } from "react-redux";
import { appStore } from "./app/store";
import { Toaster } from "./components/ui/sonner";
import './i18n'; 
// Get the root element from the HTML
const rootElement = document.getElementById("root");

// Create the root and render the app
createRoot(rootElement).render(
  <StrictMode>
    <Provider store={appStore}>
      {/* --- Wrap your App in Suspense --- */}
      <Suspense fallback={<div>Loading translations...</div>}>
        <App />
        <Toaster />
      </Suspense>
    </Provider>
  </StrictMode>
);