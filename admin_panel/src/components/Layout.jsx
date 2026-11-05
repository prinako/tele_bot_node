import Icon from "./Icon.jsx";

const navItems = [
  { href: "#/", label: "Dashboard", icon: "dashboard" },
  { href: "#/users", label: "Users", icon: "users" },
  { href: "#/banks", label: "Banks", icon: "bank" },
  { href: "#/pix", label: "PIX Keys", icon: "pix" },
  { href: "#/agenda", label: "Agenda", icon: "calendar" },
  { href: "#/bot-installations", label: "Groups & Channels", icon: "chat" },
];

function isActive(route, href) {
  const itemRoute = href.slice(1);
  return itemRoute === "/" ? route === "/" : route === itemRoute || route.startsWith(`${itemRoute}/`);
}

export default function Layout({ route, children, onLogout }) {
  const activeItem = navItems.find((item) => isActive(route, item.href)) || navItems[0];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById("main-content")?.focus(); }}>Skip to content</a>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">TB</span>
          <div>
            <strong>Tele Bot</strong>
            <small>ADMINISTRATION</small>
          </div>
        </div>
        <span className="nav-caption">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {navItems.map((item) => (
            <a
              key={item.href}
              className={isActive(route, item.href) ? "active" : ""}
              href={item.href}
              aria-current={isActive(route, item.href) ? "page" : undefined}
            >
              <Icon name={item.icon} /><span>{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-account"><span className="account-mark"><Icon name="shield" /></span><div><strong>Administrator</strong><small>Workspace access</small></div></div>
          <button className="sign-out" onClick={onLogout}><Icon name="logout" />Sign out</button>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-bar"><div className="breadcrumb"><span>Workspace</span><span aria-hidden="true">/</span><strong>{activeItem.label}</strong></div><span className="workspace-access"><Icon name="shield" />Admin portal</span></header>
        <main className="main" id="main-content" tabIndex={-1}>{children}</main>
        <footer className="workspace-footer"><span>Tele Bot Administration</span><span>Your Telegram workflow, organized.</span></footer>
      </div>
    </div>
  );
}
