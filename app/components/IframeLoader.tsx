'use client';

import { useState, useEffect, useRef } from 'react';
import { debugLogger } from '../utils/debug';

interface IframeLoaderProps {
  src: string;
  width?: string;
  height?: string;
  sandbox?: string;
}

export default function IframeLoader({ 
  src, 
  width = '100%', 
  height = '800px',
  sandbox = 'allow-scripts allow-forms allow-popups allow-top-navigation allow-popups-to-escape-sandbox'
}: IframeLoaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [loadStartTime, setLoadStartTime] = useState<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const maxRetries = parseInt(process.env.NEXT_PUBLIC_RETRY_ATTEMPTS || '3');
  const loadTimeout = parseInt(process.env.NEXT_PUBLIC_LOAD_TIMEOUT || '30000');
  const retryDelay = parseInt(process.env.NEXT_PUBLIC_RETRY_DELAY || '2000');

  useEffect(() => {
    debugLogger.environmentCheck();
    loadIframe();
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [src, retryCount]);

  const loadIframe = () => {
    setIsLoading(true);
    setError(null);
    setLoadStartTime(Date.now());
    
    debugLogger.iframeStartLoading(src);
    debugLogger.cookieCheck(document.cookie);

    // Configurar timeout
    timeoutRef.current = setTimeout(() => {
      debugLogger.iframeTimeout(src, loadTimeout);
      handleError(`Timeout: El formulario no se cargó en ${loadTimeout / 1000} segundos`);
    }, loadTimeout);

    // Verificar conectividad de red
    checkNetworkConnectivity();
  };

  const checkNetworkConnectivity = async () => {
    try {
      debugLogger.networkRequest(src, 'HEAD');
      
      // Intentar hacer una petición HEAD para verificar conectividad
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(src, {
          method: 'HEAD',
          mode: 'no-cors', // Para evitar problemas de CORS
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        debugLogger.networkResponse(src, response.status || 0, response.statusText || 'Unknown');
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        // En modo no-cors, fetch puede "fallar" pero la petición se envía
        if (fetchError.name !== 'AbortError') {
          debugLogger.info('Petición enviada (modo no-cors)', { error: fetchError.message });
        }
      }
      
    } catch (networkError: any) {
      debugLogger.error('Error de conectividad de red', {
        error: networkError.message,
        name: networkError.name
      });
      
      if (networkError.name === 'AbortError') {
        debugLogger.warning('Petición de verificación de red cancelada por timeout');
      }
    }
  };

  const handleLoad = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    const loadTime = Date.now() - loadStartTime;
    debugLogger.iframeLoaded(src, loadTime);
    
    setIsLoading(false);
    setError(null);
    
    // Verificar si el iframe se cargó correctamente
    setTimeout(() => {
      checkIframeContent();
    }, 1000);
  };

  const handleError = (errorMessage: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    debugLogger.iframeError(errorMessage, src);
    setIsLoading(false);
    setError(errorMessage);
  };

  const checkIframeContent = () => {
    try {
      const iframe = iframeRef.current;
      if (!iframe) return;

      // Intentar acceder al contenido del iframe (puede fallar por CORS)
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          debugLogger.success('Contenido del iframe accesible');
          
          // Verificar si hay contenido
          const bodyContent = iframeDoc.body?.innerHTML;
          if (bodyContent && bodyContent.trim().length > 0) {
            debugLogger.success('Iframe contiene contenido válido');
          } else {
            debugLogger.warning('Iframe parece estar vacío');
          }
        }
      } catch (corsError) {
        debugLogger.info('No se puede acceder al contenido del iframe (CORS esperado)');
      }

      // Verificar dimensiones del iframe
      const rect = iframe.getBoundingClientRect();
      debugLogger.debug('Dimensiones del iframe', {
        width: rect.width,
        height: rect.height,
        visible: rect.width > 0 && rect.height > 0
      });

    } catch (error: any) {
      debugLogger.error('Error al verificar contenido del iframe', error.message);
    }
  };

  const retry = () => {
    if (retryCount < maxRetries) {
      debugLogger.info(`Reintentando carga del iframe (intento ${retryCount + 1}/${maxRetries})`);
      
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, retryDelay);
    } else {
      debugLogger.error('Se agotaron todos los intentos de carga');
    }
  };

  const handleIframeError = () => {
    handleError('Error al cargar el iframe');
  };

  return (
    <div className="iframe-container" style={{ height }}>
      <div className="iframe-wrapper">
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Cargando formulario...</p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
              {retryCount > 0 && `Intento ${retryCount + 1}/${maxRetries + 1}`}
            </p>
          </div>
        )}
        
        {error && (
          <div className="error-message">
            <h3>Error al cargar el formulario</h3>
            <p>{error}</p>
            {retryCount < maxRetries && (
              <button className="retry-button" onClick={retry}>
                Reintentar ({maxRetries - retryCount} intentos restantes)
              </button>
            )}
            <div style={{ marginTop: '10px', fontSize: '12px' }}>
              <p>URL: {src}</p>
              <p>Intento: {retryCount + 1}/{maxRetries + 1}</p>
            </div>
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          src={src}
          width={width}
          height={height}
          sandbox={sandbox}
          referrerPolicy="same-origin"
          allow="storage-access"
          onLoad={handleLoad}
          onError={handleIframeError}
          style={{
            border: 'none',
            display: error ? 'none' : 'block'
          }}
          title="Formulario Tickets Plus"
        />
      </div>
    </div>
  );
}