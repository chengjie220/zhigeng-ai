from app.crawlers.base import BaseCrawler, ListEntry, get_crawler
import app.crawlers.cdu_news  # noqa: F401  注册
import app.crawlers.cxcyxy  # noqa: F401  注册
import app.crawlers.tuanwei  # noqa: F401  注册

__all__ = ["BaseCrawler", "ListEntry", "get_crawler"]
