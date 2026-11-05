import React, { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import { getSession, logout } from "./api/backendClient.js";

import Layout from "./components/Layout.jsx";
import "./styles/main.css";

const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const AgendaDetailsPage = lazy(() => import("./pages/AgendaDetailsPage.jsx"));
const AgendaPage = lazy(() => import("./pages/AgendaPage.jsx"));
const BanksPage = lazy(() => import("./pages/BanksPage.jsx"));
const BotInstallationDetailsPage = lazy(() => import("./pages/BotInstallationDetailsPage.jsx"));
const BotInstallationsPage = lazy(() => import("./pages/BotInstallationsPage.jsx"));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const PixKeysPage = lazy(() => import("./pages/PixKeysPage.jsx"));
const UsersPage = lazy(() => import("./pages/UsersPage.jsx"));

function PageLoading({ fullPage = false }) {
  return (
    <div className={fullPage ? "session-loading" : "table-loading"} role="status">
      <span className="loading-spinner" aria-hidden="true" />
      <p>Loading page…</p>
    </div>
  );
}

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

  if (checking) return <main className="session-loading" role="status"><span className="brand-mark" aria-hidden="true">TB</span><p>Checking your session…</p></main>;
  if (!user) {
    return (
      <Suspense fallback={<main><PageLoading fullPage /></main>}>
        <LoginPage onLogin={setUser} />
      </Suspense>
    );
  }

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

  return (
    <Layout route={route} onLogout={signOut}>
      {sessionError && <div className="alert" role="alert">{sessionError}</div>}
      <Suspense fallback={<PageLoading />}>{page}</Suspense>
    </Layout>
  );
}

createRoot(document.getElementById("root")).render(<App />);
