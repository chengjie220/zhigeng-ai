# 知更 AI · 后端（成员 B）

FastAPI + SQLAlchemy + SQLite：校园通知采集 → AI/规则结构化解析 → `/api/v1` 查询服务。

## 快速开始

```bash
cd backend
pip install -r requirements.txt

# 1) 首次采集（抓取 4 个真实来源并入库解析）
python -m app.jobs.sync_all

# 2) 启动 API（默认 :8000）
uvicorn app.main:app --reload --port 8000

# 3) 测试
python -m pytest tests/ -q
```

前端联调：把 `frontend/.env.development` 中 `VITE_USE_MOCK` 改为 `false`，`npm run dev` 的
`/api` 请求会经 Vite 代理转发到本服务。

## 信息源（4 个，均来自公开页面）

| 来源 | 列表地址 | 适配器 |
| --- | --- | --- |
| 成都大学官网 · 通知公告 | www.cdu.edu.cn/index/tzgg.htm | `cdu_news` |
| 创新创业学院 · 双创通知 | cxcyxy.cdu.edu.cn/xwtz/sctz.htm | `cxcyxy_sctz` |
| 共青团成都大学委员会 · 通知公告 | tuanwei.cdu.edu.cn/index/tzgg.htm | `tuanwei` |
| 创新创业学院 · 学科竞赛 | cxcyxy.cdu.edu.cn/jyjx/xkjs.htm | `cxcyxy_xkjs` |

采集策略：仅访问公开页面、单来源限速（默认 1 秒/次）、异常记录进 `crawl_runs` 不无限重试、
失败保留已有数据、按（归一化 URL + 正文哈希）去重，正文变化才重新解析。

## AI 解析与降级

- **主路径**：OpenAI 兼容接口（`.env` 配置 `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL`，
  默认阿里云 DashScope qwen-plus），提示词见 `app/services/ai_client.py`。
- **降级路径**：未配置 Key 或调用失败时自动切换**规则提取**（正则识别截止日期/参与对象/
  报名方式/要求/分类），保证链路可演示、可测试。
- **真实性约束**：没有依据的字段返回 null（前端显示「待核实」）；证据片段必须能回文匹配
  否则字段作废；发布日期不冒充截止日期；原文没写时分不补 23:59。
- **分类专属字段**：category 为竞赛/创新创业/升学就业/就业指导/实践/活动/讲座/考试安排/选课成绩/学籍毕业/党团事务/公示/招投标/奖惩处分十四选一；按类产出 `extra`
  （公示期与异议反馈、主讲人与地点、赛事级别与团队规模等）。LLM 的 extra 也走回文校验，
  不在原文中的值直接丢弃；规则路径的 extra 全部由正则从正文命中。
- 每次解析记录进 `ai_runs`（模型名、状态、耗时、错误），可追溯；Prompt 版本记录为 `v5`。
- 已有数据库升级时 `init_db()` 会轻量补列（`notices.extra_json`、`sources.is_custom`），不重建数据。

## API（与前端契约一致，见 `frontend/README.md`）

`GET /api/v1/sources` · `GET /api/v1/notices`（q/category/source_id/source_ids/deadline_status/sort/page/page_size）
`GET /api/v1/notices/{id}`（含 `extra`）· `GET /api/v1/notices/{id}/evidence` · `GET /api/v1/stats` · `GET /api/v1/health`
`POST /api/v1/admin/sync`（手动触发同步，演示用）

信息源发现与自定义添加：

`GET /api/v1/sources/search?q=关键词`：调用 Bing 搜索校园网站候选（只读，返回标题/网址/摘要/域名）。
`GET /api/v1/sources/probe?url=...`：抓取目标页，判断是否像通知列表页，返回站点名与最多 5 条样例标题。
`POST /api/v1/sources`：写入自定义来源（`name` / `url` / `content_types`），使用 `generic` 通用适配器，
列表地址从数据库读取；下一次定时同步开始采集。`is_custom` 字段用于区分预置来源。

`deadline_status`：urgent（7 天内）/ upcoming（7 天后）/ expired / unknown；`sort`：deadline / published。
排序语义与前端 `utils/noticeSort.ts` 一致：未截止升序 → 已截止（刚过期在前）→ 无日期最后。

### 「问知更」AI 问答

`GET /api/v1/qa?q=这周有什么比赛能报名`：把自然语言问题变成「结论 + 原文依据」。

实现（`app/services/qa.py`）：

1. **意图解析**：时间意图（今天/明天/这周/下周/N 天内）→ 截止日期窗口；类别意图复用入库同一套
   `_CATEGORY_RULES` 正则；受众意图复用 `_AUDIENCE_RULES`。
2. **候选召回**：类别与关键词是**软约束（OR）**——命中其一即入选。如果做成 AND，
   归类到「就业指导」的讲座会因为问题问「讲座」而被整条漏掉。
3. **去重**：`_dedupe_key` 去掉【栏目】前缀与「-学院」后缀，同一通知多来源转载只留一条。
4. **引用**：`_snippet_for` 给候选句打分（含截止日期 +4、含「截止/报名/申报」+2、贴合问题 +1），
   取最高分句；引用必须逐字出现在正文中，否则丢弃（沿用解析模块的回文校验思路）。
5. **回答**：配置 `AI_API_KEY` 时走 `llm_chat` 生成结论文本（`mode=llm`），
   否则规则回答（`mode=rule`）。**两种模式都带引用卡片**，前端可点击跳到原文核对。

刻意不做：不接入向量库、不让模型凭空回答。答案只来自当前库内通知，材料没有就直说没有。

## 定时同步

```bash
python -m app.jobs.sync_all   # 由系统计划任务每 6 小时触发（独立进程，避免重复抓取）
```

Windows 计划任务示例：`schtasks /create /tn zhigeng-sync /sc hourly /mo 6 /tr "<python> <repo>\backend\app\jobs\sync_all.py"`。

## 测试

`tests/` 共 22 个用例：日期解析、正文清洗、去重哈希、规则提取与证据校验、
三个适配器的真实 HTML 夹具解析（`tests/fixtures/` 为真实抓取页面）、
API 集成（筛选/排序/详情/证据/404）。

## 部署与备份

- 运行：`uvicorn app.main:app --host 0.0.0.0 --port 8000`（或 gunicorn + uvicorn workers）。
- 配置：复制 `.env.example` 为 `.env`；生产环境务必配置真实 `AI_API_KEY` 并限制 CORS 来源。
- 备份：数据全在 `backend/zhigeng.db`，定时复制该文件即可（如 `copy zhigeng.db backup\zhigeng-%date%.db`）。

## 已知边界（诚实声明）

- 规则降级提取的字段质量低于 LLM，演示时可说明两种模式；关键字段均附原文依据可核验。
- 校园站点 HTML 结构若改版，对应适配器需调整（夹具测试可快速回归）。
- 自定义来源使用通用启发式适配器，命中率低于专用适配器；探测接口只做预判，最终以同步结果为准。
- 联网搜索依赖 Bing 可访问；不可达时返回空候选，前端会引导用户直接粘贴网址。
- 第一版无登录/权限，`/admin/sync` 仅限内网演示使用。
