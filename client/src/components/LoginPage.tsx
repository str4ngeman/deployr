import { useEffect, useState } from "react";
import { Hexagon, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button, Card, Alert } from "./ui";

export function LoginPage() {
  const { needsSetup, username: defaultUser, login, setup } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (defaultUser) setUsername(defaultUser);
  }, [defaultUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (needsSetup && password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }
    setLoading(true);
    try {
      if (needsSetup) {
        await setup(username, password);
      } else {
        await login(username, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/25 mb-4">
            <Hexagon size={28} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold">Deployr</h1>
          <p className="text-sm text-text-muted mt-1">
            {needsSetup ? "Set up your admin account" : "Sign in to continue"}
          </p>
        </div>

        {error && (
          <Alert variant="danger" className="mb-4" onDismiss={() => setError("")}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-surface-overlay border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-overlay border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
              autoComplete={needsSetup ? "new-password" : "current-password"}
            />
          </div>
          {needsSetup && (
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-surface-overlay border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
                autoComplete="new-password"
              />
            </div>
          )}
          <Button type="submit" variant="primary" className="w-full" loading={loading} icon={<Lock size={14} />}>
            {needsSetup ? "Create account" : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
