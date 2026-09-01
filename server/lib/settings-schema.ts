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
    key: "ghcr.username",
    label: "GHCR username",
    description: "GitHub username for pulling private images",
    type: "string",
    group: "GHCR",
    defaultValue: "",
  },
  {
    key: "ghcr.token",
    label: "GHCR token",
    description: "GitHub personal access token with read:packages scope",
    type: "secret",
    group: "GHCR",
    defaultValue: "",
  },
];

export const SETTING_KEYS = SETTING_DEFINITIONS.map((s) => s.key);
