import Docker from "dockerode";

const DOCKER_ENABLED = process.env.DOCKER_ENABLED === "true";
const DOCKER_SOCKET = process.env.DOCKER_SOCKET || "/var/run/docker.sock";

let docker: Docker | null = null;

function getDocker(): Docker | null {
  if (!DOCKER_ENABLED) return null;
  if (!docker) {
    docker = new Docker({ socketPath: DOCKER_SOCKET });
  }
  return docker;
}

export function isDockerEnabled(): boolean {
  return DOCKER_ENABLED;
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports: string;
  isGhcr: boolean;
  hidden?: boolean;
}

export async function listContainers(options?: {
  all?: boolean;
  hiddenIds?: Set<string>;
  includeHidden?: boolean;
}): Promise<ContainerInfo[]> {
  const client = getDocker();
  if (!client) {
    throw new Error("Docker is not enabled");
  }

  const containers = await client.listContainers({ all: options?.all ?? false });

  return containers
    .map((container) => {
      const name = container.Names[0]?.replace(/^\//, "") || container.Id.slice(0, 12);
      const ports = (container.Ports ?? [])
        .map((p) =>
          p.PublicPort ? `${p.PublicPort}:${p.PrivatePort}/${p.Type}` : null,
        )
        .filter(Boolean)
        .join(", ");

      const hidden = options?.hiddenIds?.has(container.Id) ?? false;

      return {
        id: container.Id,
        name,
        image: container.Image,
        state: container.State,
        status: container.Status,
        ports: ports || "—",
        isGhcr: container.Image.includes("ghcr.io"),
        hidden,
      };
    })
    .filter((container) => options?.includeHidden || !container.hidden);
}

export async function getContainerLogs(
  containerId: string,
  tail = 100,
): Promise<string> {
  const client = getDocker();
  if (!client) {
    throw new Error("Docker is not enabled");
  }

  const container = client.getContainer(containerId);
  const buffer = await container.logs({
    stdout: true,
    stderr: true,
    tail,
    timestamps: true,
  });

  return demuxDockerLogs(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer));
}

export function followContainerLogs(
  containerId: string,
  tail: number,
  onData: (text: string) => void,
  onError: (error: Error) => void,
): () => void {
  const client = getDocker();
  if (!client) {
    onError(new Error("Docker is not enabled"));
    return () => {};
  }

  const container = client.getContainer(containerId);
  const demuxer = new DockerLogDemuxer();
  let stream: NodeJS.ReadableStream & { destroy?: () => void } | null = null;

  container.logs(
    {
      follow: true,
      stdout: true,
      stderr: true,
      tail,
      timestamps: true,
    },
    (err, logStream) => {
      if (err) {
        onError(err);
        return;
      }

      if (!logStream) {
        onError(new Error("Failed to open log stream"));
        return;
      }

      stream = logStream;
      logStream.on("data", (chunk: Buffer) => {
        const text = demuxer.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        if (text) onData(text);
      });
      logStream.on("error", onError);
    },
  );

  return () => {
    stream?.destroy?.();
  };
}

class DockerLogDemuxer {
  private buffer = Buffer.alloc(0);

  push(chunk: Buffer): string {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    let output = "";

    while (this.buffer.length >= 8) {
      const size = this.buffer.readUInt32BE(4);
      if (this.buffer.length < 8 + size) break;

      output += this.buffer.subarray(8, 8 + size).toString("utf-8");
      this.buffer = this.buffer.subarray(8 + size);
    }

    return output;
  }
}

function demuxDockerLogs(buffer: Buffer): string {
  return new DockerLogDemuxer().push(buffer).trimEnd();
}

export async function checkDockerConnection(): Promise<boolean> {
  const client = getDocker();
  if (!client) return false;

  try {
    await client.ping();
    return true;
  } catch {
    return false;
  }
}

export async function restartContainer(containerId: string): Promise<void> {
  const client = getDocker();
  if (!client) throw new Error("Docker is not enabled");
  const container = client.getContainer(containerId);
  await container.restart();
}

export async function stopContainer(containerId: string): Promise<void> {
  const client = getDocker();
  if (!client) throw new Error("Docker is not enabled");
  const container = client.getContainer(containerId);
  await container.stop();
}

export async function startContainer(containerId: string): Promise<void> {
  const client = getDocker();
  if (!client) throw new Error("Docker is not enabled");
  const container = client.getContainer(containerId);
  await container.start();
}

export async function pullImage(
  image: string,
  auth?: { username: string; password: string } | null,
): Promise<void> {
  const client = getDocker();
  if (!client) throw new Error("Docker is not enabled");

  await new Promise<void>((resolve, reject) => {
    client.pull(
      image,
      auth ? { authconfig: { username: auth.username, password: auth.password } } : {},
      (err, stream) => {
        if (err) {
          reject(err);
          return;
        }
        if (!stream) {
          reject(new Error("Failed to start image pull"));
          return;
        }
        client.modem.followProgress(stream, (pullErr) => {
          if (pullErr) reject(pullErr);
          else resolve();
        });
      },
    );
  });
}

export async function pullAndRecreateContainer(containerId: string): Promise<void> {
  const client = getDocker();
  if (!client) throw new Error("Docker is not enabled");

  const container = client.getContainer(containerId);
  const inspect = await container.inspect();
  const image = inspect.Config.Image;

  const { getGhcrAuth } = await import("./db.js");
  const auth = image.includes("ghcr.io") ? getGhcrAuth() : null;
  if (image.includes("ghcr.io") && !auth) {
    throw new Error("GHCR credentials not configured in Settings");
  }

  await pullImage(image, auth ? { username: auth.username, password: auth.token } : null);

  const name = inspect.Name.replace(/^\//, "");
  await container.stop({ t: 10 }).catch(() => {});
  await container.remove({ force: true });

  const created = await client.createContainer({
    name,
    Image: image,
    Env: inspect.Config.Env,
    Cmd: inspect.Config.Cmd,
    Entrypoint: inspect.Config.Entrypoint,
    WorkingDir: inspect.Config.WorkingDir,
    Labels: inspect.Config.Labels,
    ExposedPorts: inspect.Config.ExposedPorts,
    HostConfig: {
      Binds: inspect.HostConfig.Binds,
      PortBindings: inspect.HostConfig.PortBindings,
      RestartPolicy: inspect.HostConfig.RestartPolicy,
      NetworkMode: inspect.HostConfig.NetworkMode,
      ExtraHosts: inspect.HostConfig.ExtraHosts,
      Devices: inspect.HostConfig.Devices,
      CapAdd: inspect.HostConfig.CapAdd,
      CapDrop: inspect.HostConfig.CapDrop,
      SecurityOpt: inspect.HostConfig.SecurityOpt,
      LogConfig: inspect.HostConfig.LogConfig,
    },
    NetworkingConfig: {
      EndpointsConfig: inspect.NetworkSettings.Networks
        ? Object.fromEntries(
            Object.entries(inspect.NetworkSettings.Networks).map(([netName]) => [
              netName,
              {},
            ]),
          )
        : undefined,
    },
  });

  await created.start();
}

export interface ContainerDetails {
  id: string;
  name: string;
  image: string;
  state: string;
  running: boolean;
  status: string;
  created: string;
  startedAt: string;
  finishedAt: string;
  restartCount: number;
  platform: string;
  ports: Array<{ host: string; container: string }>;
  labels: Record<string, string>;
  envCount: number;
  mounts: Array<{ source: string; destination: string; mode: string }>;
  isGhcr: boolean;
}

export async function inspectContainer(containerId: string): Promise<ContainerDetails> {
  const client = getDocker();
  if (!client) throw new Error("Docker is not enabled");

  const container = client.getContainer(containerId);
  const data = await container.inspect();

  const ports = Object.entries(data.NetworkSettings.Ports ?? {})
    .flatMap(([containerPort, bindings]) =>
      (bindings ?? []).map((b) => ({
        host: `${b.HostIp === "0.0.0.0" || b.HostIp === "" ? "*" : b.HostIp}:${b.HostPort}`,
        container: containerPort.replace("/tcp", "").replace("/udp", ""),
      })),
    );

  return {
    id: data.Id,
    name: data.Name.replace(/^\//, ""),
    image: data.Config.Image,
    state: data.State.Status,
    running: data.State.Running,
    status: data.State.Status,
    created: data.Created,
    startedAt: data.State.StartedAt,
    finishedAt: data.State.FinishedAt,
    restartCount: data.RestartCount,
    platform: data.Platform || "linux",
    ports,
    labels: data.Config.Labels ?? {},
    envCount: data.Config.Env?.length ?? 0,
    mounts: (data.Mounts ?? []).map((m) => ({
      source: m.Source,
      destination: m.Destination,
      mode: m.Mode,
    })),
    isGhcr: data.Config.Image.includes("ghcr.io"),
  };
}
