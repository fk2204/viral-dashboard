import { NextResponse } from 'next/server';
import { generateTrendData } from '@/lib/trends';
import { generateFiveConcepts } from '@/lib/generator';
import { v4 as uuidv4 } from 'uuid';
import { Generation } from '@/types';

export async function POST() {
  try {
    // Generate trend data
    const trends = generateTrendData();

    // Generate 5 diverse concepts
    const concepts = generateFiveConcepts(trends);

    // Create generation object
    const generation: Generation = {
      id: uuidv4(),
      date: new Date().toISOString(),
      concepts,
      trends,
      isFavorite: false,
    };

    return NextResponse.json(generation);
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate concepts' },
      { status: 500 }
    );
  }
}
