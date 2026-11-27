"""「问知更」AI 问答助手：基于已采集通知回答问题，答案附原文依据。

原则（与 AI 解析一致）：
- 只依据召回的通知内容回答，不编造；
- 引用片段必须逐字来自对应通知正文，无法佐证的引用丢弃；
- 配置了 AI_API_KEY 走 LLM 回答，否则规则降级；两种模式都附引用。
"""
from __future__ import annotations

import json
import re
from datetime import date, timedelta

from sqlalchemy import case, or_, select
from sqlalchemy.orm import Session

from app.models import Notice, Source
from app.schemas.qa import QACitation, QAResponse
from app.services.ai_client import _AUDIENCE_RULES, _CATEGORY_RULES, _normalize, llm_chat

# ---------------- 问题意图解析 ----------------

_WEEK = re.compile(r"这周|本周|周内|周末")
_NEXT_WEEK = re.compile(r"下周|下星期")
_TODAY = re.compile(r"今天|今日")
_TOMORROW = re.compile(r"明天|明日")
_DAYS = re.compile(r"(\d{1,2})\s*天(?:内|以内)?")
_MONTH = re.compile(r"(\d{1,2})\s*月")
_EXPIRED_CUE = re.compile(r"错过|已截止|过期|结束的")

_ANSWER_MAX_CITATIONS = 5


def _parse_time_window(question: str) -> tuple[str | None, str | None]:
    """解析时间窗口，返回 (start_iso, end_iso)。"""
    today = date.today()
    if _TODAY.search(question):
        s = e = today
    elif _TOMORROW.search(question):
        s = e = today + timedelta(days=1)
    elif _WEEK.search(question):
        s, e = today, today + timedelta(days=7)
    elif _NEXT_WEEK.search(question):
        s = today + timedelta(days=7)
        e = today + timedelta(days=14)
    else:
        m = _DAYS.search(question)
        if m:
            s, e = today, today + timedelta(days=int(m.group(1)))
        else:
            return None, None
    return s.isoformat(), e.isoformat()


def _match_categories(question: str) -> list[str]:
    """按分类规则顺序取前两个命中的类别（与入库分类同一套正则）。"""
    found: list[str] = []
    for name, pattern in _CATEGORY_RULES:
        if pattern.search(question) and name not in found:
            found.append(name)
        if len(found) >= 2:
            break
    return found


def _match_audience(question: str) -> list[str]:
    return [label for label, pattern in _AUDIENCE_RULES if pattern.search(question)]


# 通用疑问词，参与切词只会制造噪音，过滤掉
_STOPWORDS = {
    "什么", "怎么", "如何", "哪个", "哪些", "可以", "能报", "报名", "现在", "请问",
    "没有", "这个", "那个", "一下", "知道", "有没有", "还有", "才是", "的时候",
    "有什么", "可以报", "能参加", "想报", "想去", "我们", "你们", "自己",
}


def _tokens(question: str) -> list[str]:
    """把问题切成可用关键词：中文 2 字滑窗（去掉疑问词），英文取单词。"""
    words: list[str] = []
    for seg in re.findall(r"[一-龥]+", question):
        if len(seg) < 2:
            continue
        grams = [seg[i : i + 2] for i in range(len(seg) - 1)]
        if len(seg) <= 4:
            grams.append(seg)
        for g in grams:
            if g not in _STOPWORDS and g not in words:
                words.append(g)
    words += [w.lower() for w in re.findall(r"[A-Za-z]{2,}", question)]
    return words[:10]


# ---------------- 候选召回 ----------------

def _recall(db: Session, question: str, limit: int = 12) -> list[tuple[Notice, str]]:
    """基于意图召回候选通知，按截止优先排序。

    类别与关键词是**软约束**：命中其一即入选（OR），而不是层层 AND。
    否则「有什么讲座？」会因为入库时该通知被归到「就业指导」而整条漏掉。
    """
    today = date.today()
    stmt = select(Notice, Source.name).join(Source, Notice.source_id == Source.id)

    start, end = _parse_time_window(question)
    if start and end:
        stmt = stmt.where(Notice.deadline_date.is_not(None), Notice.deadline_date >= start, Notice.deadline_date <= end)
    elif _EXPIRED_CUE.search(question):
        stmt = stmt.where(Notice.deadline_date.is_not(None), Notice.deadline_date < today)

    categories = _match_categories(question)
    words = _tokens(question)

    clauses = []
    if categories:
        clauses.append(Notice.category.in_(categories))
    if words:
        clauses.extend(Notice.title.like(f"%{w}%") for w in words)
        clauses.extend(Notice.summary.like(f"%{w}%") for w in words)
        clauses.extend(Notice.body_text.like(f"%{w}%") for w in words)
    if clauses:
        stmt = stmt.where(or_(*clauses))

    group = case(
        (Notice.deadline_date.is_(None), 2),
        (Notice.deadline_date < today, 1),
        else_=0,
    )
    stmt = stmt.order_by(
        group.asc(),
        case((Notice.deadline_date >= today, Notice.deadline_date), else_=None).asc(),
        Notice.published_at.desc(),
        Notice.id.desc(),
    ).limit(limit)
    return list(db.execute(stmt).all())


# ---------------- 引用构建 ----------------

def _loads_evidence(raw: str | None) -> dict[str, str]:
    try:
        data = json.loads(raw or "{}")
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


_META_PREFIX = ("来源", "文：", "来稿", "审核", "编辑", "摄影", "责编", "发布时间")
_DEADLINE_WORDS = re.compile(r"截止|截至|请于|报名|申报|提交|申请|前完成|之前")


def _snippet_for(notice: Notice, question: str) -> str | None:
    """挑一句最能佐证的原文句子：优先「截止/报名」这类可执行信息，其次贴合问题。"""
    body = notice.body_text or ""
    sentences = [
        s.strip()
        for s in re.split(r"[。！？；\n]", body)
        if 6 <= len(s.strip()) <= 160 and not s.strip().startswith(_META_PREFIX)
    ]
    if not sentences:
        sentences = [s.strip() for s in re.split(r"[。！？；\n]", body) if len(s.strip()) >= 6]
    if not sentences:
        return None

    words = [w for w in re.findall(r"[一-龥]{2,8}|[A-Za-z]{2,}", question) if len(w) >= 2]
    deadline_iso = notice.deadline_date or ""

    best, best_score = sentences[0], -1
    for s in sentences:
        score = 0
        if deadline_iso and deadline_iso in s.replace("年", "-").replace("月", "-").replace("日", ""):
            score += 4
        if _DEADLINE_WORDS.search(s):
            score += 2
        if any(w in s for w in words):
            score += 1
        if 20 <= len(s) <= 120:
            score += 1
        if score > best_score:
            best, best_score = s, score
    return best[:120]


def _dedupe_key(title: str) -> str:
    """同一通知常被多个来源转载：去掉【栏目】前缀与「-学院/部门」后缀后比较。"""
    t = re.sub(r"[【\[（(][^】\]）)]{0,12}[】\]）)]", "", title or "")
    core = re.split(r"[-－—_|]", t)[0]
    return re.sub(r"[\s·、，,。.：:;；!！?？\"'《》<>]", "", core)[:40]


def _dedupe_rows(rows: list[tuple[Notice, str]]) -> list[tuple[Notice, str]]:
    """同一通知被多个来源转载时只保留第一条（顺序已按截止优先）。"""
    out: list[tuple[Notice, str]] = []
    seen: set[str] = set()
    for row in rows:
        key = _dedupe_key(row[0].title)
        if key and key in seen:
            continue
        seen.add(key)
        out.append(row)
    return out


def _build_citations(rows: list[tuple[Notice, str]], question: str) -> list[QACitation]:
    citations: list[QACitation] = []
    seen: set[str] = set()
    for notice, _ in rows:
        if len(citations) >= _ANSWER_MAX_CITATIONS:
            break
        key = _dedupe_key(notice.title)
        if key and key in seen:
            continue
        snip = _snippet_for(notice, question)
        if not snip:
            continue
        # 回文校验：引用必须逐字出现在原文
        if _normalize(snip) not in _normalize(notice.body_text or ""):
            continue
        seen.add(key)
        citations.append(
            QACitation(
                notice_id=notice.id,
                title=notice.title,
                category=notice.category or "活动",
                deadline_date=notice.deadline_date,
                deadline_time=notice.deadline_time,
                snippet=snip,
                original_url=notice.original_url,
            )
        )
    return citations


# ---------------- 答案生成 ----------------

def _rule_answer(question: str, rows: list[tuple[Notice, str]], citations: list[QACitation]) -> str:
    if not rows:
        return "暂时没有找到符合条件的通知。可以换个说法，或到「全部通知」里手动检索。"
    # 按引用里的去重结果组织答案，避免同一通知被两个来源重复列出
    picked = citations if citations else []
    lines: list[str] = [f"共找到 {len(picked) or len(rows)} 条相关通知，按截止时间排序如下："]
    if picked:
        for i, c in enumerate(picked, start=1):
            dl = (
                f"截止 {c.deadline_date}" + (f" {c.deadline_time}" if c.deadline_time else "")
                if c.deadline_date
                else "截止待核实"
            )
            lines.append(f"{i}. {c.title}（{c.category}，{dl}）")
        lines.append("每条均有原文依据，见下方引用卡片，可点击查看原文核对。")
    else:
        for i, (n, _) in enumerate(rows[:5], start=1):
            dl = (
                f"截止 {n.deadline_date}" + (f" {n.deadline_time}" if n.deadline_time else "")
                if n.deadline_date
                else "截止待核实"
            )
            lines.append(f"{i}. {n.title}（{n.category}，{dl}）")
        lines.append("这些通知暂无可引用的原文片段，建议打开原文核对。")
    return "\n".join(lines)


def _llm_answer(question: str, rows: list[tuple[Notice, str]]) -> str | None:
    if not rows:
        return None
    ctx_blocks = []
    for n, source_name in rows[:8]:
        ctx_blocks.append(
            f"【通知 id={n.id}】来源：{source_name}｜类别：{n.category}\n"
            f"标题：{n.title}\n发布时间：{n.published_at or '未知'}｜"
            f"截止：{n.deadline_date or '待核实'}{(' ' + n.deadline_time) if n.deadline_time else ''}\n"
            f"正文摘要：{(n.summary or '')[:120]}\n正文节选：{(n.body_text or '')[:800]}"
        )
    system = (
        "你是校园机会问答助手「问知更」，只依据给定的通知材料回答学生的问题。"
        "要求：1) 只使用材料中的信息，材料没有的就说没有，绝不编造；"
        "2) 回答用简体中文，简洁分点；涉及具体通知时标注标题；"
        "3) 提到截止时间时给出具体日期；4) 不要输出与材料无关的内容。"
    )
    user = f"通知材料：\n\n{''.join(chr(10) + chr(10) + b for b in ctx_blocks)}\n\n学生问题：{question}"
    try:
        return llm_chat([{"role": "user", "content": user}], system=system)
    except Exception:  # noqa: BLE001 —— LLM 失败降级到规则回答
        return None


# ---------------- 统一入口 ----------------

def answer_question(question: str, db: Session) -> QAResponse:
    question = (question or "").strip()
    if not question:
        return QAResponse(question=question, answer="请先输入问题，例如：我这周有什么比赛能报名？", mode="rule")

    rows = _recall(db, question)
    rows = _dedupe_rows(rows)
    citations = _build_citations(rows, question)

    answer = _llm_answer(question, rows)
    mode = "llm" if answer else "rule"
    if not answer:
        answer = _rule_answer(question, rows, citations)

    return QAResponse(
        question=question,
        answer=answer,
        mode=mode,
        citations=citations,
        candidate_ids=[n.id for n, _ in rows],
    )
