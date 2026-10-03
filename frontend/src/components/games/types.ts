/** 非遗游艺坊：小游戏与挑战档案的统一结算契约 */

export interface GameRound {
  /** 分主题战绩名（如「游艺 · 剪纸补花」） */
  topic: string
  /** 本局是否达标：计入正确率、连对、打卡 */
  correct: boolean
  /** 0-100 本局成绩 */
  score: number
  /** 结算评语（展示给玩家） */
  summary: string
  /** 未达标时收录错题本的复盘条目 */
  wrong?: { q: string; answer: string; exp: string }
}

export interface GameProps {
  /** 一局结束：把战绩交给挑战页记账（只调用一次） */
  onFinish: (r: GameRound) => void
}
