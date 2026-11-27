"""单端口启动入口（部署沙箱 / 生产环境用）。

直接从环境变量读取端口，不依赖 shell 对 $PORT 的展开：
    python run.py
"""
import os
import sys

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    print(f"[run] starting uvicorn on 0.0.0.0:{port} (pid={os.getpid()})", flush=True)
    try:
        uvicorn.run("app.main:app", host="0.0.0.0", port=port, log_level="info")
    except OSError as exc:
        # 端口被占（常见于旧实例未退出）时把原因打清楚，而不是静默失败
        print(f"[run] bind failed on port {port}: {exc}", flush=True)
        sys.exit(3)
