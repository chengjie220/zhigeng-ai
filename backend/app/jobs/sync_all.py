"""定时同步入口：python -m app.jobs.sync_all

由系统定时任务（cron / 计划任务）每 6 小时触发一次；
单独进程运行，避免多 worker 重复抓取。
"""
from app.database import SessionLocal, init_db
from app.services.sync import sync_all


def run() -> None:
    init_db()
    db = SessionLocal()
    try:
        results = sync_all(db)
        for item in results:
            status = "OK" if not item["error"] else f"FAILED({item['error'][:60]})"
            print(
                f"[sync] {item['source']}: found={item['found']} "
                f"added={item['added']} updated={item.get('updated', 0)} {status}"
            )
    finally:
        db.close()


if __name__ == "__main__":
    run()
