import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const resourcePath = path.join('/');
    
    // Construir URL del recurso en el servidor original
    const resourceUrl = `https://ticketsplusform.mendoza.gov.ar/${resourcePath}`;

    console.log('Proxy request:', resourceUrl);

    // Obtener el recurso
    const response = await fetch(resourceUrl, {
      method: 'GET',
      headers: {
        'User-Agent': request.headers.get('user-agent') || '',
      },
    });

    if (!response.ok) {
      console.error('Proxy error:', response.status, response.statusText);
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
