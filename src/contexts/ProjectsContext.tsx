import React, { createContext, useContext, useState, useEffect } from 'react';

// Define Project type
export interface Project {
  id: string;
  name: string;
  description: string;
  instructions: string;
  conversationStarters: string[];
  createdAt: string;
  updatedAt: string;
}

// Define context type
interface ProjectsContextType {
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;
  exportProjects: () => Project[];
  importProjects: (input: unknown) => { importedCount: number };
}

// Create context
const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

// Storage key
const STORAGE_KEY = 'localGrok_projects';

// Provider component
export const ProjectsProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);

  // Load projects from backend on init
  useEffect(() => {
    fetch(`/api/projects?userId=me`).then(async r => {
      if (!r.ok) return;
      const data = await r.json();
      setProjects(data);
    }).catch(() => {});
  }, []);

  // Add a new project
  const addProject = (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: 'me', name: projectData.name, description: projectData.description, instructions: projectData.instructions, conversationStarters: projectData.conversationStarters }) })
      .then(async r => { if (r.ok) { const p = await r.json(); setProjects(prev => [...prev, { ...projectData, id: String(p.id), createdAt: p.createdAt, updatedAt: p.updatedAt }]); } });
    return '';
  };

  // Update an existing project
  const updateProject = (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>) => {
    fetch('/api/projects', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: Number(id), userId: 'me', name: updates.name, description: updates.description, instructions: updates.instructions, conversationStarters: updates.conversationStarters }) })
      .then(() => setProjects(prev => prev.map(project => project.id === id ? { ...project, ...updates, updatedAt: new Date().toISOString() } : project)));
  };

  // Delete a project
  const deleteProject = (id: string) => {
    fetch(`/api/projects?id=${id}&userId=me`, { method: 'DELETE' })
      .then(() => setProjects(prev => prev.filter(project => project.id !== id)));
  };

  // Get a project by ID
  const getProject = (id: string): Project | undefined => {
    return projects.find(project => project.id === id);
  };

  // Context value
  const value: ProjectsContextType = {
    projects,
    addProject,
    updateProject,
    deleteProject,
    getProject,
    exportProjects: () => projects,
    importProjects: (input: unknown) => {
      // Normalize input into an array of project-like objects
      const normalizeToArray = (raw: unknown): Array<Partial<Project>> => {
        if (Array.isArray(raw)) return raw as Array<Partial<Project>>;
        if (raw && typeof raw === 'object') {
          const obj = raw as Record<string, unknown>;
          if (Array.isArray(obj.projects)) return obj.projects as Array<Partial<Project>>;
          return [obj as Partial<Project>];
        }
        return [];
      };

      const candidates = normalizeToArray(input);
      let importedCount = 0;

      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== 'object') continue;
        const name = typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim() : 'Untitled Project';
        const description = typeof candidate.description === 'string' ? candidate.description : '';
        const instructions = typeof candidate.instructions === 'string' ? candidate.instructions : '';
        const conversationStarters = Array.isArray(candidate.conversationStarters)
          ? candidate.conversationStarters.filter((s): s is string => typeof s === 'string')
          : [];

        addProject({ name, description, instructions, conversationStarters });
        importedCount += 1;
      }

      return { importedCount };
    }
  };

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
};

// Custom hook for using the projects context
export const useProjects = (): ProjectsContextType => {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
}; 