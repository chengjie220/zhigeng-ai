"""单端口启动入口（部署沙箱 / 生产环境用）。

直接从环境变量读取端口，不依赖 shell 对 $PORT 的展开：
    python run.py
"""
import os

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, log_level="info")
