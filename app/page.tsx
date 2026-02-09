'use client';

import { useEffect, useState } from 'react';
import IframeLoader from './components/IframeLoader';
import DebugPanel from './components/DebugPanel';
import { debugLogger } from './utils/debug';

export default function Home() {
  const [formUrl, setFormUrl] = useState<string>('');

  useEffect(() => {
    // Construir la URL del formulario desde las variables de entorno
    const baseUrl = process.env.NEXT_PUBLIC_FORM_BASE_URL;
    const params = process.env.NEXT_PUBLIC_FORM_PARAMS;
    
    if (!baseUrl) {
      debugLogger.error('NEXT_PUBLIC_FORM_BASE_URL no está configurada');
      return;
    }
    
    if (!params) {
      debugLogger.error('NEXT_PUBLIC_FORM_PARAMS no está configurada');
      return;
    }
    
    // Agregar timestamp para evitar caché
    const timestamp = Date.now();
    const fullUrl = `${baseUrl}?${params},gx-no-cache=${timestamp}`;
    setFormUrl(fullUrl);
    
    debugLogger.info('Aplicación inicializada', {
      baseUrl,
      paramsLength: params.length,
      fullUrl: fullUrl.substring(0, 100) + '...' // Solo mostrar los primeros 100 caracteres
    });

    // Verificar configuración del navegador
    checkBrowserCapabilities();
    
  }, []);

  const checkBrowserCapabilities = () => {
    const capabilities = {
      cookiesEnabled: navigator.cookieEnabled,
      javaScriptEnabled: true, // Si llegamos aquí, JS está habilitado
      userAgent: navigator.userAgent,
      language: navigator.language,
      onLine: navigator.onLine,
      platform: navigator.platform,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      localStorage: (() => {
        try {
          localStorage.setItem('test', 'test');
          localStorage.removeItem('test');
          return true;
        } catch {
          return false;
        }
      })(),
      sessionStorage: (() => {
        try {
          sessionStorage.setItem('test', 'test');
          sessionStorage.removeItem('test');
          return true;
        } catch {
          return false;
        }
      })()
    };

    debugLogger.info('Capacidades del navegador verificadas', capabilities);

    // Advertencias específicas
    if (!capabilities.cookiesEnabled) {
      debugLogger.warning('Las cookies están deshabilitadas - esto puede afectar el funcionamiento del formulario');
    }
    
    if (!capabilities.onLine) {
      debugLogger.error('El navegador indica que está sin conexión');
    }
    
    if (!capabilities.localStorage) {
      debugLogger.warning('localStorage no está disponible');
    }
    
    if (!capabilities.sessionStorage) {
      debugLogger.warning('sessionStorage no está disponible');
    }
  };

  if (!formUrl) {
    return (
      <div className="container">
        <DebugPanel />
        <div className="header">
          <h1>Error de Configuración</h1>
          <p>No se pudo construir la URL del formulario. Verifica las variables de entorno.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <DebugPanel />
      
      <div className="header">
        <h1>Formulario Tickets Plus</h1>
        <p>Gobierno de Mendoza</p>
      </div>
      
      <IframeLoader 
        src={formUrl}
        width={process.env.NEXT_PUBLIC_IFRAME_WIDTH}
        height={process.env.NEXT_PUBLIC_IFRAME_HEIGHT}
        sandbox={process.env.NEXT_PUBLIC_IFRAME_SANDBOX}
      />
      
      {debugLogger.isDebugEnabled() && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          background: 'rgba(255, 255, 255, 0.1)', 
          borderRadius: '8px',
          color: 'white',
          fontSize: '12px'
        }}>
          <h3>Información de Debug</h3>
          <p><strong>URL del formulario:</strong> {formUrl.substring(0, 80)}...</p>
          <p><strong>Modo debug:</strong> {process.env.NEXT_PUBLIC_DEBUG_MODE}</p>
          <p><strong>Nivel de debug:</strong> {process.env.NEXT_PUBLIC_DEBUG_LEVEL}</p>
          <p><strong>Timeout de carga:</strong> {process.env.NEXT_PUBLIC_LOAD_TIMEOUT}ms</p>
          <p><strong>Intentos de reintento:</strong> {process.env.NEXT_PUBLIC_RETRY_ATTEMPTS}</p>
        </div>
      )}
    </div>
  );
}