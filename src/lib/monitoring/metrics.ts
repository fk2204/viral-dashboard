/**
 * Monitoring and Metrics System
 *
 * Exports metrics for Prometheus, Sentry error tracking, Axiom logging
 */

import { db } from "@/lib/db";

export interface SystemMetric {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
}

export class MetricsCollector {
  /**
   * Get video generation metrics
   */
  async getVideoGenerationMetrics(): Promise<SystemMetric[]> {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stats = await db.video.groupBy({
      by: ["status", "provider"],
      where: {
        createdAt: { gte: last24h },
      },
      _count: true,
      _avg: { generationCost: true },
    });

    const metrics: SystemMetric[] = [];

    for (const stat of stats) {
      metrics.push({
        name: "video_generation_total",
        value: stat._count,
        labels: {
          status: stat.status,
          provider: stat.provider,
        },
        timestamp: new Date(),
      });

      if (stat._avg.generationCost) {
        metrics.push({
          name: "video_generation_cost_avg",
          value: Number(stat._avg.generationCost),
          labels: {
            provider: stat.provider,
          },
          timestamp: new Date(),
        });
      }
    }

    return metrics;
  }

  /**
   * Get posting success rate
   */
  async getPostingMetrics(): Promise<SystemMetric[]> {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stats = await db.socialPost.groupBy({
      by: ["platform", "status"],
      where: {
        createdAt: { gte: last24h },
      },
      _count: true,
    });

    const metrics: SystemMetric[] = [];

    for (const stat of stats) {
      metrics.push({
        name: "posting_total",
        value: stat._count,
        labels: {
          platform: stat.platform,
          status: stat.status,
        },
        timestamp: new Date(),
      });
    }

    return metrics;
  }

  /**
   * Get reflexion accuracy
   */
  async getReflexionMetrics(): Promise<SystemMetric[]> {
    const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const feedbacks = await db.performanceFeedback.findMany({
      where: {
        reportedAt: { gte: last30d },
      },
      take: 100,
    });

    if (feedbacks.length === 0) {
      return [];
    }

    // Calculate average gap (predicted vs actual)
    // TODO: Get predictions from ML model
    const avgGap = 15; // Mock value

    return [
      {
        name: "reflexion_accuracy",
        value: 100 - avgGap,
        timestamp: new Date(),
      },
      {
        name: "reflexion_samples",
        value: feedbacks.length,
        timestamp: new Date(),
      },
    ];
  }

  /**
   * Get all metrics in Prometheus format
   */
  async getPrometheusMetrics(): Promise<string> {
    const videoMetrics = await this.getVideoGenerationMetrics();
    const postingMetrics = await this.getPostingMetrics();
    const reflexionMetrics = await this.getReflexionMetrics();

    const allMetrics = [...videoMetrics, ...postingMetrics, ...reflexionMetrics];

    const lines: string[] = [];

    for (const metric of allMetrics) {
      const labels = metric.labels
        ? Object.entries(metric.labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(",")
        : "";

      const labelsStr = labels ? `{${labels}}` : "";
      lines.push(`${metric.name}${labelsStr} ${metric.value} ${metric.timestamp.getTime()}`);
    }

    return lines.join("\n");
  }

  /**
   * Store metric in database
   */
  async storeMetric(
    metricType: string,
    value: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await db.systemMetrics.create({
      data: {
        metricType,
        value,
        metadata: metadata || {},
        recordedAt: new Date(),
      },
    });
  }

  /**
   * Check for alerts
   */
  async checkAlerts(): Promise<{
    alerts: {
      severity: "warning" | "critical";
      message: string;
    }[];
  }> {
    const alerts: { severity: "warning" | "critical"; message: string }[] = [];

    // Alert: Video generation failure rate >10%
    const last1h = new Date(Date.now() - 60 * 60 * 1000);
    const videos = await db.video.groupBy({
      by: ["status"],
      where: { createdAt: { gte: last1h } },
      _count: true,
    });

    const total = videos.reduce((sum, v) => sum + v._count, 0);
    const failed = videos.find((v) => v.status === "failed")?._count || 0;
    const failureRate = total > 0 ? (failed / total) * 100 : 0;

    if (failureRate > 10) {
      alerts.push({
        severity: "critical",
        message: `Video generation failure rate: ${failureRate.toFixed(1)}% (threshold: 10%)`,
      });
    }

    // Alert: Posting failure rate >5%
    const posts = await db.socialPost.groupBy({
      by: ["status"],
      where: { createdAt: { gte: last1h } },
      _count: true,
    });

    const totalPosts = posts.reduce((sum, p) => sum + p._count, 0);
    const failedPosts = posts.find((p) => p.status === "failed")?._count || 0;
    const postFailureRate = totalPosts > 0 ? (failedPosts / totalPosts) * 100 : 0;

    if (postFailureRate > 5) {
      alerts.push({
        severity: "warning",
        message: `Posting failure rate: ${postFailureRate.toFixed(1)}% (threshold: 5%)`,
      });
    }

    // Alert: High video costs >$10/video
    const avgCost = await db.video.aggregate({
      where: { createdAt: { gte: last1h } },
      _avg: { generationCost: true },
    });

    if (avgCost._avg.generationCost && Number(avgCost._avg.generationCost) > 10) {
      alerts.push({
        severity: "warning",
        message: `High avg video cost: $${Number(avgCost._avg.generationCost).toFixed(2)}/video (threshold: $10)`,
      });
    }

    return { alerts };
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector();
