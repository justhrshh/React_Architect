import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import {
  selectAllProjects,
  selectProject,
  updateLastOpened,
} from "@/redux/slices/hubSlice";
import { setProject } from "@/redux/slices/projectSlice";
import ProjectCard from "@/components/hub/ProjectCard";
import ImportProjectModal from "@/components/hub/ImportProjectModal";
import CreateProjectWizard from "@/components/hub/CreateProjectWizard";
import ProjectLoadTransition from "@/components/hub/ProjectLoadTransition";

const ProjectHub = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const projects = useSelector(selectAllProjects);

  const [showImportModal, setShowImportModal] = useState(false);
  const [showWizard, setShowWizard]           = useState(false);
  const [loadingProject, setLoadingProject]   = useState(null);

  const headerRef = useRef();
  const gridRef   = useRef();

  // Entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power2.out", delay: 0.1 }
      );
      if (gridRef.current && gridRef.current.children.length > 0) {
        gsap.fromTo(
          gridRef.current.children,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.08, delay: 0.25 }
        );
      }
    });
    return () => ctx.revert();
  }, [projects.length]);

  /** Open a card — triggers cinematic load transition */
  const handleOpenProject = (project) => {
    dispatch(selectProject(project.id));
    dispatch(updateLastOpened(project.id));
    dispatch(setProject({ name: project.name, path: null }));
    setLoadingProject(project);
  };

  /** Called after wizard creates a project — go straight to workspace */
  const handleWizardComplete = ({ projectName }) => {
    setShowWizard(false);
    setLoadingProject({ name: projectName });
  };

  /** Called when the cinematic overlay finishes */
  const handleLoadComplete = () => navigate("/workspace");

  return (
    <div className="min-h-screen w-full px-6 md:px-12 lg:px-24 py-10 md:py-16">

      {/* Cinematic load overlay */}
      {loadingProject && (
        <ProjectLoadTransition
          projectName={loadingProject.name}
          onComplete={handleLoadComplete}
        />
      )}

      {/* Import modal */}
      {showImportModal && (
        <ImportProjectModal onClose={() => setShowImportModal(false)} />
      )}

      {/* Create wizard — fullscreen takeover */}
      {showWizard && (
        <CreateProjectWizard
          onClose={() => setShowWizard(false)}
          onComplete={handleWizardComplete}
        />
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ---------------------------------------------------------------- */}
      <header
        ref={headerRef}
        className="flex items-center justify-between mb-16"
        style={{ opacity: 0 }}
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span
              onClick={() => navigate("/")}
              className="font-display font-[800] text-sm tracking-tightest text-white cursor-pointer hover:text-accent transition-colors"
            >
              React<span className="text-accent">/</span>Architect
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widestest text-ink-faint px-2 py-0.5 border border-edge-subtle rounded-full">
              Hub
            </span>
          </div>
          <button
            onClick={() => navigate("/")}
            className="font-mono text-[9px] uppercase tracking-widestest text-ink-faint hover:text-white transition-colors"
          >
            ← Landing
          </button>
        </div>

        {/* Dual action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-edge-subtle text-ink-dim font-mono text-[10px] uppercase tracking-widestest rounded-xl hover:text-white hover:border-white/20 transition-colors"
          >
            <span className="text-sm leading-none">↑</span>
            Import
          </button>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-obsidian font-mono text-[10px] uppercase tracking-widestest font-semibold rounded-xl hover:bg-accent/90 transition-colors shadow-lg"
          >
            <span className="text-sm leading-none">+</span>
            New Project
          </button>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Projects Grid / Empty State                                      */}
      {/* ---------------------------------------------------------------- */}
      {projects.length === 0 ? (
        <EmptyState
          onImport={() => setShowImportModal(true)}
          onCreate={() => setShowWizard(true)}
        />
      ) : (
        <>
          {/* Section label */}
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[10px] uppercase tracking-widestest text-ink-faint">
              All Projects
            </span>
            <span className="font-mono text-[10px] text-ink-faint px-2 py-0.5 bg-white/5 rounded-full border border-edge-subtle">
              {projects.length}
            </span>
          </div>

          {/* Cards grid */}
          <div
            ref={gridRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {[...projects]
              .sort((a, b) => new Date(b.lastOpenedAt) - new Date(a.lastOpenedAt))
              .map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={() => handleOpenProject(project)}
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
};

// =============================================================================
// Empty state — dual path
// =============================================================================
const EmptyState = ({ onImport, onCreate }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">

    {/* Decorative orb */}
    <div className="relative mb-10">
      <div className="w-20 h-20 rounded-full border border-accent/20 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border border-accent/40 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
        </div>
      </div>
      <div className="absolute inset-0 rounded-full bg-accent/5 blur-2xl" />
    </div>

    <span className="font-mono text-[10px] uppercase tracking-widestest text-ink-faint block mb-3">
      No projects yet
    </span>
    <h2 className="font-display text-3xl md:text-4xl font-[800] text-white tracking-tightest mb-4 leading-tight">
      How would you like to start?
    </h2>
    <p className="text-sm text-ink-dim max-w-md leading-relaxed mb-12">
      Import an existing React project or build a new one from scratch. Either way, React Architect will understand your code and help you architect it better.
    </p>

    {/* Dual path tiles */}
    <div className="flex flex-col sm:flex-row items-stretch gap-4 w-full max-w-lg">
      {/* Import */}
      <button
        onClick={onImport}
        className="group flex-1 flex flex-col items-start gap-3 p-6 rounded-2xl border border-edge-subtle hover:border-white/15 hover:bg-white/3 transition-all duration-200 text-left"
      >
        <span className="text-2xl">↑</span>
        <div>
          <p className="font-display text-base font-[700] text-white tracking-tightest mb-1">
            Import Existing
          </p>
          <p className="font-mono text-[10px] text-ink-faint leading-relaxed">
            Local folder, ZIP, or GitHub
          </p>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-widestest text-accent opacity-0 group-hover:opacity-100 transition-opacity mt-auto">
          Select →
        </span>
      </button>

      {/* Divider */}
      <div className="flex sm:flex-col items-center justify-center gap-2">
        <div className="flex-1 h-px sm:h-auto sm:w-px bg-white/8" />
        <span className="font-mono text-[9px] uppercase tracking-widestest text-ink-faint px-2">or</span>
        <div className="flex-1 h-px sm:h-auto sm:w-px bg-white/8" />
      </div>

      {/* Create new */}
      <button
        onClick={onCreate}
        className="group flex-1 flex flex-col items-start gap-3 p-6 rounded-2xl border border-accent/20 bg-accent/5 hover:border-accent/40 hover:bg-accent/8 transition-all duration-200 text-left"
      >
        <span className="text-2xl text-accent">+</span>
        <div>
          <p className="font-display text-base font-[700] text-white tracking-tightest mb-1">
            Create New Project
          </p>
          <p className="font-mono text-[10px] text-ink-faint leading-relaxed">
            Guided wizard, 8 steps
          </p>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-widestest text-accent opacity-0 group-hover:opacity-100 transition-opacity mt-auto">
          Start →
        </span>
      </button>
    </div>
  </div>
);

export default ProjectHub;
