// Centralised data-testid registry
export const NAV = {
  root: "app-nav",
  logo: "nav-logo",
  linkArchitecture: "nav-link-architecture",
  linkWorkspace: "nav-link-workspace",
  linkModules: "nav-link-modules",
  linkDocs: "nav-link-docs",
};

export const LANDING = {
  root: "landing-page",
  heroTitle: "hero-title",
  heroSubtitle: "hero-subtitle",
  launchButton: "launch-architect-button",
  scrollHint: "landing-scroll-hint",
  whisper: "landing-whisper",
};

export const BOOT = {
  overlay: "boot-sequence-overlay",
  logLine: "boot-log-line",
  progressBar: "boot-progress-bar",
  status: "boot-status",
};

export const WORKSPACE = {
  root: "workspace-page",
  chipBar: "workspace-chip-bar",
  chip: (name) => `workspace-chip-${name.toLowerCase()}`,
  roomTitle: "workspace-room-title",
  roomBody: "workspace-room-body",
  exitBtn: "workspace-exit-btn",
};

export const HOME = {
  emergentLink: "emergent-link",
};
