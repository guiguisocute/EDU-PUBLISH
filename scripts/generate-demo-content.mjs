import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DEMO_DIR = path.join(ROOT, 'content', 'card', 'demo');

const q = (s) => `"${String(s).replace(/"/g, '\\"')}"`;
const toYamlArray = (arr) => `[${arr.map((item) => q(item)).join(', ')}]`;

const DEMOS = [
  {
    id: '20251201-demo-normal-001',
    school_slug: 'info-engineering',
    title: '关于开展本学期教学检查工作的通知',
    description: '为进一步规范教学管理，提升教学质量，现开展本学期中期教学检查工作。',
    published: '2025-12-01T10:00:00+08:00',
    category: '通知公告',
    tags: ['教务安排', '材料提交'],
    pinned: false,
    cover: 'https://picsum.photos/seed/edu-normal/800/400',
    badge: '',
    extra_url: '',
    start_at: '',
    end_at: '',
    source: { channel: '学院通知', sender: '教务处' },
    attachments: [],
    body: `# 关于开展本学期教学检查工作的通知

各教研室、实验室：

为进一步规范教学管理，提升教学质量，现开展本学期中期教学检查工作。

## 检查内容

1. 教学进度执行情况
2. 课堂教学质量
3. 实验教学运行状态

### 重点事项

- [ ] 各教研室提交教学日志
- [ ] 实验室完成安全自查
- [ ] 汇总学生评教反馈

> **注意**：请各单位高度重视，确保材料真实、完整。

## 时间安排

| 阶段 | 时间 | 责任人 |
| --- | --- | --- |
| 自查 | 12月1日-5日 | 各教研室主任 |
| 汇总 | 12月6日-8日 | 教学秘书 |
| 反馈 | 12月9日 | 分管副院长 |

\`\`\`text
提交路径：教务系统 → 教学检查 → 中期检查
\`\`\`

请各单位按时完成。`,
  },
  {
    id: '20251128-demo-long-title-001',
    school_slug: 'info-engineering',
    title: '关于做好2025-2026学年第二学期期末考试安排及成绩录入工作的紧急通知',
    description: '期末考试安排通知，请各教研室及时查阅。',
    published: '2025-11-28T09:00:00+08:00',
    category: '通知公告',
    tags: ['教务安排'],
    cover: 'https://picsum.photos/seed/edu-exam/800/400',
    source: { channel: '学院通知', sender: '教务处' },
  },
  {
    id: '20251127-demo-short-title-001',
    school_slug: 'student-affairs',
    title: '值班表',
    description: '本周值班安排已更新，请相关同学查阅。',
    published: '2025-11-27T14:00:00+08:00',
    category: '通知公告',
    tags: ['值班安排'],
    source: { channel: '中心公告', sender: '学工部' },
  },
  {
    id: '20251125-demo-long-desc-001',
    school_slug: 'info-engineering',
    title: '关于组织参加全国大学生创新创业大赛的通知',
    description: '为深入贯彻落实国家创新驱动发展战略，培养学生创新精神和实践能力，激发学生创新创业热情，经研究决定组织学生参加第十二届全国大学生创新创业大赛。本次大赛面向全校全日制在读本科生和研究生，鼓励跨学科、跨年级组队参赛，每支参赛队伍人数不超过5人，指导教师不超过2人。',
    published: '2025-11-25T08:30:00+08:00',
    category: '竞赛相关',
    tags: ['报名事项', '截止提醒'],
    cover: 'https://picsum.photos/seed/edu-innovation/800/400',
    source: { channel: '学院通知', sender: '教务处' },
  },
  {
    id: '20251124-demo-short-desc-001',
    school_slug: 'student-affairs',
    title: '紧急通知：明日停课',
    description: '因天气原因停课一天。',
    published: '2025-11-24T20:00:00+08:00',
    category: '通知公告',
    tags: ['截止提醒'],
    source: { channel: '中心公告', sender: '学工部' },
  },
  {
    id: '20251120-demo-with-cover-001',
    school_slug: 'literature',
    title: '校园文化节系列活动预告',
    description: '一年一度的校园文化节即将开幕，精彩活动等你参与。',
    published: '2025-11-20T10:00:00+08:00',
    category: '二课活动',
    tags: ['活动通知'],
    cover: 'https://picsum.photos/seed/edu-culture/800/400',
    source: { channel: '学院通知', sender: '团委' },
  },
  {
    id: '20251118-demo-no-cover-001',
    school_slug: 'info-engineering',
    title: '关于提交科研项目中期报告的通知',
    description: '请已立项的课题组按时提交中期检查报告。',
    published: '2025-11-18T09:00:00+08:00',
    category: '通知公告',
    tags: ['材料提交'],
    source: { channel: '学院通知', sender: '科研处' },
  },
  {
    id: '20251115-demo-placeholder-001',
    school_slug: 'info-engineering',
    title: '实验室安全培训考核通知',
    description: '所有进入实验室的学生必须通过安全培训考核。',
    published: '2025-11-15T14:00:00+08:00',
    category: '通知公告',
    tags: ['安全排查'],
    cover: '',
    source: { channel: '学院通知', sender: '实验室管理中心' },
  },
  {
    id: '20251112-demo-single-attach-001',
    school_slug: 'student-affairs',
    title: '关于填报学生信息采集表的通知',
    description: '请各班级组织学生填写信息采集表并按时提交。',
    published: '2025-11-12T10:00:00+08:00',
    category: '问卷填表',
    tags: ['材料提交'],
    attachments: [{ name: '学生信息采集表模板.pdf', url: '/attachments/demo/学生信息采集表模板.pdf' }],
    source: { channel: '中心公告', sender: '学工部' },
  },
  {
    id: '20251110-demo-multi-attach-001',
    school_slug: 'literature',
    title: '暑期社会实践材料提交要求',
    description: '请参加暑期社会实践的同学按要求提交相关材料。',
    published: '2025-11-10T09:00:00+08:00',
    category: '志愿实习',
    tags: ['材料提交', '志愿服务'],
    attachments: [
      { name: '社会实践报告模板.pdf', url: '/attachments/demo/学生信息采集表模板.pdf' },
      { name: '实践证明表.docx', url: '/attachments/demo/实践证明表.docx' },
      { name: '照片素材包.zip', url: '/attachments/demo/照片素材包.zip' },
    ],
    source: { channel: '学院通知', sender: '团委' },
  },
  {
    id: '20251108-demo-external-link-001',
    school_slug: 'student-affairs',
    title: '在线问卷：教学满意度调查',
    description: '请全体学生参与本学期教学满意度在线调查。',
    published: '2025-11-08T08:00:00+08:00',
    category: '问卷填表',
    tags: ['教务安排'],
    extra_url: 'https://example.com/survey/teaching-2025',
    source: { channel: '中心公告', sender: '教务处' },
  },
  {
    id: '20251105-demo-multi-tag-001',
    school_slug: 'student-affairs',
    title: '关于开展冬季安全教育系列活动的通知',
    description: '为做好冬季校园安全工作，现组织开展安全教育系列活动。',
    published: '2025-11-05T10:00:00+08:00',
    category: '二课活动',
    tags: ['安全排查', '活动通知', '心理健康', '团学工作'],
    cover: 'https://picsum.photos/seed/edu-safety/800/400',
    source: { channel: '中心公告', sender: '学工部' },
  },
  {
    id: '20251103-demo-category-tag-001',
    school_slug: 'literature',
    title: '志愿者招募：社区义务辅导',
    description: '招募志愿者参与周末社区义务辅导活动。',
    published: '2025-11-03T14:00:00+08:00',
    category: '志愿实习',
    tags: ['志愿服务', '报名事项'],
    source: { channel: '学院通知', sender: '团委' },
  },
  {
    id: '20250901-demo-pinned-001',
    school_slug: 'student-affairs',
    title: '【置顶】本学期重要时间节点汇总',
    description: '汇总本学期各项重要事务的截止时间，请务必关注。',
    published: '2025-09-01T08:00:00+08:00',
    category: '通知公告',
    tags: ['截止提醒', '教务安排'],
    pinned: true,
    source: { channel: '中心公告', sender: '教务处' },
    body: `## 本学期重要时间节点

- 选课补退选：9月10日-15日
- 中期教学检查：11月1日-15日
- 期末考试周：1月5日-15日
- 成绩录入截止：1月20日`,
  },
  {
    id: '20251101-demo-badge-001',
    school_slug: 'info-engineering',
    title: '优秀学生干部评选结果公示',
    description: '2025年度优秀学生干部评选结果现予以公示。',
    published: '2025-11-01T10:00:00+08:00',
    category: '通知公告',
    tags: ['评优申报'],
    badge: '公示',
    source: { channel: '学院通知', sender: '学工部' },
  },
  {
    id: '20250101-demo-time-active-001',
    school_slug: 'info-engineering',
    title: '程序设计竞赛报名通道开放中',
    description: '校内程序设计竞赛报名通道已开放，欢迎报名参赛。',
    published: '2025-01-01T00:00:00+08:00',
    category: '竞赛相关',
    tags: ['报名事项'],
    cover: 'https://picsum.photos/seed/edu-coding/800/400',
    start_at: '2025-01-01T00:00:00+08:00',
    end_at: '2027-12-31T23:59:59+08:00',
    source: { channel: '学院通知', sender: '教务处' },
  },
  {
    id: '20251120-demo-time-upcoming-001',
    school_slug: 'literature',
    title: '2027年暑期学术夏令营预报名',
    description: '2027年暑期学术夏令营将于明年开放报名。',
    published: '2025-11-20T10:00:00+08:00',
    category: '二课活动',
    tags: ['报名事项'],
    start_at: '2027-01-01T00:00:00+08:00',
    end_at: '2027-06-30T23:59:59+08:00',
    source: { channel: '学院通知', sender: '教务处' },
  },
  {
    id: '20240101-demo-time-expired-001',
    school_slug: 'student-affairs',
    title: '2024年度奖学金申报（已截止）',
    description: '2024年度奖学金申报工作已结束。',
    published: '2024-01-01T08:00:00+08:00',
    category: '通知公告',
    tags: ['奖助评定', '截止提醒'],
    start_at: '2024-01-01T00:00:00+08:00',
    end_at: '2024-12-31T23:59:59+08:00',
    source: { channel: '中心公告', sender: '学工部' },
  },
];

const makeCard = (d) => {
  const attachmentLines =
    !d.attachments || d.attachments.length === 0
      ? ['attachments: []']
      : [
          'attachments:',
          ...d.attachments.flatMap((item) =>
            typeof item === 'string'
              ? [`  - ${q(item)}`]
              : [`  - name: ${q(item.name)}`, `    url: ${q(item.url)}`]
          ),
        ];

  const lines = [
    '---',
    `id: ${q(d.id)}`,
    `school_slug: ${q(d.school_slug)}`,
    `title: ${q(d.title)}`,
    `description: >-`,
    `  ${d.description}`,
    `published: ${d.published}`,
    `category: ${q(d.category)}`,
    `tags: ${toYamlArray(d.tags)}`,
    `pinned: ${d.pinned ? 'true' : 'false'}`,
    `cover: ${q(d.cover || '')}`,
    `badge: ${q(d.badge || '')}`,
    `extra_url: ${q(d.extra_url || '')}`,
    `start_at: ${q(d.start_at || '')}`,
    `end_at: ${q(d.end_at || '')}`,
    'source:',
    `  channel: ${q(d.source.channel)}`,
    `  sender: ${q(d.source.sender)}`,
    ...attachmentLines,
    '---',
    '',
    d.body || `请按照通知要求执行。`,
    '',
  ];
  return lines.join('\n');
};

const main = async () => {
  await fs.mkdir(DEMO_DIR, { recursive: true });

  const fileMap = [
    'demo-normal', 'demo-long-title', 'demo-short-title', 'demo-long-desc',
    'demo-short-desc', 'demo-with-cover', 'demo-no-cover', 'demo-placeholder-img',
    'demo-single-attachment', 'demo-multi-attachment', 'demo-external-link',
    'demo-multi-tag', 'demo-category-tag', 'demo-pinned', 'demo-badge',
    'demo-time-window-active', 'demo-time-window-upcoming', 'demo-time-window-expired',
  ];

  for (let i = 0; i < DEMOS.length; i++) {
    const filePath = path.join(DEMO_DIR, `${fileMap[i]}.md`);
    await fs.writeFile(filePath, makeCard(DEMOS[i]), 'utf8');
  }

  console.log(`[generate-demo] Created ${DEMOS.length} demo cards in content/card/demo/`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
