from __future__ import annotations

from backend.app.core.config import get_settings
from backend.app.services.analysis_runner import execute_analysis_run
from backend.app.services.analysis_runs import wait_for_analysis_run


def main() -> None:
    poll_seconds = get_settings().analysis_worker_poll_seconds
    while True:
        run = wait_for_analysis_run(poll_seconds)
        run_id = str(run.get("id") or "").strip()
        if not run_id:
            continue
        execute_analysis_run(run_id)


if __name__ == "__main__":
    main()
