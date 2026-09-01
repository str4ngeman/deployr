export interface SettingDefinition {
  key: string;
  label: string;
  description: string;
  type: "string" | "number" | "boolean" | "secret";
  group: string;
  defaultValue: string;
}

export const SETTING_DEFINITIONS: SettingDefinition[] = [
  {
    key: "auth.enabled",
    label: "Require login",
    description: "Protect Deployr with a username and password",
    type: "boolean",
    group: "Security",
    defaultValue: "false",
  },
  {
    key: "auth.username",
    label: "Username",
    description: "Login username",
    type: "string",
    group: "Security",
    defaultValue: "admin",
  },
  {
    key: "auth.password",
    label: "Password",
    description: "Login password (stored hashed)",
    type: "secret",
    group: "Security",
    defaultValue: "",
  },
  {
    key: "logs.default_tail",
    label: "Default tail lines",
    description: "Number of log lines to show by default",
    type: "number",
    group: "Logs",
    defaultValue: "100",
  },
  {
    key: "logs.show_hidden",
    label: "Show hidden containers",
    description: "Display containers hidden from the logs list",
    type: "boolean",
    group: "Logs",
    defaultValue: "false",
  },
  {
    key: "apps.show_stopped",
    label: "Show stopped containers by default",
    description: "Include stopped containers when opening the Apps Manager",
    type: "boolean",
    group: "Apps",
    defaultValue: "false",
  },
  {
    key: "monitor.health_interval",
    label: "Health check interval (seconds)",
    description: "How often to check container health",
    type: "number",
    group: "Monitoring",
    defaultValue: "60",
  },
  {
    key: "backup.directory",
    label: "Backup directory",
    description: "Where to store backup archives",
    type: "string",
    group: "Backups",
    defaultValue: "./data/backups",
  },
  {
    key: "ghcr.username",
    label: "GHCR username",
    description: "Optional fallback if docker login is not configured on the host",
    type: "string",
    group: "GHCR",
    defaultValue: "",
  },
  {
    key: "ghcr.token",
    label: "GHCR token",
    description: "Optional fallback token (host docker login is used by default)",
    type: "secret",
    group: "GHCR",
    defaultValue: "",
  },
];

export const SETTING_KEYS = SETTING_DEFINITIONS.map((s) => s.key);
