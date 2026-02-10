# Diagnóstico de Integración de Iframe - Tickets Plus

## Resumen Ejecutivo

La integración del formulario de Tickets Plus en un iframe cross-origin tiene **limitaciones técnicas** que requieren configuración específica en el servidor de Tickets Plus.

## Problemas Identificados

### 1. ✗ Cookies sin SameSite=None (CRÍTICO)
**Estado**: Problema del servidor de Tickets Plus
**Impacto**: Las cookies no se envían en peticiones cross-origin

```
Cookies actuales:
- GX_CLIENT_ID: No tiene SameSite
- GX_SESSION_ID: No tiene SameSite
```

**Solución requerida**: El servidor debe enviar:
```
Set-Cookie: GX_SESSION_ID=...; SameSite=None; Secure; HttpOnly
```

### 2. ✗ CORS no habilitado (CRÍTICO)
**Estado**: Problema del servidor de Tickets Plus
**Impacto**: Las peticiones POST desde el iframe son rechazadas con 401

**Solución requerida**: El servidor debe devolver:
```
Access-Control-Allow-Origin: https://tu-dominio.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### 3. ✗ Referrer-Policy: strict-origin-when-cross-origin (CRÍTICO)
**Estado**: Problema del servidor de Tickets Plus
**Impacto**: Rechaza peticiones POST sin referrer válido

**Solución requerida**: Cambiar a:
```
Referrer-Policy: no-referrer
```

### 4. ✓ X-Frame-Options (RESUELTO)
**Estado**: Configurado correctamente en tu app
**Valor**: ALLOWALL
**Impacto**: Permite que el iframe se cargue

### 5. ✓ SSL/TLS (RESUELTO)
**Estado**: Ambos dominios tienen certificados válidos
**Impacto**: Comunicación segura

## Configuración Actual de Tu App

### vercel.json
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "ALLOWALL"
        },
        {
          "key": "Referrer-Policy",
          "value": "no-referrer"
        },
        {
          "key": "Access-Control-Allow-Credentials",
          "value": "true"
        }
      ]
    }
  ]
}
```

### next.config.js
```javascript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'ALLOWALL',
        },
        {
          key: 'Referrer-Policy',
          value: 'no-referrer',
        },
      ],
    },
  ];
}
```

### IframeLoader.tsx
```typescript
sandbox = 'allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-storage-access-by-user-activation'
```

## Pasos Siguientes

### Opción 1: Contactar a Tickets Plus (RECOMENDADO)
Solicita al equipo de Tickets Plus que implementen:

1. **CORS Headers**:
   ```
   Access-Control-Allow-Origin: https://tu-dominio.com
   Access-Control-Allow-Credentials: true
   Access-Control-Allow-Methods: GET, POST, OPTIONS
   ```

2. **Cookies con SameSite=None**:
   ```
   Set-Cookie: GX_SESSION_ID=...; SameSite=None; Secure; HttpOnly
   ```

3. **Referrer-Policy**:
   ```
   Referrer-Policy: no-referrer
   ```

4. **X-Frame-Options**:
   ```
   X-Frame-Options: ALLOWALL
   ```

### Opción 2: Proxy Backend (ALTERNATIVA)
Si Tickets Plus no puede cambiar su configuración, implementa un proxy:

```typescript
// app/api/form-proxy/route.ts
export async function POST(request: NextRequest) {
  const body = await request.text();
  const response = await fetch('https://ticketsplusform.mendoza.gov.ar/...', {
    method: 'POST',
    body,
    credentials: 'include',
  });
  return new NextResponse(await response.text());
}
```

### Opción 3: postMessage API (ALTERNATIVA)
Usar comunicación entre ventanas sin compartir cookies.

## Verificación

Para verificar que los cambios se han aplicado:

```bash
# Ejecutar diagnóstico
node scripts/diagnose-iframe.js

# O con URLs personalizadas
node scripts/diagnose-iframe.js "https://tu-iframe-url" "https://tu-host-url"
```

## Checklist de Configuración

- [x] SSL/TLS válido en ambos dominios
- [x] X-Frame-Options: ALLOWALL en tu app
- [x] Referrer-Policy: no-referrer en tu app
- [ ] CORS habilitado en servidor de Tickets Plus
- [ ] Cookies con SameSite=None en servidor de Tickets Plus
- [ ] Referrer-Policy: no-referrer en servidor de Tickets Plus

## Conclusión

Tu aplicación está correctamente configurada. El problema está en el servidor de Tickets Plus que no está preparado para funcionar en iframes cross-origin. Necesitas contactar al equipo de soporte de Tickets Plus para que implementen los cambios necesarios.

Si no pueden hacer esos cambios, la única alternativa es implementar un proxy backend en tu servidor.
