/**
 * API Route: Trigger Video Generation
 *
 * Triggers async video generation for a concept
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await req.json();

    const { conceptId, platform } = body;

    if (!conceptId) {
      return NextResponse.json(
        { error: "conceptId is required" },
        { status: 400 }
      );
    }

    // Get concept from generation
    const generation = await db.generation.findFirst({
      where: {
        tenantId: user.tenantId,
        concepts: {
          path: "$[*].id",
          array_contains: conceptId,
        },
      },
    });

    if (!generation) {
      return NextResponse.json(
        { error: "Concept not found" },
        { status: 404 }
      );
    }

    // Extract concept from JSON
    const concepts = generation.concepts as any[];
    const concept = concepts.find((c: any) => c.id === conceptId);

    if (!concept) {
      return NextResponse.json(
        { error: "Concept not found in generation" },
        { status: 404 }
      );
    }

    // Determine platform
    const targetPlatform = platform || "tiktok";

    // Calculate priority based on category
    const categoryPriority: Record<string, number> = {
      finance: 10,
      tech: 9,
      luxury: 8,
      emotional: 7,
      music: 6,
      relationships: 5,
      fitness: 4,
      news: 3,
      gaming: 2,
      absurd: 1,
      cartoon: 1,
      food: 2,
    };

    const priority = categoryPriority[concept.category] || 5;

    // Trigger video generation via Inngest
    await inngest.send({
      name: "video/generate",
      data: {
        conceptId,
        tenantId: user.tenantId,
        category: concept.category,
        platform: targetPlatform,
        soraPrompt: concept.soraPrompt,
        veoPrompt: concept.veoPrompt,
        priority,
      },
    });

    return NextResponse.json({
      success: true,
      conceptId,
      message: "Video generation started",
      status: "queued",
    });
  } catch (error) {
    console.error("Video generation trigger error:", error);
    return NextResponse.json(
      { error: "Failed to trigger video generation" },
      { status: 500 }
    );
  }
}
