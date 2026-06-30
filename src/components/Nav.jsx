import React from "react";
import { Link, useLocation } from "react-router-dom";
import { NAV } from "@/constants/testIds";

const links = [
  { label: "Architecture", to: "/hub", testid: NAV.linkArchitecture, kbd: "01" },
  { label: "Workspace",    to: "/hub", testid: NAV.linkWorkspace,    kbd: "02" },
  { label: "Modules",      to: "/hub", testid: NAV.linkModules,      kbd: "03" },
  { label: "Docs",         to: "/",    testid: NAV.linkDocs,         kbd: "04" },
];

const Nav = () => {
  const { pathname } = useLocation();
  const onWorkspace = pathname.startsWith("/workspace");

  return (
    <header
      data-testid={NAV.root}
      className="fixed inset-x-0 top-0 z-40 px-6 md:px-12 py-6 md:py-8 flex items-start justify-between mix-blend-difference"
    >
      <Link to="/" data-testid={NAV.logo} className="group flex items-baseline gap-3">
        <span className="font-display text-white tracking-tightest text-xl md:text-2xl font-[800]">
          React<span className="text-accent">/</span>Architect
        </span>
        <span className="hidden md:inline font-mono text-[10px] uppercase tracking-widestest text-ink-dim">
          v0.4.2
        </span>
      </Link>

      <nav className="flex flex-col items-end gap-2 md:gap-2.5">
        {links.map((l) => (
          <Link
            key={l.label + l.kbd}
            to={l.to}
            data-testid={l.testid}
            data-active={onWorkspace && l.label === "Workspace" ? "true" : "false"}
            className="nav-underline group flex items-center gap-3 font-mono text-[11px] md:text-xs uppercase tracking-widestest text-white"
          >
            <span className="text-ink-faint group-hover:text-ink-dim transition-colors">{l.kbd}</span>
            <span>{l.label}</span>
          </Link>
        ))}
      </nav>
    </header>
  );
};

export default Nav;
