"""应用配置：从环境变量 / .env 读取。"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    database_url: str = "sqlite:///./zhigeng.db"

    # AI（OpenAI 兼容接口）。不配置 api_key 时自动走规则降级提取。
    ai_api_key: str = ""
    ai_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    ai_model: str = "qwen-plus"

    crawl_delay_seconds: float = 1.0
    crawl_timeout: float = 20.0

    # 允许的来源站点（防止任意 URL 采集）
    allowed_hosts: str = "www.cdu.edu.cn,news.cdu.edu.cn,cxcyxy.cdu.edu.cn,tuanwei.cdu.edu.cn"


@lru_cache
def get_settings() -> Settings:
    return Settings()
