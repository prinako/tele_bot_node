const navItems = [
  { href: "#/", label: "Dashboard" },
  { href: "#/users", label: "Users" },
  { href: "#/banks", label: "Banks" },
  { href: "#/pix", label: "PIX Keys" },
  { href: "#/agenda", label: "Agenda" },
];

export default function Layout({ route, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">TB</span>
          <div>
            <strong>Tele Bot</strong>
            <small>Admin</small>
          </div>
        </div>
        <nav>
          {navItems.map((item) => (
            <a
              key={item.href}
              className={route === item.href.slice(1) ? "active" : ""}
              href={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
