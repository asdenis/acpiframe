import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const formUrl = process.env.NEXT_PUBLIC_FORM_BASE_URL;
    const formParams = process.env.NEXT_PUBLIC_FORM_PARAMS;

    if (!formUrl || !formParams) {
      return NextResponse.json(
        { error: 'Configuración incompleta' },
        { status: 500 }
      );
    }

    // Construir URL completa del formulario
    const timestamp = Date.now();
    const fullUrl = `${formUrl}?${formParams},gx-no-cache=${timestamp}`;

    // Obtener el HTML del formulario
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'User-Agent': request.headers.get('user-agent') || '',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Error del servidor de formularios: ${response.status}` },
        { status: response.status }
      );
    }

    const html = await response.text();
    const baseUrl = formUrl.split('?')[0]; // URL base sin parámetros

    // Inyectar base tag y script para interceptar peticiones POST y redirigirlas al proxy
    const modifiedHtml = html.replace(
      '</head>',
      `<base href="${baseUrl}/">
      <script>
        (function() {
          // Interceptar XMLHttpRequest
          const OriginalXHR = window.XMLHttpRequest;
          const XHROpen = OriginalXHR.prototype.open;
          
          OriginalXHR.prototype.open = function(method, url, ...args) {
            // Si es POST a ticketsplusform, redirigir al proxy
            if (method.toUpperCase() === 'POST' && url && url.includes('ticketsplusform')) {
              const urlObj = new URL(url, window.location.origin);
              const proxyUrl = '/api/form-proxy?' + urlObj.searchParams.toString();
              console.log('Interceptando POST:', url, '→', proxyUrl);
              return XHROpen.call(this, method, proxyUrl, ...args);
            }
            return XHROpen.call(this, method, url, ...args);
          };
          
          // Interceptar fetch también
          const originalFetch = window.fetch;
          window.fetch = function(resource, config) {
            if (typeof resource === 'string' && resource.includes('ticketsplusform') && config?.method?.toUpperCase() === 'POST') {
              const urlObj = new URL(resource, window.location.origin);
              const proxyUrl = '/api/form-proxy?' + urlObj.searchParams.toString();
              console.log('Interceptando fetch POST:', resource, '→', proxyUrl);
              return originalFetch(proxyUrl, config);
            }
            return originalFetch(resource, config);
          };
        })();
      </script></head>`
    );

    return new NextResponse(modifiedHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error en form-frame:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
