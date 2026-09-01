import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { LoginPage } from "./components/LoginPage";
import { Dashboard } from "./components/Dashboard";
import { EditorPage } from "./components/EditorPage";
import { LogsPage } from "./components/LogsPage";
import { AppsPage } from "./components/AppsPage";
import { SettingsPage } from "./components/SettingsPage";
import { ComposePage } from "./components/ComposePage";
import { MonitorPage } from "./components/MonitorPage";
import { BackupsPage } from "./components/BackupsPage";
import { SchedulerPage } from "./components/SchedulerPage";
import { EnvPage } from "./components/EnvPage";
import { Spinner } from "./components/ui";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, enabled, needsSetup, authenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Spinner size={32} className="text-accent" />
      </div>
    );
  }

  if (needsSetup || (enabled && !authenticated)) {
    return <LoginPage />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthGate>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="editor" element={<EditorPage />} />
          <Route path="apps" element={<AppsPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="compose" element={<ComposePage />} />
          <Route path="monitor" element={<MonitorPage />} />
          <Route path="backups" element={<BackupsPage />} />
          <Route path="scheduler" element={<SchedulerPage />} />
          <Route path="env" element={<EnvPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthGate>
  );
}
