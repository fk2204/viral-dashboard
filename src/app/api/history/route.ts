import { NextRequest, NextResponse } from 'next/server';

// Note: This API route provides the interface, but actual storage
// is handled client-side with IndexedDB for simplicity.
// These endpoints can be used for future server-side storage integration.

export async function GET(request: NextRequest) {
  // Client handles this with IndexedDB
  return NextResponse.json({
    message: 'History is stored client-side. Use the storage lib directly.',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // In a full implementation, this would save to a database
    return NextResponse.json({ success: true, id: body.id });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save generation' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    // In a full implementation, this would delete from a database
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete generation' },
      { status: 500 }
    );
  }
}
