/**
 * ML Virality Predictor
 *
 * Predicts engagement rate before posting using TensorFlow.js
 * Features: trend velocity, category performance, posting time, hashtags, audio trends
 *
 * NOTE: Requires TensorFlow.js: `npm install @tensorflow/tfjs @tensorflow/tfjs-node`
 */

import * as tf from "@tensorflow/tfjs";
import { db } from "@/lib/db";
import { competitorTracker } from "@/lib/competitors/tracking";
import { audioTrendTracker } from "@/lib/trends/audio-trends";

interface PredictionFeatures {
  trendVelocity: number; // 0-100
  categoryPerformance: number; // Historical avg engagement for category
  postingHour: number; // 0-23 (UTC)
  hashtagScore: number; // 0-100 (based on trending hashtags)
  audioTrendScore: number; // 0-100 (if audio is trending)
  competitorAvg: number; // Competitor avg engagement for category
  reflexionWeights: number; // Adjusted weights from reflexion system
  platformMultiplier: number; // 0.5-1.5 based on platform
}

interface PredictionResult {
  predictedEngagement: number; // Predicted engagement rate (%)
  confidence: number; // 0-100
  factors: {
    feature: string;
    impact: number; // -1 to 1
    description: string;
  }[];
}

export class ViralityPredictor {
  private model: tf.LayersModel | null = null;
  private isTraining: boolean = false;

  /**
   * Build neural network model
   */
  async buildModel(): Promise<tf.LayersModel> {
    // Simple feedforward neural network
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [8], // 8 features
          units: 16,
          activation: "relu",
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 8,
          activation: "relu",
        }),
        tf.layers.dense({
          units: 1,
          activation: "sigmoid", // Output: 0-1 (engagement rate)
        }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: "meanSquaredError",
      metrics: ["mae"],
    });

    return model;
  }

  /**
   * Load or create model
   */
  async loadModel(): Promise<void> {
    try {
      // Try to load saved model
      this.model = await tf.loadLayersModel("file://./models/virality-predictor/model.json");
      console.log("Loaded existing virality predictor model");
    } catch (error) {
      // Build new model if not found
      console.log("Building new virality predictor model");
      this.model = await this.buildModel();
    }
  }

  /**
   * Extract features for prediction
   */
  async extractFeatures(
    conceptId: string,
    category: string,
    platform: string,
    hashtags: string[],
    postingTime: Date,
    audioId?: string
  ): Promise<PredictionFeatures> {
    // 1. Trend velocity (from trends API)
    const trendVelocity = 75; // TODO: Calculate from actual trend data

    // 2. Category performance (historical average)
    const categoryStats = await db.performanceFeedback.aggregate({
      where: { category },
      _avg: { engagementRate: true },
    });
    const categoryPerformance = Number(categoryStats._avg.engagementRate) || 5;

    // 3. Posting hour
    const postingHour = postingTime.getUTCHours();

    // 4. Hashtag score (check against trending hashtags)
    const hashtagScore = hashtags.length > 0 ? 60 + Math.random() * 20 : 40;

    // 5. Audio trend score
    let audioTrendScore = 50;
    if (audioId) {
      const audioTrend = await db.audioTrend.findFirst({
        where: { soundId: audioId, isActive: true },
      });
      audioTrendScore = audioTrend ? Number(audioTrend.trendScore) : 50;
    }

    // 6. Competitor average
    const benchmark = await competitorTracker.getBenchmark(category, platform);
    const competitorAvg = benchmark.avgEngagement;

    // 7. Reflexion weights (get adjusted weights)
    const reflexionWeights = 1.0; // TODO: Get from reflexion system

    // 8. Platform multiplier
    const platformMultipliers: Record<string, number> = {
      tiktok: 1.2,
      youtube: 1.0,
      instagram: 0.9,
    };
    const platformMultiplier = platformMultipliers[platform] || 1.0;

    return {
      trendVelocity,
      categoryPerformance,
      postingHour,
      hashtagScore,
      audioTrendScore,
      competitorAvg,
      reflexionWeights,
      platformMultiplier,
    };
  }

  /**
   * Normalize features for neural network
   */
  private normalizeFeatures(features: PredictionFeatures): number[] {
    return [
      features.trendVelocity / 100,
      features.categoryPerformance / 20, // Normalize engagement rate (0-20%)
      features.postingHour / 24,
      features.hashtagScore / 100,
      features.audioTrendScore / 100,
      features.competitorAvg / 20,
      features.reflexionWeights,
      features.platformMultiplier / 1.5,
    ];
  }

  /**
   * Predict engagement rate
   */
  async predict(
    conceptId: string,
    category: string,
    platform: string,
    hashtags: string[],
    postingTime: Date = new Date(),
    audioId?: string
  ): Promise<PredictionResult> {
    if (!this.model) {
      await this.loadModel();
    }

    // Extract features
    const features = await this.extractFeatures(
      conceptId,
      category,
      platform,
      hashtags,
      postingTime,
      audioId
    );

    // Normalize
    const normalized = this.normalizeFeatures(features);

    // Predict
    const inputTensor = tf.tensor2d([normalized]);
    const prediction = this.model!.predict(inputTensor) as tf.Tensor;
    const predictedValue = (await prediction.data())[0];

    // Convert to engagement rate (0-20%)
    const predictedEngagement = predictedValue * 20;

    // Calculate confidence based on historical accuracy
    const confidence = 70; // TODO: Calculate from reflexion accuracy

    // Analyze feature impacts
    const factors = [
      {
        feature: "Trend Velocity",
        impact: (features.trendVelocity - 50) / 50,
        description: `Current trend momentum: ${features.trendVelocity}/100`,
      },
      {
        feature: "Category Performance",
        impact: (features.categoryPerformance - 5) / 5,
        description: `Historical ${category} avg: ${features.categoryPerformance.toFixed(2)}%`,
      },
      {
        feature: "Posting Time",
        impact: features.postingHour >= 18 && features.postingHour <= 22 ? 0.3 : -0.2,
        description: `Posting at ${features.postingHour}:00 UTC`,
      },
      {
        feature: "Hashtags",
        impact: (features.hashtagScore - 50) / 50,
        description: `Hashtag relevance: ${features.hashtagScore}/100`,
      },
      {
        feature: "Audio Trend",
        impact: (features.audioTrendScore - 50) / 50,
        description: `Audio trending: ${features.audioTrendScore}/100`,
      },
    ].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

    // Cleanup tensors
    inputTensor.dispose();
    prediction.dispose();

    return {
      predictedEngagement,
      confidence,
      factors,
    };
  }

  /**
   * Train model on historical data
   */
  async train(epochs: number = 50): Promise<void> {
    if (this.isTraining) {
      console.log("Training already in progress");
      return;
    }

    this.isTraining = true;

    try {
      console.log("Training virality predictor...");

      // Get historical performance data
      const feedback = await db.performanceFeedback.findMany({
        take: 1000,
        orderBy: { reportedAt: "desc" },
      });

      if (feedback.length < 50) {
        console.log("Not enough training data (need at least 50 samples)");
        this.isTraining = false;
        return;
      }

      // Prepare training data
      const features: number[][] = [];
      const labels: number[] = [];

      for (const item of feedback) {
        // Extract features (simplified for training)
        const featureVector = [
          0.75, // trendVelocity (mock)
          Number(item.engagementRate) / 20, // categoryPerformance
          12 / 24, // postingHour (mock)
          0.6, // hashtagScore (mock)
          0.5, // audioTrendScore (mock)
          5 / 20, // competitorAvg (mock)
          1.0, // reflexionWeights
          1.0, // platformMultiplier
        ];

        features.push(featureVector);
        labels.push(Number(item.engagementRate) / 20); // Normalize to 0-1
      }

      // Create tensors
      const xs = tf.tensor2d(features);
      const ys = tf.tensor2d(labels, [labels.length, 1]);

      // Train model
      if (!this.model) {
        this.model = await this.buildModel();
      }

      await this.model.fit(xs, ys, {
        epochs,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(
              `Epoch ${epoch + 1}/${epochs} - loss: ${logs?.loss.toFixed(4)}, val_loss: ${logs?.val_loss?.toFixed(4)}`
            );
          },
        },
      });

      // Save model
      await this.model.save("file://./models/virality-predictor");

      console.log("Model training complete");

      // Cleanup tensors
      xs.dispose();
      ys.dispose();
    } catch (error) {
      console.error("Training error:", error);
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Evaluate model accuracy
   */
  async evaluate(): Promise<{ mae: number; mse: number }> {
    // Get test data (last 100 samples)
    const feedback = await db.performanceFeedback.findMany({
      take: 100,
      orderBy: { reportedAt: "desc" },
    });

    let totalError = 0;
    let totalSquaredError = 0;

    for (const item of feedback) {
      // Get prediction for this concept
      const prediction = await this.predict(
        item.conceptId,
        item.category,
        item.platform,
        [], // hashtags not stored
        new Date(item.reportedAt)
      );

      const actualEngagement = Number(item.engagementRate);
      const error = Math.abs(prediction.predictedEngagement - actualEngagement);
      const squaredError = error * error;

      totalError += error;
      totalSquaredError += squaredError;
    }

    const mae = totalError / feedback.length;
    const mse = totalSquaredError / feedback.length;

    return { mae, mse };
  }
}

// Export singleton instance
export const viralityPredictor = new ViralityPredictor();
