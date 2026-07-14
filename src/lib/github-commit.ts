// GitHub Contents API でファイルをコミットする（Vercel本番用）
const REPO = process.env.GITHUB_REPO ?? "ozakichuon/chuon-globaltms";
const TOKEN = process.env.GITHUB_TOKEN ?? "";

export async function commitFileToGitHub(
  filePath: string,
  content: string,
  message: string
): Promise<void> {
  if (!TOKEN) throw new Error("GITHUB_TOKEN が設定されていません");

  const apiUrl = `https://api.github.com/repos/${REPO}/contents/${filePath}`;
  const headers = {
    Authorization: `token ${TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.github+json",
  };

  // 既存ファイルのSHAを取得
  let sha: string | undefined;
  const getRes = await fetch(apiUrl, { headers });
  if (getRes.ok) {
    const data = await getRes.json();
    sha = data.sha;
  }

  const body: Record<string, string> = {
    message,
    content: Buffer.from(content, "utf-8").toString("base64"),
    branch: "main",
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(apiUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`GitHub commit 失敗: ${putRes.status} ${err}`);
  }
}
