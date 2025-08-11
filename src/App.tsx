import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import Projects from "./pages/Projects";
import ProjectsList from "./pages/ProjectsList";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import { ProjectsProvider } from "./contexts/ProjectsContext";
import { SettingsProvider, useSettings } from "./contexts/SettingsContext";
import { ChatProvider } from "./contexts/ChatContext";

const queryClient = new QueryClient();

const RequireUser: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ok, setOk] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    fetch('/api/session').then(async r => {
      const d = await r.json();
      if (!d.userId) window.location.href = '/auth'; else setOk(true);
    }).catch(() => { window.location.href = '/auth'; });
  }, []);
  if (ok) return <>{children}</>;
  return null;
};

// Wrapper component to access settings context for ChatProvider
const ChatProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { apiKey, modelTemperature, maxTokens, currentModel } = useSettings();
  
  return (
    <ChatProvider
      apiKey={apiKey}
      modelTemperature={modelTemperature}
      maxTokens={maxTokens}
      currentModel={currentModel}
    >
      {children}
    </ChatProvider>
  );
};

const App = () => {
  // Check for system preference or saved preference on app load
  useEffect(() => {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (systemPrefersDark) document.documentElement.classList.add('dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SettingsProvider>
          <ChatProviderWrapper>
            <ProjectsProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<RequireUser><Index /></RequireUser>} />
                  <Route path="/projects" element={<ProjectsList />} />
                  <Route path="/projects/create" element={<Projects />} />
                  <Route path="/projects/edit/:id" element={<Projects />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </ProjectsProvider>
          </ChatProviderWrapper>
        </SettingsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
