"""CLINOVA AI — Prometheus & Telemetry Observability Metrics.

Collects real-time operational performance metrics, request throughput,
latency distributions, database health, and AI/OCR execution stats.
"""

import time
from collections import defaultdict
from typing import Dict, Tuple
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class MetricsCollector:
    """In-memory telemetry collector supporting Prometheus exposition format."""

    def __init__(self):
        self._request_counts: Dict[Tuple[str, str, int], int] = defaultdict(int)
        self._request_durations: Dict[str, list] = defaultdict(list)
        self._ocr_durations: list = []
        self._ai_durations: list = []
        self._anonymized_counts: Dict[str, int] = defaultdict(int)

    def record_request(self, method: str, path: str, status_code: int, duration_seconds: float):
        # Normalize parameterized path
        cleaned_path = self._clean_path(path)
        self._request_counts[(method, cleaned_path, status_code)] += 1
        durations = self._request_durations[cleaned_path]
        durations.append(duration_seconds)
        if len(durations) > 500:
            self._request_durations[cleaned_path] = durations[-500:]

    def record_ocr(self, duration_seconds: float):
        self._ocr_durations.append(duration_seconds)
        if len(self._ocr_durations) > 200:
            self._ocr_durations = self._ocr_durations[-200:]

    def record_ai(self, duration_seconds: float):
        self._ai_durations.append(duration_seconds)
        if len(self._ai_durations) > 200:
            self._ai_durations = self._ai_durations[-200:]

    def record_anonymization(self, entity_type: str, count: int = 1):
        self._anonymized_counts[entity_type] += count

    @staticmethod
    def _clean_path(path: str) -> str:
        parts = path.split("?")[0].split("/")
        cleaned = []
        for p in parts:
            # Replace UUIDs or alphanumeric IDs with :id
            if len(p) > 20 or (len(p) > 8 and any(c.isdigit() for c in p) and any(c.isalpha() for c in p)):
                cleaned.append(":id")
            else:
                cleaned.append(p)
        return "/".join(cleaned) or "/"

    def generate_prometheus_output(self) -> str:
        """Render metrics in standard Prometheus text-based format."""
        lines = [
            "# HELP clinova_http_requests_total Total number of HTTP requests processed by endpoint and status.",
            "# TYPE clinova_http_requests_total counter",
        ]
        for (method, path, status), count in sorted(self._request_counts.items()):
            lines.append(
                f'clinova_http_requests_total{{method="{method}",path="{path}",status="{status}"}} {count}'
            )

        lines.extend([
            "\n# HELP clinova_http_request_duration_seconds Average HTTP request latency in seconds.",
            "# TYPE clinova_http_request_duration_seconds gauge",
        ])
        for path, durs in sorted(self._request_durations.items()):
            if durs:
                avg_dur = sum(durs) / len(durs)
                lines.append(f'clinova_http_request_duration_seconds{{path="{path}"}} {avg_dur:.4f}')

        lines.extend([
            "\n# HELP clinova_ocr_processing_duration_seconds Average duration of document OCR extraction.",
            "# TYPE clinova_ocr_processing_duration_seconds gauge",
        ])
        avg_ocr = sum(self._ocr_durations) / len(self._ocr_durations) if self._ocr_durations else 0.0
        lines.append(f"clinova_ocr_processing_duration_seconds {avg_ocr:.4f}")

        lines.extend([
            "\n# HELP clinova_ai_synthesis_duration_seconds Average duration of clinical AI SOAP synthesis.",
            "# TYPE clinova_ai_synthesis_duration_seconds gauge",
        ])
        avg_ai = sum(self._ai_durations) / len(self._ai_durations) if self._ai_durations else 0.0
        lines.append(f"clinova_ai_synthesis_duration_seconds {avg_ai:.4f}")

        lines.extend([
            "\n# HELP clinova_anonymized_entities_total Total PII entities redacted prior to LLM processing.",
            "# TYPE clinova_anonymized_entities_total counter",
        ])
        for entity_type, count in sorted(self._anonymized_counts.items()):
            lines.append(f'clinova_anonymized_entities_total{{entity_type="{entity_type}"}} {count}')

        lines.append("")
        return "\n".join(lines)


# Global Singleton Metrics Collector
metrics_collector = MetricsCollector()


class PrometheusMiddleware(BaseHTTPMiddleware):
    """Middleware to measure HTTP request latency and status codes."""

    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start_time
        metrics_collector.record_request(
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_seconds=duration,
        )
        return response
