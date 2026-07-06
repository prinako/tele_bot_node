import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import Layout from "./components/Layout.js";
import AgendaDetailsPage from "./pages/AgendaDetailsPage.js";
import AgendaPage from "./pages/AgendaPage.js";
import BanksPage from "./pages/BanksPage.js";
import BotInstallationDetailsPage from "./pages/BotInstallationDetailsPage.jsx";
import BotInstallationsPage from "./pages/BotInstallationsPage.jsx";
import DashboardPage from "./pages/DashboardPage.js";
import PixKeysPage from "./pages/PixKeysPage.js";
import UsersPage from "./pages/UsersPage.js";
import "./styles/main.css";

function currentRoute() {
  return window.location.hash.replace("#", "") || "/";
}

function App() {
  const [route, setRoute] = useState(currentRoute());

  useEffect(() => {
    const listener = () => setRoute(currentRoute());
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);

  let page = <DashboardPage />;
  if (route === "/users") {
    page = <UsersPage />;
  } else if (route === "/banks") {
    page = <BanksPage />;
  } else if (route === "/pix") {
    page = <PixKeysPage />;
  } else if (route === "/agenda") {
    page = <AgendaPage />;
  } else if (route.startsWith("/agenda/")) {
    page = <AgendaDetailsPage id={route.replace("/agenda/", "")} />;
  } else if (route === "/bot-installations") {
    page = <BotInstallationsPage />;
  } else if (route.startsWith("/bot-installations/")) {
    page = (
      <BotInstallationDetailsPage
        telegramChatId={route.replace("/bot-installations/", "")}
      />
    );
  }

  return <Layout route={route}>{page}</Layout>;
}

createRoot(document.getElementById("root")).render(<App />);
