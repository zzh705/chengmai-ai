import type { ChatResponse } from './chat'

/** 模拟后端返回，字段与 api_contract.md 完全一致 */
export const mockChatResponse: ChatResponse = {
  code: 0,
  session_id: 'mock-session-001',
  answer: '苏绣是中国四大名绣之首，起源于江苏苏州，已有两千多年历史，以精细雅洁著称。',
  sources: [
    {
      id: 'src_001',
      title: '中国非物质文化遗产网 · 苏绣',
      publisher: '中国非物质文化遗产网',
      url: 'https://www.ihchina.cn/',
      publish_time: '2006-05-20',
      reliability_level: 'official',
    },
  ],
  related_items: [
    { id: 'h_suxiu', name: '苏绣', type: 'heritage' },
    { id: 'r_jiangsu', name: '江苏苏州', type: 'region' },
  ],
  actions: [
    { type: 'learning_plan', label: '生成学习路线' },
    { type: 'quiz', label: '生成测试题' },
  ],
  evidence_score: { relevance: 0.92, credibility: 0.95, coverage: 0.89, total: 0.92 },
  intent: 'INFO',
}
