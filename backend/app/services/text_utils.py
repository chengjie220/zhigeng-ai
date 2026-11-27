"""文本归一化小工具：问答与日历共用。"""
from __future__ import annotations

import re

_BRACKETS = re.compile(r"[【\[（(][^】\]）)]{0,12}[】\]）)]")
_TITLE_NOISE = re.compile(r"[\s·、，,。.：:;；!！?？\"'《》<>]")


def normalize_text(text: str) -> str:
    """去掉所有空白，用于判断一段引用是否逐字来自原文。"""
    return re.sub(r"\s+", "", text or "")


def dedupe_key(title: str) -> str:
    """同一通知常被多个来源转载：去掉【栏目】前缀与「-学院/部门」后缀后比较。"""
    t = _BRACKETS.sub("", title or "")
    core = re.split(r"[-－—_|]", t)[0]
    return _TITLE_NOISE.sub("", core)[:40]
