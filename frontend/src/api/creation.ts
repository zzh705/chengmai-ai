/** 活化实验室接口（POST /api/creation/generate） */

export interface CreationResult {
  title: string
  traditional_elements: string[]
  modern_carrier: string[]
  spread_channels: string[]
  ai_parts: string[]
  steps: string[]
  guardrails: string[]
}

export interface CreationResponse {
  code: number
  heritage: string
  result: CreationResult
  sources: string[]
}

export async function generateCreation(
  heritage: string,
  requirement: string,
  outputType: 'plan' | 'event' | 'video' = 'plan',
): Promise<CreationResponse> {
  const resp = await fetch('/api/creation/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ heritage, requirement, output_type: outputType }),
  })
  if (!resp.ok) throw new Error(`方案生成失败：HTTP ${resp.status}`)
  return (await resp.json()) as CreationResponse
}
