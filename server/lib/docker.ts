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
}

export async function listContainers(): Promise<ContainerInfo[]> {
  const client = getDocker();
  if (!client) {
    throw new Error("Docker is not enabled");
  }

  const containers = await client.listContainers({ all: false });

  return containers.map((container) => {
    const name = container.Names[0]?.replace(/^\//, "") || container.Id.slice(0, 12);
    const ports = (container.Ports ?? [])
      .map((p) =>
        p.PublicPort ? `${p.PublicPort}:${p.PrivatePort}/${p.Type}` : null,
      )
      .filter(Boolean)
      .join(", ");

    return {
      id: container.Id,
      name,
      image: container.Image,
      state: container.State,
      status: container.Status,
      ports: ports || "—",
    };
  });
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
