"""给 43 项非遗数据注入「新颖介绍」三件套（幂等）。

- hook:        一句话悬念钩子（卡片与详情页大字）
- fun_facts:   冷知识列表（详情页"你知道吗"卡片）
- wow_numbers: 数字亮点 {value, suffix, label}（详情页大数字动画）

所有内容基于 data/structured/heritage_items.json 原文 + 公认常识，不编造。
用法: python3 scripts/enrich_knowledge.py
"""

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
ITEMS = ROOT / "data" / "structured" / "heritage_items.json"

ENRICH: dict[str, dict] = {
    "h_suxiu": {
        "hook": "一根丝线劈成数十股，同一块底料绣出正反两幅画",
        "fun_facts": [
            "双面绣正反图案不同，却共用同一批绣线，看不见一个线头",
            "劈丝是基本功：一根丝线可劈成数十股，最细处细过发丝",
            "《猫》是乱针绣代表作，猫眼要换色施针才显得水灵",
        ],
        "wow_numbers": [
            {"value": 2, "suffix": "面", "label": "同一底双绣"},
            {"value": 8, "suffix": "字", "label": "平齐细密和光顺匀"},
            {"value": 2000, "suffix": "+", "label": "年 始于春秋"},
        ],
    },
    "h_jianzhi": {
        "hook": "不用画笔，一张纸剪出整条街的年味",
        "fun_facts": [
            "2009 年入选联合国教科文组织人类非物质文化遗产代表作名录",
            "阴刻去块面留线条、阳刻去线条留块面，高手一张纸上阴阳并用",
            "陕西剪纸保留着原始图腾纹样，被称作民间艺术的“活化石”",
        ],
        "wow_numbers": [
            {"value": 2009, "suffix": "年", "label": "入选人类非遗"},
            {"value": 1500, "suffix": "年", "label": "南北朝实物已存"},
            {"value": 2, "suffix": "法", "label": "阴刻与阳刻"},
        ],
    },
    "h_jingju": {
        "hook": "脸一变，忠奸善恶当场揭晓",
        "fun_facts": [
            "脸谱色彩即密码：红忠、黑正、白奸，观众一眼定善恶",
            "唱念做打四功、手眼身法步五法，一个圆场要走出“脚下生风、上身如水”",
            "2010 年入选联合国教科文组织人类非遗代表作名录",
        ],
        "wow_numbers": [
            {"value": 4, "suffix": "功", "label": "唱念做打"},
            {"value": 5, "suffix": "法", "label": "手眼身法步"},
            {"value": 2010, "suffix": "年", "label": "入选人类非遗"},
        ],
    },
    "h_kunqu": {
        "hook": "600 年前的水磨腔，至今一唱三叹",
        "fun_facts": [
            "被誉为“百戏之祖”，后起剧种都受过它的滋养",
            "2001 年入选联合国教科文组织首批“人类口头和非物质遗产代表作”",
            "身段讲究“圆、曲、柔”，一把扇子、一条水袖都有固定程式",
        ],
        "wow_numbers": [
            {"value": 600, "suffix": "年", "label": "元末明初至今"},
            {"value": 2001, "suffix": "年", "label": "UNESCO 首批"},
            {"value": 3, "suffix": "小", "label": "小生小旦小丑"},
        ],
    },
    "h_piying": {
        "hook": "三个人演完千军万马——电影的祖先",
        "fun_facts": [
            "一个戏班仅三人：一人操纵全部签手，一人司鼓兼唱，一人拉弦",
            "制作要过二十余道工序，雕刻讲究“推皮走刀”，以刀代笔一气呵成",
            "2011 年入选人类非遗名录，被称为“电影的祖先”",
        ],
        "wow_numbers": [
            {"value": 3, "suffix": "人", "label": "一台戏班"},
            {"value": 20, "suffix": "道+", "label": "镂刻工序"},
            {"value": 2011, "suffix": "年", "label": "入选人类非遗"},
        ],
    },
    "h_duanwu": {
        "hook": "不只为了屈原：这个节最早是“防疫日”",
        "fun_facts": [
            "起源是多源头融合：屈原说、伍子胥说、龙图腾祭说、夏至驱疫说并存",
            "挂艾草、佩香囊、饮雄黄、系五色丝线，最初都是驱疫避瘟的卫生措施",
            "2009 年入选人类非遗，成为中国首个入选的节日类项目",
        ],
        "wow_numbers": [
            {"value": 2009, "suffix": "年", "label": "中国首个节日非遗"},
            {"value": 5, "suffix": "月", "label": "农历五月初五"},
            {"value": 4, "suffix": "源", "label": "起源诸说"},
        ],
    },
    "h_cizhou": {
        "hook": "把诗词画上瓷：宋代的“黑白电影”",
        "fun_facts": [
            "北方最大民间窑系，工匠在化妆土上挥毫，把中国书画搬上瓷器",
            "“入窑一色，出窑万彩”——窑变全凭 1280℃ 火候",
            "题材尽是花鸟鱼虫、婴戏诗词，与官窑的含蓄典雅正好相反",
        ],
        "wow_numbers": [
            {"value": 1280, "suffix": "℃", "label": "烧成温度"},
            {"value": 1000, "suffix": "+", "label": "年 北朝创烧"},
            {"value": 2, "suffix": "色", "label": "白地黑花"},
        ],
    },
    "h_nianhua": {
        "hook": "半印半画：版画的骨，手绘的魂",
        "fun_facts": [
            "与苏州桃花坞年画并称“南桃北柳”",
            "木版只套印轮廓，“开脸”要画工手工敷彩，娃娃的脸白里透红才合格",
            "画诀口传心授：“粉脸要白里透红，眉眼要开脸传神”",
        ],
        "wow_numbers": [
            {"value": 300, "suffix": "年", "label": "明代崇祯至今"},
            {"value": 2, "suffix": "半", "label": "半印半画"},
            {"value": 4, "suffix": "大", "label": "中国四大年画"},
        ],
    },
    "h_guqin": {
        "hook": "弹了三千年，“知音”这个词就是它给的",
        "fun_facts": [
            "琴面十三徽，恰好象征十二个月加一个闰月",
            "2003 年入选联合国教科文组织人类非遗代表作名录",
            "一张琴要用百年老杉做面、鹿角霜调灰胎，阴干数月，一年以上才完工",
        ],
        "wow_numbers": [
            {"value": 3000, "suffix": "+", "label": "年 先秦已载"},
            {"value": 13, "suffix": "徽", "label": "十二月加闰月"},
            {"value": 1, "suffix": "年+", "label": "斫琴工期"},
        ],
    },
    "h_zhuzi": {
        "hook": "毛竹泡在石灰水里百日，才化作一张纸",
        "fun_facts": [
            "嫩竹要断青落塘，石灰水沤料约一百天",
            "抄纸师傅手腕一荡决定厚薄，全凭几十年经验",
            "连城姑田玉扣纸有“纸寿千年”之说，至今仍是书画修复材料",
        ],
        "wow_numbers": [
            {"value": 100, "suffix": "天", "label": "石灰沤料"},
            {"value": 100, "suffix": "道+", "label": "砍竹到成纸"},
            {"value": 1000, "suffix": "年", "label": "纸寿千年"},
        ],
    },
    "h_jingdezhen": {
        "hook": "72 道工序，一块瓷土的重生",
        "fun_facts": [
            "分工细到七十二道，一件瓷器要过几十双手",
            "青花用氧化钴画在胎上，罩釉一次烧成，色泽永不褪色",
            "宋景德元年置镇烧瓷，皇帝年号成了地名",
        ],
        "wow_numbers": [
            {"value": 72, "suffix": "道", "label": "制瓷分工"},
            {"value": 1300, "suffix": "℃", "label": "高温烧成"},
            {"value": 1000, "suffix": "年", "label": "千年瓷都"},
        ],
    },
    "h_xuanzhi": {
        "hook": "纸寿千年：存了一千年，还能落笔",
        "fun_facts": [
            "青檀皮配沙田稻草，日晒雨淋自然漂白，不靠荧光增白",
            "两位纸工配合一捞，帘上荡出的厚薄全凭手感",
            "2009 年入选联合国教科文组织人类非遗代表作名录",
        ],
        "wow_numbers": [
            {"value": 1000, "suffix": "年", "label": "纸寿千年"},
            {"value": 100, "suffix": "道+", "label": "百余道工序"},
            {"value": 2009, "suffix": "年", "label": "入选人类非遗"},
        ],
    },
    "h_longjing": {
        "hook": "一锅十种手法，把茶叶压成“光、挺、直”",
        "fun_facts": [
            "全手工炒制，抖、搭、捺、拓、甩、扣、挺、抓、压、磨十大手法",
            "明前与雨前只差十几天，滋味却是两重天",
            "色绿、香郁、味甘、形美，四绝并称",
        ],
        "wow_numbers": [
            {"value": 10, "suffix": "法", "label": "手工锅炒手法"},
            {"value": 4, "suffix": "绝", "label": "色绿香郁味甘形美"},
            {"value": 100, "suffix": "℃+", "label": "锅中火候"},
        ],
    },
    "h_zisha": {
        "hook": "不上釉的壶会呼吸——越用越润",
        "fun_facts": [
            "紫砂不施釉，靠砂质本色透气，泡茶“既不夺香又无熟汤气”",
            "全手工打身筒成型，不用模具，手工痕迹就是身份",
            "造型分光货、花货、筋瓤货三大类",
        ],
        "wow_numbers": [
            {"value": 500, "suffix": "年", "label": "明代正德至今"},
            {"value": 3, "suffix": "类", "label": "光货花货筋瓤"},
            {"value": 1200, "suffix": "℃", "label": "入窑烧成"},
        ],
    },
    "h_shufa": {
        "hook": "全球唯一：写字，写成了世界非遗",
        "fun_facts": [
            "篆、隶、楷、行、草五体，就是一部汉字书体演变史",
            "“永字八法”——一个字练全八种笔画",
            "工具本身也是非遗：湖笔、徽墨、端砚各自成项",
        ],
        "wow_numbers": [
            {"value": 5, "suffix": "体", "label": "篆隶楷行草"},
            {"value": 3000, "suffix": "年", "label": "甲骨文至今"},
            {"value": 1, "suffix": "门", "label": "全球唯一书写非遗"},
        ],
    },
    "h_yueju": {
        "hook": "全女班唱红上海，《梁祝》被叫作中国的罗密欧与朱丽叶",
        "fun_facts": [
            "1906 年诞生于浙江嵊州，起步时是人称“的笃班”的小歌班",
            "首创女子越剧，全由女演员饰演，清丽婉转成一派",
            "《梁山伯与祝英台》《红楼梦》誉为中国版罗密欧与朱丽叶",
        ],
        "wow_numbers": [
            {"value": 1906, "suffix": "年", "label": "诞生于嵊州"},
            {"value": 2, "suffix": "大", "label": "中国第二大剧种"},
            {"value": 100, "suffix": "%", "label": "女子越班"},
        ],
    },
    "h_chuanju": {
        "hook": "脸在观众眼前变了，谁也没看清怎么变的",
        "fun_facts": [
            "变脸有抹脸、吹脸、扯脸三种法门，全靠长年练功",
            "五腔共和：昆腔、高腔、胡琴、弹戏、灯调同台",
            "高腔是“徒歌帮腔”，不用管乐；吐火靠松香粉喷燃",
        ],
        "wow_numbers": [
            {"value": 5, "suffix": "腔", "label": "五腔共和"},
            {"value": 3, "suffix": "法", "label": "抹吹扯变脸"},
            {"value": 0, "suffix": "件", "label": "高腔无管乐"},
        ],
    },
    "h_yueju_gd": {
        "hook": "唱着广州话，跟着红船跑遍南洋",
        "fun_facts": [
            "戏班旧时乘红船沿江演出，“红船子弟”由此而来",
            "以梆子、二黄为主体，融入南音、木鱼、龙舟等广东曲调",
            "2009 年入选联合国教科文组织人类非遗代表作名录",
        ],
        "wow_numbers": [
            {"value": 2009, "suffix": "年", "label": "入选人类非遗"},
            {"value": 2, "suffix": "腔", "label": "梆子与二黄"},
            {"value": 1, "suffix": "水路", "label": "红船戏班"},
        ],
    },
    "h_changdiao": {
        "hook": "一口气唱出草原起伏，“诺古拉”在颤",
        "fun_facts": [
            "“诺古拉”是波状装饰音，真假声结合，全靠师徒口传心授",
            "一首歌常持续数分钟，节奏自由、旋律舒展",
            "2005 年与呼麦联合入选人类非遗，被誉为“草原音乐活化石”",
        ],
        "wow_numbers": [
            {"value": 2005, "suffix": "年", "label": "联合入选人类非遗"},
            {"value": 3, "suffix": "分钟+", "label": "一曲时长"},
            {"value": 2, "suffix": "琴", "label": "马头琴托布秀尔"},
        ],
    },
    "h_weifang": {
        "hook": "扎糊绘放四个字，1984 年起全城放飞",
        "fun_facts": [
            "四艺：扎要骨架对称、糊要绢面平整、绘要红黄绿对比、放要调准提线",
            "1984 年起举办潍坊国际风筝会，“风筝之都”名号由此而来",
            "与北京、天津、南通风筝并称中国四大风筝流派",
        ],
        "wow_numbers": [
            {"value": 4, "suffix": "艺", "label": "扎糊绘放"},
            {"value": 1984, "suffix": "年", "label": "首届国际风筝会"},
            {"value": 4, "suffix": "大", "label": "四大风筝流派"},
        ],
    },
    "h_tulou": {
        "hook": "夯土墙掺糯米红糖，一楼住下一整族人",
        "fun_facts": [
            "夯土掺石灰、糯米浆、红糖增强黏性，墙厚可达一米以上",
            "一楼住人、二楼储粮、三楼当谷仓，全族聚居一楼",
            "永定承启楼号称“土楼之王”，圆楼防火防盗防震",
        ],
        "wow_numbers": [
            {"value": 800, "suffix": "人+", "label": "一楼同居"},
            {"value": 1, "suffix": "米+", "label": "夯墙厚度"},
            {"value": 3, "suffix": "层", "label": "住人储粮囤谷"},
        ],
    },
    "h_zhenjiu": {
        "hook": "一根毫针，让世界记住了中医",
        "fun_facts": [
            "针法与灸法两部分：毫针刺穴位，艾绒温经络",
            "讲究进针角度、深度与“得气”，循十四经脉取穴",
            "2010 年列入联合国教科文组织人类非遗代表作名录",
        ],
        "wow_numbers": [
            {"value": 2010, "suffix": "年", "label": "入选人类非遗"},
            {"value": 2, "suffix": "法", "label": "针法与灸法"},
            {"value": 14, "suffix": "经", "label": "十四经脉取穴"},
        ],
    },
    "h_kaoya": {
        "hook": "108 片，片片带皮：一只鸭的最高礼遇",
        "fun_facts": [
            "全聚德挂炉用果木明火，便宜坊焖炉靠炉壁暗火，两派各有拥趸",
            "“一鸭三吃”：片皮蘸糖、鸭肉卷饼、鸭架熬汤",
            "挂糖色晾坯后入炉，约四十到六十分钟出炉",
        ],
        "wow_numbers": [
            {"value": 108, "suffix": "片", "label": "片片带皮"},
            {"value": 2, "suffix": "派", "label": "挂炉与焖炉"},
            {"value": 60, "suffix": "分钟", "label": "入炉出炉"},
        ],
    },
    "h_poshui": {
        "hook": "被泼得越湿，收到的祝福越多",
        "fun_facts": [
            "傣历新年历时三至四天：浴佛、泼水、丢包、赛龙舟、放高升",
            "泼水讲究次序：先佛、后长、再同辈",
            "2006 年列入第一批国家级非物质文化遗产名录",
        ],
        "wow_numbers": [
            {"value": 2006, "suffix": "年", "label": "首批国家级非遗"},
            {"value": 4, "suffix": "天", "label": "新年节期"},
            {"value": 3, "suffix": "序", "label": "先佛后长再同辈"},
        ],
    },
    "h_hezhe": {
        "hook": "把鱼皮做成衣服：全世界只剩这里",
        "fun_facts": [
            "赫哲族世居黑龙江、乌苏里江畔，素有“鱼皮部落”之称",
            "鱼皮要木槌反复捶打才柔软，用鱼皮线缝制，轻便防水抗风",
            "纹样多取鱼尾、浪花、鹿角等自然形态",
        ],
        "wow_numbers": [
            {"value": 1, "suffix": "族", "label": "鱼皮为衣仅此"},
            {"value": 1000, "suffix": "+", "label": "年 明代已记载"},
            {"value": 0, "suffix": "寸", "label": "布 通身不用"},
        ],
    },
    "h_nonglewu": {
        "hook": "象帽甩出 24 米彩带，转进人类非遗",
        "fun_facts": [
            "象帽彩带按长度分级，最长可达 24 米，甩出平转、立转、旋回转",
            "乐队起乐、杂甩入场、叠罗汉、即兴竞演、全场共舞，一气呵成",
            "2009 年列入联合国教科文组织人类非遗代表作名录",
        ],
        "wow_numbers": [
            {"value": 2009, "suffix": "年", "label": "入选人类非遗"},
            {"value": 24, "suffix": "米", "label": "象帽顶翎"},
            {"value": 3, "suffix": "式", "label": "平转立转旋回"},
        ],
    },
    "h_xiuyan": {
        "hook": "红山先民五千年前，就用它琢玉",
        "fun_facts": [
            "中国四大名玉之一，分蛇纹石质玉与透闪石质玉（析木玉）",
            "红山文化玉器即取材于此——玉猪龙的原料就来自岫岩",
            "玉雕讲究量料取材、因色施艺，“花玉巧色”最见功力",
        ],
        "wow_numbers": [
            {"value": 5000, "suffix": "年", "label": "红山用玉"},
            {"value": 4, "suffix": "大", "label": "中国四大名玉"},
            {"value": 8, "suffix": "道", "label": "相玉到上蜡"},
        ],
    },
    "h_guxiu": {
        "hook": "以针代笔：绣出来的画，几乎骗过眼睛",
        "fun_facts": [
            "明代上海顾名世家族“露香园绣”，韩希孟《洗马图》等“画绣”最负盛名",
            "劈丝细过发色，兼用施针、虚实针表现水墨浓淡",
            "成品几与原画无异，诗书画印一并入绣",
        ],
        "wow_numbers": [
            {"value": 500, "suffix": "年", "label": "明代露香园始"},
            {"value": 2, "suffix": "绝", "label": "针代笔线代墨"},
            {"value": 1, "suffix": "派", "label": "海派绣源头"},
        ],
    },
    "h_tuiuang": {
        "hook": "不用机器抛光：光泽是手掌推出来的",
        "fun_facts": [
            "最后以手掌蘸麻油、砖灰反复推擦，推出镜面光泽",
            "与福州脱胎漆器、成都漆器并称中国三大漆器",
            "要过裱布、刮灰、上漆阴干数十道工序",
        ],
        "wow_numbers": [
            {"value": 3, "suffix": "大", "label": "中国三大漆器"},
            {"value": 30, "suffix": "道+", "label": "髹饰工序"},
            {"value": 1000, "suffix": "+", "label": "年 唐代已载"},
        ],
    },
    "h_zhuxian": {
        "hook": "宋代开封贴的门神，今天还在贴",
        "fun_facts": [
            "中国木版年画源头之一，北宋兴起于开封朱仙镇",
            "色版五六至八九不等，用槐黄、木红、葵绿、铜黑等矿物植物色",
            "与杨柳青、潍坊、桃花坞并称中国四大年画",
        ],
        "wow_numbers": [
            {"value": 1000, "suffix": "年", "label": "北宋至今"},
            {"value": 9, "suffix": "版", "label": "色版多至八九"},
            {"value": 4, "suffix": "大", "label": "中国四大年画"},
        ],
    },
    "h_hanxiu": {
        "hook": "“花无正果、热闹为先”——楚地绣法有多敢用色",
        "fun_facts": [
            "上承楚绣扁平金线、浓墨重彩的遗风",
            "多用金线盘绣，成品饱满厚重，色彩浓艳对比强烈",
            "尤擅绣制戏衣、帐幔与盘金龙凤",
        ],
        "wow_numbers": [
            {"value": 2000, "suffix": "+", "label": "年 楚绣遗风"},
            {"value": 3, "suffix": "法", "label": "铺盘缀三步"},
            {"value": 1, "suffix": "针", "label": "齐针为主"},
        ],
    },
    "h_xiangxiu": {
        "hook": "鬅毛针一落，老虎的毛就“炸”起来了",
        "fun_facts": [
            "首创鬅毛针表现狮虎皮毛的蓬松质感",
            "双面全异绣：同一底料正反两面绣出不同形象，反面藏头",
            "用色借鉴国画渲染，靠色线掺针过渡",
        ],
        "wow_numbers": [
            {"value": 4, "suffix": "大", "label": "中国四大名绣"},
            {"value": 2, "suffix": "面", "label": "正反两景"},
            {"value": 1, "suffix": "针", "label": "鬅毛针独创"},
        ],
    },
    "h_dongda": {
        "hook": "没有指挥、没有伴奏，多声部自己长出来",
        "fun_facts": [
            "多声部、无指挥、无伴奏的民间合唱，一人领唱众人相和",
            "模拟蝉鸣鸟啭流水之声，声音大歌最见功力",
            "2009 年列入联合国教科文组织人类非遗代表作名录",
        ],
        "wow_numbers": [
            {"value": 2009, "suffix": "年", "label": "入选人类非遗"},
            {"value": 0, "suffix": "件", "label": "伴奏乐器"},
            {"value": 3, "suffix": "类", "label": "声音叙事童声"},
        ],
    },
    "h_lizu": {
        "hook": "黄道婆都来学：三千年的织机还挂在腰上",
        "fun_facts": [
            "元代黄道婆向黎族学擀弹纺织之法，再传至江南，改写了棉纺织史",
            "踞腰织机以腰为支点，坐地而织",
            "2009 年列入联合国教科文组织人类非遗代表作名录",
        ],
        "wow_numbers": [
            {"value": 2009, "suffix": "年", "label": "入选人类非遗"},
            {"value": 3000, "suffix": "年", "label": "海南已用此技"},
            {"value": 1, "suffix": "腰", "label": "织机支点"},
        ],
    },
    "h_liangping": {
        "hook": "头大身短的门神，憨得有理",
        "fun_facts": [
            "用二合二灰土纸印制，色版以红、绿、黄为主",
            "独创印金与粉蜡笺工艺，门神画与“洋仙”（戏曲故事）并重",
            "人物造型头大身短、憨态可掬",
        ],
        "wow_numbers": [
            {"value": 3, "suffix": "色", "label": "红绿黄为主"},
            {"value": 300, "suffix": "年", "label": "清康熙至今"},
            {"value": 2, "suffix": "绝", "label": "印金与粉蜡"},
        ],
    },
    "h_laran": {
        "hook": "蜡裂出的“冰纹”，全世界没有第二张一样",
        "fun_facts": [
            "铜刀蘸蜂蜡绘图，入蓝靛缸浸染，去蜡才现白花",
            "蜡液自然龟裂形成的冰纹独一无二，每张都是孤品",
            "纹样多为涡旋、铜鼓、鸟蝶、鱼龙，被称作“穿在身上的史诗”",
        ],
        "wow_numbers": [
            {"value": 100, "suffix": "%", "label": "手工画蜡"},
            {"value": 2, "suffix": "色", "label": "蓝白两色"},
            {"value": 2000, "suffix": "+", "label": "年 秦汉已载"},
        ],
    },
    "h_tangka": {
        "hook": "画错一笔整幅重来：度量经里的毫米级",
        "fun_facts": [
            "起稿要依《造像度量经》比例打线，差之毫厘就要重来",
            "矿物颜料分层上色，历经百年色彩如新",
            "开脸点睛是最后一道，也是最神圣的一道",
        ],
        "wow_numbers": [
            {"value": 15, "suffix": "世纪", "label": "勉唐画派创立"},
            {"value": 100, "suffix": "年+", "label": "色彩如新"},
            {"value": 1, "suffix": "经", "label": "造像度量经"},
        ],
    },
    "h_huaer": {
        "hook": "西北人把山歌唱成了“情人节”",
        "fun_facts": [
            "流传于青海、甘肃、宁夏、新疆多民族之间",
            "曲令众多、即兴对唱，一年开“花儿会”数十场，动辄数万人",
            "2009 年列入联合国教科文组织人类非遗代表作名录",
        ],
        "wow_numbers": [
            {"value": 2009, "suffix": "年", "label": "入选人类非遗"},
            {"value": 30, "suffix": "场+", "label": "一年花儿会"},
            {"value": 4, "suffix": "省", "label": "四省流传"},
        ],
    },
    "h_shanhuaer": {
        "hook": "歌词夹着小经文：回族山野里的“密码”",
        "fun_facts": [
            "山花儿多用假声起调，高亢悠长",
            "歌词以小经文（阿拉伯字母拼写汉语）与汉语混用",
            "与甘肃花儿同源，风格更内敛",
        ],
        "wow_numbers": [
            {"value": 2, "suffix": "文", "label": "小经文加汉语"},
            {"value": 1, "suffix": "声", "label": "假声起调"},
            {"value": 1000, "suffix": "年", "label": "元明口传至今"},
        ],
    },
    "h_mukamu": {
        "hook": "完整唱一遍要 24 小时：一部装进音乐的史诗",
        "fun_facts": [
            "分穹乃额麦、达斯坦、麦西热甫三部分，含曲令 300 余首",
            "完整演唱约 24 小时，相当于从早唱到第二天",
            "2005 年入选联合国教科文组织人类非遗代表作名录",
        ],
        "wow_numbers": [
            {"value": 24, "suffix": "小时", "label": "完整唱完"},
            {"value": 300, "suffix": "曲", "label": "曲令三百余首"},
            {"value": 2005, "suffix": "年", "label": "入选人类非遗"},
        ],
    },
    "h_gspiy": {
        "hook": "一人五根签子，走跑跳打全在他手上",
        "fun_facts": [
            "一人操控五根签子完成走跑跳打",
            "以道情（道教音乐遗存）演唱，声腔苍凉遒劲",
            "乐队仅四胡、水梆、干鼓，唱腔分慢板与飞板",
        ],
        "wow_numbers": [
            {"value": 5, "suffix": "签", "label": "一人操控"},
            {"value": 2, "suffix": "板", "label": "慢板与飞板"},
            {"value": 3, "suffix": "乐", "label": "四胡水梆干鼓"},
        ],
    },
    "h_hkqingjiao": {
        "hook": "抢包山：限时三分钟，爬上平安包堆成的山",
        "fun_facts": [
            "醮期内全岛斋戒素食，居民扎制平安包山",
            "飘色巡游中，儿童扮成古今人物立于高杆之上",
            "2011 年列入第三批国家级非物质文化遗产代表性项目名录",
        ],
        "wow_numbers": [
            {"value": 2011, "suffix": "年", "label": "国家级非遗"},
            {"value": 3, "suffix": "分钟", "label": "抢包山限时"},
            {"value": 4, "suffix": "月", "label": "农历四月建醮"},
        ],
    },
    "h_motauju": {
        "hook": "葡语+粤语+马来语：澳门有一种“混血话”",
        "fun_facts": [
            "土生土语（Patuá）以葡萄牙语为骨架，吸收粤语、马来语等词汇",
            "借语调、语码转换与文化差异制造幽默",
            "2021 年列入第五批国家级非物质文化遗产代表性项目名录",
        ],
        "wow_numbers": [
            {"value": 2021, "suffix": "年", "label": "第五批国家级非遗"},
            {"value": 3, "suffix": "语", "label": "葡粤马来混血"},
            {"value": 20, "suffix": "世纪", "label": "澳门成型"},
        ],
    },
}


def main() -> None:
    items = json.loads(ITEMS.read_text(encoding="utf-8"))
    ids = {it["id"] for it in items}
    missing = set(ENRICH) - ids
    if missing:
        raise SystemExit(f"ENRICH 中有未知 id: {sorted(missing)}")
    covered = 0
    for it in items:
        e = ENRICH.get(it["id"])
        if not e:
            raise SystemExit(f"缺少新颖介绍: {it['id']} {it['name']}")
        it["hook"] = e["hook"]
        it["fun_facts"] = e["fun_facts"]
        it["wow_numbers"] = e["wow_numbers"]
        covered += 1
    ITEMS.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"已注入 {covered}/{len(items)} 项 hook + fun_facts + wow_numbers")


if __name__ == "__main__":
    main()
