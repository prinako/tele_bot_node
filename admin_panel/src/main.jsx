import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import LoginPage from "./pages/LoginPage.jsx";
import { getSession, logout } from "./api/backendClient.js";

import Layout from "./components/Layout.jsx";
import AgendaDetailsPage from "./pages/AgendaDetailsPage.jsx";
import AgendaPage from "./pages/AgendaPage.jsx";
import BanksPage from "./pages/BanksPage.jsx";
import BotInstallationDetailsPage from "./pages/BotInstallationDetailsPage.jsx";
import BotInstallationsPage from "./pages/BotInstallationsPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import PixKeysPage from "./pages/PixKeysPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import "./styles/main.css";

function currentRoute() {
  return window.location.hash.replace("#", "") || "/";
}

function App() {
  const [route, setRoute] = useState(currentRoute());
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState("");
  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener("auth-required", expired);
    getSession().then(setUser).catch(() => setUser(null)).finally(() => setChecking(false));
    return () => window.removeEventListener("auth-required", expired);
  }, []);
  async function signOut() {
    try { await logout(); setUser(null); }
    catch (error) { setSessionError(error.message); }
  }

  useEffect(() => {
    const listener = () => setRoute(currentRoute());
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);

  if (checking) return <main className="main">Checking session…</main>;
  if (!user) return <LoginPage onLogin={setUser} />;

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

  return <Layout route={route} onLogout={signOut}>{sessionError && <div className="alert">{sessionError}</div>}{page}</Layout>;
}

createRoot(document.getElementById("root")).render(<App />);
