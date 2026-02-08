/**
 * Metrics API Endpoint
 *
 * Exports metrics in Prometheus format
 * Also provides alert checking
 */

import { NextRequest, NextResponse } from "next/server";
import { metricsCollector } from "@/lib/monitoring/metrics";

/**
 * GET /api/metrics
 * Export metrics in Prometheus format
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get("format") || "prometheus";

    if (format === "prometheus") {
      const metrics = await metricsCollector.getPrometheusMetrics();

      return new NextResponse(metrics, {
        headers: {
          "Content-Type": "text/plain; version=0.0.4",
        },
      });
    } else if (format === "json") {
      const [videoMetrics, postingMetrics, reflexionMetrics] = await Promise.all([
        metricsCollector.getVideoGenerationMetrics(),
        metricsCollector.getPostingMetrics(),
        metricsCollector.getReflexionMetrics(),
      ]);

      return NextResponse.json({
        video: videoMetrics,
        posting: postingMetrics,
        reflexion: reflexionMetrics,
      });
    } else if (format === "alerts") {
      const alerts = await metricsCollector.checkAlerts();

      return NextResponse.json(alerts);
    }

    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  } catch (error) {
    console.error("Metrics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
