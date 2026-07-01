import React, { useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { useSelector } from "react-redux";
import { selectSelectedProject, selectAllProjects } from "@/redux/slices/hubSlice";
import CameraController from "./CameraController";
import WorldLights from "./WorldLights";
import WorldEnvironment from "./WorldEnvironment";
import BrainRoom from "./rooms/BrainRoom";
import ArchitectureRoom from "./rooms/ArchitectureRoom";
import RoutesRoom from "./rooms/RoutesRoom";
import StateRoom from "./rooms/StateRoom";
import ApiRoom from "./rooms/ApiRoom";
import DocumentationRoom from "./rooms/DocumentationRoom";

/**
 * WorkspaceScene mounts the full-viewport WebGL R3F canvas.
 * - Manages the environment, lights, camera sweep controller, and rooms.
 * - Triggers state variables to control local room platform animations.
 */
const WorkspaceScene = ({ onArrivalChange, onSelectRoom, onSelectProject, onAddClick, onContextMenu }) => {
  const activeRoom = useSelector((state) => state.ui.activeRoom);
  const appMode = useSelector((state) => state.ui.appMode);
  const selectedProject = useSelector(selectSelectedProject);
  const projects = useSelector(selectAllProjects);
  
  const [focusedRoom, setFocusedRoom] = useState("project-brain");

  const handleArrival = useCallback((room) => {
    setFocusedRoom(room);
    if (onArrivalChange) {
      onArrivalChange(room);
    }
  }, [onArrivalChange]);

  const exploreMode = activeRoom === "explore";
  const hubMode = appMode === "hub";

  return (
    <div className="absolute inset-0 z-0 bg-obsidian w-full h-full">
      <Canvas
        camera={{ position: [0, 5, 12], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#050505"]} />
        
        {/* Lights Rig */}
        <WorldLights />

        {/* Space Grid & Environment Particles */}
        <WorldEnvironment />

        {/* GSAP Camera Sweep Orchestrator */}
        <CameraController onArrivalChange={handleArrival} />

        {/* Room Platforms with Active & Focused & Explore State Parameters */}
        <BrainRoom 
          active={activeRoom === "project-brain"}
          focused={focusedRoom === "project-brain"}
          exploreMode={exploreMode}
          onSelect={() => onSelectRoom && onSelectRoom("project-brain")} 
          hubMode={hubMode}
          projectName={selectedProject?.name}
          projects={projects}
          onSelectProject={onSelectProject}
          onAddClick={onAddClick}
          onContextMenu={onContextMenu}
        />
        
        {!hubMode && (
          <>
            <ArchitectureRoom 
              active={activeRoom === "architecture"}
              focused={focusedRoom === "architecture"}
              exploreMode={exploreMode}
              onSelect={() => onSelectRoom && onSelectRoom("architecture")} 
            />
            
            <RoutesRoom 
              active={activeRoom === "routes"}
              focused={focusedRoom === "routes"}
              exploreMode={exploreMode}
              onSelect={() => onSelectRoom && onSelectRoom("routes")} 
            />
            
            <StateRoom 
              active={activeRoom === "state-flow"}
              focused={focusedRoom === "state-flow"}
              exploreMode={exploreMode}
              onSelect={() => onSelectRoom && onSelectRoom("state-flow")} 
            />
            
            <ApiRoom 
              active={activeRoom === "api-flow"}
              focused={focusedRoom === "api-flow"}
              exploreMode={exploreMode}
              onSelect={() => onSelectRoom && onSelectRoom("api-flow")} 
            />
            
            <DocumentationRoom 
              active={activeRoom === "documentation"}
              focused={focusedRoom === "documentation"}
              exploreMode={exploreMode}
              onSelect={() => onSelectRoom && onSelectRoom("documentation")} 
            />
          </>
        )}
      </Canvas>
    </div>
  );
};

export default WorkspaceScene;
