# 知更 AI · 前端（成员 A）

成都大学第八届网络创新大赛 · AI创作挑战赛 —— 进阶组作品「知更 AI｜成都大学校园机会雷达」前端工程。

技术栈：Vue 3 + Vite + TypeScript + Element Plus + Vue Router + Axios（Sass）

## 快速开始

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # 类型检查 + 产物构建（dist/）
npm run preview    # 本地预览构建产物
```

## 开发模式：Mock 与真实后端切换

- `.env.development` 中 `VITE_USE_MOCK=true`（默认）：使用 `src/api/mock/data.ts` 中的**示例数据**（虚构内容，页面顶部有黄色提示条），前端可完全独立开发。
- 联调真实后端：把 `VITE_USE_MOCK` 改为 `false`，请求将经 Vite 代理转发到 `http://localhost:8000`（见 `vite.config.ts`）。

## 页面结构

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/` | 首页 | 搜索、分类/来源/截止状态筛选、分页、骨架屏/空/错误状态 |
| `/notice/:id` | 通知详情 | AI 提取字段、原文依据证据、查看原文、收藏、附件 |
| `/sources` | 信息源管理 | 订阅/取消订阅（localStorage 持久化），影响首页内容 |
| `/favorites` | 我的收藏 | 本地收藏、按截止时间排序、已下架通知友好提示 |
| `/about` | 关于项目 | 产品介绍、AI 边界声明、技术架构、数据来源声明 |

## 与后端的接口约定（成员 B 请对齐）

统一前缀 `/api/v1`，均为 GET：

| 接口 | 说明 |
| --- | --- |
| `/sources` | 预置信息源列表，返回 `SourceItem[]` |
| `/notices` | 通知列表，支持 `q` `category` `source_id` `deadline_status` `page` `page_size` |
| `/notices/{id}` | 通知详情，返回 `NoticeDetail` |
| `/notices/{id}/evidence` | 已验证字段证据，返回 `Record<string, string>` |
| `/stats` | 统计信息 |
| `/health` | 健康检查 |

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

字段类型定义见 `src/types/notice.ts`（前后端唯一事实来源，改动请先同步）。

**注意两个扩展约定：**

1. `deadline_status` 取值：`all` / `urgent`（7天内截止）/ `upcoming`（未截止）/ `expired`（已截止）/ `unknown`（截止日期未知）。
2. 列表接口额外接受 `source_ids`（逗号分隔多个来源 ID）：用于「信息源订阅过滤」。若后端暂未实现，前端已兼容（忽略该参数时前端仍可正常展示）。

`ai_status` 取值：`done`（已解析）/ `pending`（信息整理中）/ `failed`（解析失败）。

## 本地收藏与订阅（无账户体系）

- 收藏：`localStorage` 键 `zhigeng_favoriteIds`，值为 ID 数组。
- 信息源订阅：`localStorage` 键 `zhigeng_selectedSourceIds`；未设置=全部来源，空数组=全部取消。
- 页面上有明确提示：收藏与订阅仅保存在当前浏览器。

## 前端可验证交付物（比赛材料）

1. Vue3 前端完整项目：首页、详情页、信息源管理、收藏、关于（本仓库 `frontend/`）。
2. 交互功能与 API 联调结果：搜索/筛选/分页/AI 字段展示/证据展示（Mock 切换真实 API 即可演示）。
3. 响应式界面与用户体验测试记录：电脑 + 手机浏览器截图、试用反馈与迭代记录（开发中逐步补充）。

## 已知边界（诚实声明）

- 第一版收藏/订阅无云端同步，换设备会丢失。
- 截止日期仅显示原文明确的时间，不自动补 23:59。
- Mock 模式下的数据全部为虚构示例，不代表真实校园通知。
