export async function readApiJson(response: Response): Promise<any> {
  if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    throw new Error(`服務尚未就緒，請稍後再試。（HTTP ${response.status}）`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error(`服務回應格式錯誤，請稍後再試。（HTTP ${response.status}）`);
  }
}
