"""AI 结构化提取：LLM（OpenAI 兼容）为主，规则提取为降级方案。

原则（与赛事规则一致）：
- 没有明确依据的字段返回 null，不编造；
- 重要字段的证据片段必须能在原文中匹配，否则该字段作废（前端显示待核实）；
- 不把发布日期当成报名截止日期；原文没有时分时不补 23:59；
- LLM 调用失败时降级到规则提取，两者都失败才标记 failed。
"""
from __future__ import annotations

import json
import re
import time
from typing import Any

import httpx
from pydantic import BaseModel, Field, ValidationError

from app.config import get_settings
from app.services.extract import parse_cn_date

PROMPT_VERSION = "v1"

SYSTEM_PROMPT = (
    "你是高校通知信息抽取器。只从给定正文中提取信息，禁止编造。"
    "输出一个 JSON 对象，字段："
    "category(竞赛/讲座/实践/活动 四选一)、summary(不超过100字的摘要)、"
    "audience(字符串数组，如[\"在校本科生\"])、"
    "deadline_date(报名/参与截止日期，格式YYYY-MM-DD，没有则null)、"
    "deadline_time(截止具体时分，格式HH:MM，原文没写则null)、"
    "requirements(报名要求字符串数组)、application_method(报名方式，没有则null)、"
    "evidence(对象：为deadline_date/application_method/audience各给一句能佐证的原文片段)。"
    "注意：发布时间不是截止日期；evidence里的片段必须逐字来自原文。"
)


class ParsedNotice(BaseModel):
    category: str | None = None
    summary: str | None = None
    audience: list[str] = Field(default_factory=list)
    deadline_date: str | None = None
    deadline_time: str | None = None
    requirements: list[str] = Field(default_factory=list)
    application_method: str | None = None
    evidence: dict[str, str] = Field(default_factory=dict)


# ---------------- 证据校验 ----------------

def _normalize(text: str) -> str:
    return re.sub(r"\s+", "", text or "")


def validate_evidence(parsed: ParsedNotice, body: str) -> ParsedNotice:
    """证据片段必须能在原文中找到；找不到则字段作废。"""
    norm_body = _normalize(body)
    clean_evidence: dict[str, str] = {}
    for field, snippet in parsed.evidence.items():
        if snippet and _normalize(snippet) in norm_body:
            clean_evidence[field] = snippet.strip()
        else:
            # 证据不可验证 → 该字段作废
            if field == "deadline_date":
                parsed.deadline_date = None
                parsed.deadline_time = None
            elif field == "application_method":
                parsed.application_method = None
            elif field == "audience":
                parsed.audience = []
    parsed.evidence = clean_evidence
    return parsed


# ---------------- 规则降级提取 ----------------

_SENT_SPLIT = re.compile(r"[。！？；\n]")
_DEADLINE_CUE = re.compile(r"截止|截至|请于|之前|前提交|前完成|前报送|前报名|报名时间")
_TIME = re.compile(r"([01]?\d|2[0-3]):([0-5]\d)")
_CATEGORY_RULES = [
    ("竞赛", re.compile(r"竞赛|比赛|大赛|选拔赛|挑战赛|评比|评选")),
    ("讲座", re.compile(r"讲座|报告会|论坛|培训|分享会|沙龙")),
    ("实践", re.compile(r"志愿|社会实践|三下乡|支教|服务队|实习|实践活动")),
]
_AUDIENCE_RULES = [
    ("在校本科生", re.compile(r"本科生")),
    ("在校研究生", re.compile(r"研究生")),
    ("全校学生", re.compile(r"全校学生|全体学生|在校学生|在校生")),
    ("全校师生", re.compile(r"全校师生|全体师生|师生")),
    ("教师", re.compile(r"教师|老师")),
]
_METHOD_CUE = re.compile(r"报名方式|报名渠道|提交至|报送至|发送至|现场报名|扫码报名|报名邮箱|通过.{0,12}报名")
_REQUIRE_CUE = re.compile(r"须|需|要求|提交|携带|提供|条件")

MAX_SUMMARY = 100


def _sentences(body: str) -> list[str]:
    parts = _SENT_SPLIT.split(body or "")
    return [p.strip() for p in parts if p and p.strip()]


def rule_extract(title: str, body: str, published_at: str | None) -> ParsedNotice:
    parsed = ParsedNotice()
    sentences = _sentences(body)

    # category：标题+正文关键词投票
    text_all = f"{title}\n{body}"
    for name, pattern in _CATEGORY_RULES:
        if pattern.search(text_all):
            parsed.category = name
            break
    if not parsed.category:
        parsed.category = "活动"

    # summary：取第一句有实质内容的句子（跳过导航/来源/短语），限 100 字
    skip_prefix = ("来源", "文：", "来稿", "发布时间", "审核", "通知公告")
    for s in sentences:
        if len(s) < 8 or s.startswith(skip_prefix):
            continue
        if parse_cn_date(s) and len(s) < 25:
            continue
        parsed.summary = (s[:MAX_SUMMARY] + "…") if len(s) > MAX_SUMMARY else s
        break
    if not parsed.summary:
        parsed.summary = (title[:MAX_SUMMARY] + "…") if len(title) > MAX_SUMMARY else title

    # deadline：只在含截止提示的句子里找日期，且与发布日期区分
    for s in sentences:
        if "发布时间" in s:
            continue
        if not _DEADLINE_CUE.search(s):
            continue
        d = parse_cn_date(s)
        if not d:
            continue
        if published_at and d == published_at and "发布" in s:
            continue
        parsed.deadline_date = d
        tm = _TIME.search(s)
        if tm:
            parsed.deadline_time = f"{int(tm.group(1)):02d}:{tm.group(2)}"
        parsed.evidence["deadline_date"] = s
        break

    # audience
    for label, pattern in _AUDIENCE_RULES:
        if pattern.search(text_all):
            parsed.audience.append(label)
    if parsed.audience:
        # 证据取包含对象关键词的最长句子，跳过来源/审核等元信息行
        best = ""
        for s in sentences:
            if s.startswith(("来源", "文：", "来稿", "审核")):
                continue
            if any(p.search(s) for _, p in _AUDIENCE_RULES) and len(s) > len(best):
                best = s
        if best:
            parsed.evidence["audience"] = best

    # application_method
    for s in sentences:
        if s.startswith(("来源", "文：", "来稿", "审核")):
            continue
        if _METHOD_CUE.search(s):
            parsed.application_method = s[:120]
            parsed.evidence["application_method"] = s
            break

    # requirements
    for s in sentences:
        if _REQUIRE_CUE.search(s) and len(s) >= 8:
            parsed.requirements.append(s[:120])
            if len(parsed.requirements) >= 5:
                break

    return parsed


# ---------------- LLM 提取 ----------------

def _llm_messages(title: str, body: str, published_at: str | None, source_name: str) -> list[dict[str, str]]:
    user = (
        f"来源：{source_name}\n发布时间：{published_at or '未知'}\n"
        f"标题：{title}\n正文：\n{(body or '')[:6000]}"
    )
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user},
    ]


def llm_extract(title: str, body: str, published_at: str | None, source_name: str) -> ParsedNotice:
    settings = get_settings()
    url = settings.ai_base_url.rstrip("/") + "/chat/completions"
    payload: dict[str, Any] = {
        "model": settings.ai_model,
        "messages": _llm_messages(title, body, published_at, source_name),
        "temperature": 0,
        "response_format": {"type": "json_object"},
    }
    with httpx.Client(timeout=60) as client:
        resp = client.post(
            url,
            headers={"Authorization": f"Bearer {settings.ai_api_key}"},
            json=payload,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
    data = json.loads(content)
    parsed = ParsedNotice.model_validate(data)
    return parsed


# ---------------- 统一入口 ----------------

class ParseResult(BaseModel):
    parsed: ParsedNotice
    model: str
    status: str  # ok / failed
    error: str | None = None
    duration_ms: int = 0


def parse_notice(title: str, body: str, published_at: str | None, source_name: str) -> ParseResult:
    settings = get_settings()
    start = time.time()

    # 1) LLM（配置了 key 才尝试）
    if settings.ai_api_key:
        try:
            parsed = llm_extract(title, body, published_at, source_name)
            parsed = validate_evidence(parsed, body)
            return ParseResult(
                parsed=parsed,
                model=settings.ai_model,
                status="ok",
                duration_ms=int((time.time() - start) * 1000),
            )
        except (httpx.HTTPError, KeyError, json.JSONDecodeError, ValidationError) as exc:
            llm_error = str(exc)[:500]
        except Exception as exc:  # noqa: BLE001 —— AI 调用任何异常都不阻塞入库
            llm_error = str(exc)[:500]
    else:
        llm_error = "AI_API_KEY 未配置"

    # 2) 规则降级
    try:
        parsed = rule_extract(title, body, published_at)
        parsed = validate_evidence(parsed, body)
        return ParseResult(
            parsed=parsed,
            model="rule-fallback",
            status="ok",
            error=f"llm skipped: {llm_error}",
            duration_ms=int((time.time() - start) * 1000),
        )
    except Exception as exc:  # noqa: BLE001
        return ParseResult(
            parsed=ParsedNotice(),
            model="rule-fallback",
            status="failed",
            error=f"llm: {llm_error}; rule: {exc}"[:500],
            duration_ms=int((time.time() - start) * 1000),
        )
