import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const pathSegments = path;
    const resourcePath = pathSegments.join('/');
    
    // Construir URL del recurso en el servidor original
    const baseUrl = 'https://ticketsplusform.mendoza.gov.ar/ticketsplusform';
    const resourceUrl = `${baseUrl}/${resourcePath}`;

    // Obtener el recurso
    const response = await fetch(resourceUrl, {
      method: 'GET',
      headers: {
        'User-Agent': request.headers.get('user-agent') || '',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Error: ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: response.status,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Error en proxy:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
