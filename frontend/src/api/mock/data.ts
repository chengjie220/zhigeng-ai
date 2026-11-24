import type {
  NoticeDetail,
  SourceItem,
  SourceProbeResult,
  SourceSearchResult,
} from '@/types/notice'

/**
 * 示例数据（Mock）—— 仅用于前端独立开发与联调前演示。
 * 全部为虚构示例，不是真实校园通知，接入真实后端后自动弃用。
 */

export const mockSources: SourceItem[] = [
  {
    id: 1,
    name: '成都大学官网 · 通知公告',
    url: 'https://www.cdu.edu.cn/index/tzgg.htm',
    content_types: '校级通知、活动',
    last_synced_at: '2026-11-23 09:30',
    enabled: true,
  },
  {
    id: 2,
    name: '创新创业学院',
    url: 'https://cxcyxy.cdu.edu.cn/',
    content_types: '竞赛、创新创业',
    last_synced_at: '2026-11-23 09:32',
    enabled: true,
  },
  {
    id: 3,
    name: '共青团成都大学委员会',
    url: 'https://tuanwei.cdu.edu.cn/',
    content_types: '实践、志愿服务',
    last_synced_at: '2026-11-22 21:10',
    enabled: true,
  },
]

/** Mock 搜索结果：模拟搜索引擎返回的校园网站候选 */
export const mockSourceSearchResults: SourceSearchResult[] = [
  {
    title: '成都大学教务处 - 通知公告',
    url: 'https://jwc.cdu.edu.cn/index/tzgg.htm',
    snippet: '发布选课、考试、成绩、学籍等教学相关通知，提供最新公告列表。',
    domain: 'jwc.cdu.edu.cn',
  },
  {
    title: '成都大学学生工作部（处） - 通知公告',
    url: 'https://xsc.cdu.edu.cn/index/tzgg.htm',
    snippet: '奖助学金评定、宿舍管理、思政教育等学生事务通知与公示。',
    domain: 'xsc.cdu.edu.cn',
  },
  {
    title: '成都大学图书馆 - 读者通知',
    url: 'https://lib.cdu.edu.cn/xxfw/tzgg.htm',
    snippet: '开放时间调整、数据库试用、阅读推广活动与讲座通知。',
    domain: 'lib.cdu.edu.cn',
  },
  {
    title: '成都大学招生就业处 - 就业信息',
    url: 'https://zjy.cdu.edu.cn/jyxx/jygg.htm',
    snippet: '校园招聘会、实习实践、就业政策与宣讲会信息。',
    domain: 'zjy.cdu.edu.cn',
  },
]

/** Mock 网址探测结果 */
export function mockProbeSource(url: string): SourceProbeResult {
  if (!/^https?:\/\//.test(url)) {
    return {
      ok: false,
      name: '',
      reason: '请填写以 http:// 或 https:// 开头的完整网址',
      sample_count: 0,
      samples: [],
    }
  }
  const host = url.replace(/^https?:\/\//, '').split('/')[0] || '校园网站'
  return {
    ok: true,
    name: host.split('.')[0] + ' · 通知公告',
    reason: '识别到 4 条疑似通知标题，可以作为列表页添加',
    sample_count: 4,
    samples: [
      '关于组织开展 2026 年度校级竞赛申报工作的通知',
      '2026 年奖学金拟获奖名单公示',
      '学术讲座预告：人工智能与教育变革',
      '寒假社会实践活动志愿者招募通知',
    ],
  }
}

export const mockNotices: NoticeDetail[] = [
  {
    id: 1,
    title: '【示例】关于举办第八届大学生创新创业大赛校内选拔赛的通知',
    source_id: 2,
    source_name: '创新创业学院',
    category: '竞赛',
    published_at: '2026-11-20',
    deadline_date: '2026-12-10',
    deadline_time: null,
    summary: '面向在校本科生和研究生的创新创业大赛校内选拔，优胜项目推荐参加省级竞赛。',
    ai_status: 'done',
    original_url: 'https://example.com/notice/1',
    audience: ['在校本科生', '在校研究生'],
    requirements: ['组队人数不超过 5 人', '提交商业计划书一份', '附项目介绍 PPT'],
    application_method: '通过创新创业学院官网提交报名材料',
    evidence: {
      deadline_date: '请于 2026 年 12 月 10 日前将报名材料发送至指定邮箱。',
      application_method: '报名材料通过创新创业学院官网通知附件下载模板后提交。',
    },
    extra: {
      '级别': '校级选拔，优胜项目推荐参加省级竞赛',
      '团队规模': '每队人数不超过 5 人',
    },
    attachments: [{ name: '报名表模板.docx', url: 'https://example.com/attachment/1' }],
    body_text:
      '为培养大学生创新创业能力，激发学生的创新思维与创业热情，学校决定举办第八届大学生创新创业大赛校内选拔赛。现将有关事项通知如下。\n' +
      '一、参赛对象：全日制在校本科生、研究生均可报名，以团队形式参赛，每队人数不超过 5 人，鼓励跨学院、跨专业组队。\n' +
      '二、材料要求：参赛团队需提交商业计划书一份，并附项目介绍 PPT，内容应包含项目背景、产品方案、市场分析与财务测算。\n' +
      '三、报名方式：报名材料通过创新创业学院官网通知附件下载模板后提交。\n' +
      '四、时间安排：请于 2026 年 12 月 10 日前将报名材料发送至指定邮箱。邮箱地址为 cxcy@example.edu.cn，逾期不再受理。校内评审结果将于 12 月下旬公布，优胜项目推荐参加省级竞赛。',
  },
  {
    id: 2,
    title: '【示例】“青春志愿行”寒假社会实践活动招募通知',
    source_id: 3,
    source_name: '共青团成都大学委员会',
    category: '实践',
    published_at: '2026-11-18',
    deadline_date: '2026-12-05',
    deadline_time: '18:00',
    summary: '招募寒假社会实践志愿者，服务社区与乡村调研，提供志愿服务时长认定。',
    ai_status: 'done',
    original_url: 'https://example.com/notice/2',
    audience: ['在校本科生'],
    requirements: ['年满 18 周岁', '能保证连续服务不少于 7 天'],
    application_method: '校团委现场报名',
    evidence: {
      deadline_date: '报名截止时间为 12 月 5 日 18:00。',
      application_method: '请携带学生证到校团委办公室现场报名。',
    },
    extra: {
      '实践地点': '社区、乡村（具体方向报名后分配）',
      '服务时长': '每支团队服务周期不少于 7 天',
    },
    attachments: [],
    body_text:
      '为引导青年学生在社会实践中受教育、长才干、作贡献，校团委决定组织开展“青春志愿行”寒假社会实践活动，现面向全校招募志愿者。\n' +
      '一、服务内容：围绕社区服务、乡村调研、青少年课业辅导等方向组建实践团队，每支团队服务周期不少于 7 天。\n' +
      '二、报名条件：年满 18 周岁的全日制在校本科生，身体健康，能保证连续服务时间，服从统一安排。\n' +
      '三、报名方式：请携带学生证到校团委办公室现场报名。\n' +
      '四、时间安排：报名截止时间为 12 月 5 日 18:00。服务结束后由校团委统一认定志愿服务时长，表现突出者予以表彰。',
  },
  {
    id: 3,
    title: '【示例】人工智能与教育变革学术讲座预告',
    source_id: 1,
    source_name: '成都大学官网 · 通知公告',
    category: '讲座',
    published_at: '2026-11-22',
    deadline_date: '2026-11-28',
    deadline_time: null,
    summary: '校级学术讲座，探讨 AI 技术对高等教育教学模式的影响，面向全校师生开放。',
    ai_status: 'done',
    original_url: 'https://example.com/notice/3',
    audience: ['全校师生'],
    requirements: ['提前 15 分钟入场'],
    application_method: '无需报名，直接到场',
    evidence: {
      deadline_date: '讲座将于 11 月 28 日下午举行。',
      application_method: '本次讲座向全校师生开放，无需报名。',
    },
    extra: {
      '时间': '11 月 28 日下午',
      '地点': '学术报告厅',
      '主讲人': '知名学者（原文未写明姓名）',
      '主办单位': '学校',
    },
    attachments: [],
    body_text:
      '为拓宽学生学术视野，了解人工智能技术对高等教育教学模式的影响，学校特邀请知名学者作“人工智能与教育变革”专题报告。\n' +
      '一、时间地点：讲座将于 11 月 28 日下午举行。地点为学术报告厅，报告时长约 90 分钟，含 20 分钟互动提问环节。\n' +
      '二、参加方式：本次讲座向全校师生开放，无需报名。请有意参加的同学提前 15 分钟入场，讲座期间请将手机调至静音。\n' +
      '三、内容提要：大模型技术进展、智能教学工具在课堂中的应用、生成式 AI 与学术诚信边界。\n' +
      '四、其他：本次讲座计入第二课堂学分，需现场签到。',
  },
  {
    id: 4,
    title: '【示例】关于组织申报大学生创新创业训练计划项目的通知',
    source_id: 2,
    source_name: '创新创业学院',
    category: '竞赛',
    published_at: '2026-11-15',
    deadline_date: '2026-12-20',
    deadline_time: null,
    summary: '国家级、省级、校级大创项目申报，支持创新训练、创业训练与创业实践三类项目。',
    ai_status: 'done',
    original_url: 'https://example.com/notice/4',
    audience: ['在校本科生'],
    requirements: ['项目负责人须为本科生', '配备指导教师一名', '填写申报书'],
    application_method: '学院统一报送',
    evidence: {
      deadline_date: '各学院于 12 月 20 日前完成推荐报送。',
    },
    attachments: [{ name: '项目申报书.docx', url: 'https://example.com/attachment/4' }],
    body_text:
      '为进一步强化大学生创新实践能力培养，根据上级文件要求，现组织申报本年度大学生创新创业训练计划项目。\n' +
      '一、项目类别：分为创新训练项目、创业训练项目和创业实践项目三类，其中国家级、省级项目由学校择优推荐。\n' +
      '二、申报要求：项目负责人须为全日制在校本科生，每个项目须配备指导教师一名，填写《项目申报书》并附相关支撑材料。\n' +
      '三、报送方式：各学院于 12 月 20 日前完成推荐报送。纸质材料交教务处实践教学科，电子版发送至指定邮箱。\n' +
      '四、其他事项：项目执行周期一般为一年，中期检查与结题验收按学校相关管理办法执行。',
  },
  {
    id: 5,
    title: '【示例】2026 年度国家奖学金拟获奖名单公示',
    source_id: 1,
    source_name: '成都大学官网 · 通知公告',
    category: '公示',
    published_at: '2026-11-19',
    deadline_date: '2026-11-26',
    deadline_time: null,
    summary: '本年度国家奖学金拟获奖学生名单予以公示，公示期内可实名提出异议。',
    ai_status: 'done',
    original_url: 'https://example.com/notice/5',
    audience: ['全校学生'],
    requirements: [],
    application_method: null,
    evidence: {
      deadline_date: '一、公示期：自 11 月 19 日起至 11 月 26 日止，共 5 个工作日。',
      '公示对象': '现将 2026 年度国家奖学金拟获奖学生名单予以公示。',
      '异议反馈': '公示期内如有异议，请以实名方式发送至 jxj@cdu.example.edu.cn',
      '公示单位': '学生工作部（处）负责本次公示与异议受理。',
    },
    extra: {
      '公示期': '11 月 19 日至 11 月 26 日',
      '公示对象': '2026 年度国家奖学金拟获奖学生',
      '异议反馈': '实名发送至 jxj@cdu.example.edu.cn',
      '公示单位': '学生工作部（处）',
    },
    attachments: [],
    body_text:
      '现将 2026 年度国家奖学金拟获奖学生名单予以公示。\n' +
      '一、公示期：自 11 月 19 日起至 11 月 26 日止，共 5 个工作日。\n' +
      '二、公示对象：2026 年度国家奖学金拟获奖学生，名单详见附件。\n' +
      '三、异议反馈：公示期内如有异议，请以实名方式发送至 jxj@cdu.example.edu.cn，逾期不再受理。\n' +
      '四、公示单位：学生工作部（处）负责本次公示与异议受理。',
  },
  {
    id: 6,
    title: '【示例】数学建模竞赛赛前培训安排通知',
    source_id: 2,
    source_name: '创新创业学院',
    category: '讲座',
    published_at: '2026-11-21',
    deadline_date: '2026-12-01',
    deadline_time: null,
    summary: '为参赛学生提供数学建模方法与论文写作培训，共四讲，需提前登记。',
    ai_status: 'pending',
    original_url: 'https://example.com/notice/6',
    audience: [],
    requirements: [],
    application_method: null,
    evidence: {},
    attachments: [],
    body_text:
      '为帮助参赛同学系统掌握数学建模方法与论文写作规范，创新创业学院将组织赛前系列培训，共四讲。\n' +
      '第一讲：数学建模基本流程与常用模型；第二讲：数据处理与常用软件工具；第三讲：论文结构与写作规范；第四讲：历年赛题解析。\n' +
      '培训地点为创新创业学院 302 教室，每讲时间为 19:00—21:00，需提前登记，名额 120 人。\n' +
      '请参加培训的同学自带笔记本电脑，并提前完成报名登记。',
  },
  {
    id: 7,
    title: '【示例】关于开展“我为同学办实事”主题征集活动的通知',
    source_id: 1,
    source_name: '成都大学官网 · 通知公告',
    category: '活动',
    published_at: '2026-11-10',
    deadline_date: '2026-11-18',
    deadline_time: null,
    summary: '面向全校学生征集校园服务改进建议，设优秀提案奖。（该示例已过截止日期）',
    ai_status: 'done',
    original_url: 'https://example.com/notice/7',
    audience: ['全校学生'],
    requirements: ['提案字数不少于 500 字'],
    application_method: '线上提交',
    evidence: {
      deadline_date: '征集时间截至 11 月 18 日。',
    },
    attachments: [],
    body_text:
      '为切实服务同学成长成才，畅通校园治理参与渠道，现面向全校学生开展“我为同学办实事”主题征集活动。\n' +
      '一、征集内容：围绕教学管理、后勤保障、校园文化、权益维护等方面提出改进建议，提案字数不少于 500 字。\n' +
      '二、提交方式：通过线上表单提交，需注明姓名、学院与联系方式，可附调研数据或图片材料。\n' +
      '三、时间安排：征集时间截至 11 月 18 日。优秀提案将纳入学校相关部门办理清单，并评选优秀提案奖。',
  },
  {
    id: 8,
    title: '【示例】程序设计校内选拔赛报名通知（正文较长的示例）',
    source_id: 2,
    source_name: '创新创业学院',
    category: '竞赛',
    published_at: '2026-11-16',
    deadline_date: '2026-12-08',
    deadline_time: '23:59',
    summary: '校内程序设计选拔赛，优胜者组队参加省赛，设个人赛与团队赛两个赛道。',
    ai_status: 'failed',
    original_url: 'https://example.com/notice/8',
    audience: [],
    requirements: [],
    application_method: null,
    evidence: {},
    attachments: [],
    body_text:
      '为选拔优秀学生参加省级程序设计竞赛，学校决定举办校内选拔赛，设个人赛与团队赛两个赛道。\n' +
      '一、参赛对象：全校在读本科生，个人赛不限年级；团队赛每队 3 人，可跨年级组队，每队限报一名指导教师。\n' +
      '二、赛制安排：比赛采用 ACM 赛制，时长 5 小时，共 10 道题目，涵盖数据结构、图论、动态规划、字符串处理等方向。\n' +
      '三、评分规则：以通过题目数量排名，数量相同时按总罚时升序排名，罚时由提交次数与通过时间共同决定。\n' +
      '四、报名方式：登录学校竞赛管理系统填写报名信息，个人赛与团队赛可同时报名，团队赛由队长统一提交。\n' +
      '五、时间安排：报名截止时间为 12 月 8 日 23:59，比赛定于 12 月 14 日在实验楼机房举行，具体场次另行通知。\n' +
      '六、注意事项：比赛期间禁止使用任何生成式人工智能工具与外部网络资料，一经发现取消参赛资格并通报学院。\n' +
      '七、奖励办法：个人赛与团队赛各设一等奖 2 名、二等奖 4 名、三等奖 8 名，获奖者可优先入选学校集训队。',
  },
]
