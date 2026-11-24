# 知更 AI · 前端（成员 A）

成都大学第八届网络创新大赛 · AI创作挑战赛 —— 进阶组作品「知更 AI｜成都大学校园机会雷达」前端工程。

技术栈：Vue 3 + Vite + TypeScript + Element Plus + Vue Router + Axios（Sass）· 测试：Vitest + @vue/test-utils

## 快速开始

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run test       # 单元测试（83 个用例）
npm run build      # 类型检查 + 产物构建（dist/）
npm run preview    # 本地预览构建产物
```

## 开发模式：Mock 与真实后端切换

- 默认（`.env.development` 中 `VITE_USE_MOCK=false`）：走真实后端 API，请求经 Vite 代理转发到 `http://localhost:8000`（见 `vite.config.ts`）；需先启动 `backend/`。
- 独立开发：把 `VITE_USE_MOCK` 改为 `true`，使用 `src/api/mock/data.ts` 中的**示例数据**（虚构内容，页面顶部有黄色提示条），无需后端。

## 页面结构

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/` | 分类首页 | 竞赛/公示/讲座/活动/实践五类入口，显示各类数量与临期数，支持全局关键词搜索 |
| `/category/:category` | 分类简报 | 某一类的统计卡 + 优先处理行动卡（倒计时 + 该类专属字段）+ 最近发布 |
| `/notices` | 全部通知 | 搜索、分类/来源/截止状态筛选、排序、分页、骨架屏/空/错误状态；筛选条件同步到 URL |
| `/notice/:id` | 通知详情 | AI 提取字段（含分类专属字段）、原文依据（可在正文中定位高亮）、原文正文、附件、收藏；`#evidence` 锚点直达依据 |
| `/sources` | 信息源管理 | 订阅/取消订阅（localStorage 持久化）、联网关键词搜索添加网站、粘贴网址探测后添加 |
| `/favorites` | 我的收藏 | 本地收藏、按截止时间排序、已下架通知友好提示 |
| `/about` | 关于项目 | 产品介绍、AI 边界声明、技术架构、数据来源声明 |

## 全部通知页 URL 参数

筛选状态全部写在地址栏，刷新不丢、可直接分享：

| 参数 | 取值 | 说明 |
| --- | --- | --- |
| `q` | 任意字符串 | 搜索关键词 |
| `category` | 竞赛 / 公示 / 讲座 / 实践 / 活动 | 分类 |
| `source_id` | 数字 | 来源 ID |
| `deadline_status` | urgent / upcoming / expired / unknown | 截止状态 |
| `sort` | deadline（默认，可省略）/ published | 排序方式 |
| `page` | ≥2 的整数（第 1 页省略） | 页码 |

示例：`/notices?category=竞赛&deadline_status=urgent&sort=deadline` 直接打开「7 天内截止的竞赛」。

## 分类体系与专属字段

`src/config/categories.ts` 是五类字段模板的唯一事实来源，后端规则与 Prompt 使用同一套键名：

| 分类 | 专属字段 |
| --- | --- |
| 竞赛 | 报名截止、报名方式、参赛对象、级别、团队规模、所需材料 |
| 公示 | 公示期至、公示对象、异议反馈、发布单位、相关材料 |
| 讲座 | 时间、地点、主讲人、主办单位、参与方式 |
| 活动 | 报名截止、时间地点、参与对象、报名方式、主办单位 |
| 实践 | 报名截止、实践地点、招募对象、报名方式、服务时长 |

`buildCategoryFields()` 只输出有原文依据的字段；详情里的 `extra` 对象由后端 `extra_json` 提供，键名缺失时字段自动隐藏。

## 分类简报的数据来源

简报不新增查询接口，由 `src/api/brief.ts` 组合现有接口得到（分类模式下所有请求带上 `category`）：

- `/notices?deadline_status=urgent&sort=deadline&page_size=6`：临期通知与总数
- `/notices?deadline_status=unknown&page_size=1`：截止待核实数量
- `/notices?sort=published&page_size=50`：近 7 天新增数量与「最近发布」列表
- `/stats`：通知总数；`/sources`：信息源数量
- 对前 3 条临期通知再取 `/notices/{id}`，拿到报名方式、参与对象与分类专属字段

任一条详情失败只降级为「待核实」，不会让整份简报加载失败。纯函数逻辑在 `src/utils/brief.ts`，行为由 `tests/brief.spec.ts` 覆盖。

## 与后端的接口约定（成员 B 请对齐）

统一前缀 `/api/v1`：

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/sources` | GET | 信息源列表，返回 `SourceItem[]`（含 `is_custom`） |
| `/sources/search?q=` | GET | 联网关键词搜索校园网站候选，返回 `SourceSearchResult[]` |
| `/sources/probe?url=` | GET | 探测网址是否可采集，返回站点名与样例标题 |
| `/sources` | POST | 添加自定义信息源，使用 `generic` 适配器，下一次同步生效 |
| `/notices` | GET | 通知列表，支持 `q` `category` `source_id` `deadline_status` `sort` `page` `page_size` |
| `/notices/{id}` | GET | 通知详情，返回 `NoticeDetail`（含 `extra` 分类专属字段） |
| `/notices/{id}/evidence` | GET | 已验证字段证据，返回 `Record<string, string>` |
| `/stats` | GET | 统计信息 |
| `/health` | GET | 健康检查 |

Mock 模式下搜索/探测/添加都有本地模拟实现（`mockSourceSearchResults` / `mockProbeSource`），不联网也能演示完整交互。

列表响应结构：

```json
{
  "items": [{ "id": 12, "title": "...", "source_id": 2, "source_name": "...",
              "category": "竞赛", "published_at": "2026-11-20",
              "deadline_date": "2026-12-10", "deadline_time": null,
              "summary": "...", "ai_status": "done", "original_url": "..." }],
  "total": 1, "page": 1, "page_size": 10
}
```

详情接口需在列表字段基础上补充 `audience` `requirements` `application_method` `evidence` `attachments` `body_text` 与 `extra`（分类专属字段；正文用于「原文正文」区块，缺省时前端提示去原文查看）。

字段类型定义见 `src/types/notice.ts`（前后端唯一事实来源，改动请先同步）。

**注意三个扩展约定：**

1. `deadline_status` 取值：`all` / `urgent`（7天内截止）/ `upcoming`（未截止）/ `expired`（已截止）/ `unknown`（截止日期未知）。
2. 列表接口额外接受 `source_ids`（逗号分隔多个来源 ID）：用于「信息源订阅过滤」。若后端暂未实现，前端已兼容（忽略该参数时前端仍可正常展示）。
3. 列表接口额外接受 `sort`：`deadline`（最近截止优先）/ `published`（最新发布优先）。未实现时前端按当前页兜底排序，但跨页顺序会不准确，建议后端支持。

`ai_status` 取值：`done`（已解析）/ `pending`（信息整理中）/ `failed`（解析失败）。

## 排序规则

「最近截止优先」分三组，依次为：未截止（按剩余天数升序）→ 已截止（刚过期在前）→ 截止日期未知。同组同天数时按发布时间倒序兜底，保证顺序稳定。实现见 `src/utils/noticeSort.ts`。

## 本地收藏与订阅（无账户体系）

- 收藏：`localStorage` 键 `zhigeng_favoriteIds`，值为 ID 数组。
- 信息源订阅：`localStorage` 键 `zhigeng_selectedSourceIds`；未设置=全部来源，空数组=全部取消。首次取消某个来源时，会把「全部订阅」展开成显式列表，只移除被点击的那一个。
- 页面上有明确提示：收藏与订阅仅保存在当前浏览器。

## 测试

```bash
npm run test        # 单次运行
npm run test:watch  # 监听模式
```

| 测试文件 | 覆盖内容 |
| --- | --- |
| `tests/date.spec.ts` | 剩余天数、截止状态归类、日期格式化、徽标文案 |
| `tests/brief.spec.ts` | 简报行动文案优先级（含公示异议反馈）、参与对象裁剪、近 7 天统计、临期筛选与倒计时、标题文案 |
| `tests/categories.spec.ts` | 五类字段模板、专属字段优先级、无依据字段隐藏、未知分类降级、Mock 搜索与探测 |
| `tests/noticeSort.spec.ts` | 最近截止优先分组、发布倒序、稳定性、不修改入参 |
| `tests/highlight.spec.ts` | 正文切分高亮、大小写、不丢字、证据匹配 |
| `tests/favorites.spec.ts` | 收藏增删、脏数据降级 |
| `tests/sourcePrefs.spec.ts` | 订阅展开、首次取消、全部取消、脏数据降级 |
| `tests/notices-api.spec.ts` | Mock 检索/筛选/排序/分页/详情 404 |
| `tests/NoticeCard.spec.ts` | 卡片渲染、AI 状态文案、收藏事件、路由链接 |
| `tests/mock-integrity.spec.ts` | 示例数据自检：证据必须能在正文中找到 |

手工测试用例与用户反馈记录见 [`../docs/前端测试与用户反馈记录.md`](../docs/前端测试与用户反馈记录.md)。

## 前端可验证交付物（比赛材料）

1. Vue3 前端完整项目：分类首页、分类简报、全部通知、详情页、信息源发现与添加、收藏、关于（本仓库 `frontend/`）。
2. 交互功能与 API 联调结果：分类下钻、按类展示专属字段、联网搜索与网址探测添加来源、搜索/筛选/排序/分页/证据定位。
3. 功能测试与用户体验测试记录：单元测试 + 手工用例表 + 试用反馈与迭代记录（见 `docs/`）。

## 已知边界（诚实声明）

- 第一版收藏/订阅无云端同步，换设备会丢失。
- 截止日期仅显示原文明确的时间，不自动补 23:59。
- Mock 模式下的数据全部为虚构示例，不代表真实校园通知；Mock 中添加的信息源只存在于当前页面，不写入服务端。
- 联网搜索依赖 Bing 可访问；失败时界面提示改用粘贴网址，添加来源不受影响。
- Element Plus 目前为全量引入，首屏 JS 约 380 KB（gzip），弱网下首屏偏慢，后续按需引入优化。
