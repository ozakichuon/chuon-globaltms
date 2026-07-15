const REPO = process.env.GITHUB_REPO ?? "ozakichuon/chuon-globaltms";
const TOKEN = process.env.GITHUB_TOKEN ?? "";

const BASE = "https://api.github.com";

function headers() {
  return {
    Authorization: `token ${TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.github+json",
  };
}

async function gh(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${method} ${path} → ${res.status} ${text}`);
  }
  return res.json();
}

export async function commitFileToGitHub(
  filePath: string,
  content: string,
  message: string
): Promise<void> {
  return commitFilesToGitHub([{ filePath, content }], message);
}

export async function commitFilesToGitHub(
  files: { filePath: string; content: string }[],
  message: string
): Promise<void> {
  if (!TOKEN) throw new Error("GITHUB_TOKEN が設定されていません");

  const refData = await gh("GET", `/repos/${REPO}/git/ref/heads/main`);
  const latestCommitSha: string = refData.object.sha;

  const commitData = await gh("GET", `/repos/${REPO}/git/commits/${latestCommitSha}`);
  const baseTreeSha: string = commitData.tree.sha;

  const treeItems = await Promise.all(
    files.map(async ({ filePath, content }) => {
      const blobData = await gh("POST", `/repos/${REPO}/git/blobs`, {
        content: Buffer.from(content, "utf-8").toString("base64"),
        encoding: "base64",
      });
      return { path: filePath, mode: "100644", type: "blob", sha: blobData.sha };
    })
  );

  const treeData = await gh("POST", `/repos/${REPO}/git/trees`, {
    base_tree: baseTreeSha,
    tree: treeItems,
  });

  const newCommit = await gh("POST", `/repos/${REPO}/git/commits`, {
    message,
    tree: treeData.sha,
    parents: [latestCommitSha],
  });

  await gh("PATCH", `/repos/${REPO}/git/refs/heads/main`, {
    sha: newCommit.sha,
    force: false,
  });
}
