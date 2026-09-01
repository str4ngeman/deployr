import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { EditorPage } from "./components/EditorPage";
import { LogsPage } from "./components/LogsPage";
import { AppsPage } from "./components/AppsPage";
import { SettingsPage } from "./components/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="editor" element={<EditorPage />} />
        <Route path="apps" element={<AppsPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
