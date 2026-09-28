import type { Profile } from '../api/progress'

/** 十级称号：挑战页与传承档案共用的等级系统 */
export const TITLES = [
  '非遗见习生',
  '寻访学徒',
  '守艺弟子',
  '采风行者',
  '鉴赏雅士',
  '传习讲师',
  '活化工匠',
  '非遗推介官',
  '行家里手',
  '承脉大师',
] as const

const EXP_PER_LEVEL = 150

export interface Rank {
  exp: number
  level: number
  title: string
  /** 当前等级内进度 0-100（满级恒 100） */
  pct: number
}

/** 经验 = 浏览×10 + 学习计划×40 + 答题×6 + 创作×80 */
export function calcRank(profile: Profile): Rank {
  const s = profile.stats
  const exp =
    s.viewed_items * 10 + s.learning_plans * 40 + profile.quiz.answered * 6 + s.creations * 80
  const level = Math.min(TITLES.length, Math.floor(exp / EXP_PER_LEVEL) + 1)
  const isMax = level === TITLES.length
  return {
    exp,
    level,
    title: TITLES[level - 1],
    pct: isMax ? 100 : Math.round(((exp % EXP_PER_LEVEL) / EXP_PER_LEVEL) * 100),
  }
}
