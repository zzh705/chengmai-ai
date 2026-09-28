/** 省级行政区归一：把知识库五花八门的 region 描述归到省份/全国 */

// 34 个省级行政区（长名在前，避免"内蒙古自治区"被"内蒙"截断类问题）
// 导出供首页地域聚合使用（与地图口径一致）
export const PROVINCES = [
  '北京', '天津', '上海', '重庆',
  '内蒙古', '广西', '西藏', '宁夏', '新疆',
  '香港', '澳门',
  '河北', '山西', '辽宁', '吉林', '黑龙江',
  '江苏', '浙江', '安徽', '福建', '江西', '山东',
  '河南', '湖北', '湖南', '广东', '海南',
  '四川', '贵州', '云南', '陕西', '甘肃', '青海',
  '台湾',
]

/**
 * 从 region 描述中提取省级行政区名。
 * - 含"全国"字样 → '全国'
 * - 否则取**字符串中出现位置最早**的那个省份
 *   （不能按 PROVINCES 数组顺序取首个命中，否则"陕西、河北…"会因数组里河北在前被误判）
 * - 都未命中 → '其他'
 */
export function extractProvince(region: string): string {
  if (region.includes('全国')) return '全国'
  let best = '其他'
  let bestIdx = Infinity
  for (const p of PROVINCES) {
    const i = region.indexOf(p)
    if (i !== -1 && i < bestIdx) {
      bestIdx = i
      best = p
    }
  }
  return best
}
