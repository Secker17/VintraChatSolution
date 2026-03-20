'use client'

import { useEffect, useMemo, useRef } from 'react'

import styles from './styles/script-widget-preview.module.css'

export type WidgetScriptEnvironment = 'prod' | 'local'

interface ScriptWidgetPreviewProps {
  widgetKey: string
  environment: WidgetScriptEnvironment
  prodBaseUrl: string
  localBaseUrl: string
  settings: Record<string, unknown>
  className?: string
}

function buildSrcDoc(params: {
  widgetKey: string
  scriptSrc: string
  initialSettings: Record<string, unknown>
}) {
  const initialSettingsJson = JSON.stringify(params.initialSettings || {})
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      html, body { height: 100%; }
      body { margin: 0; background: #f3f4f6; }
      .preview-page { height: 100%; position: relative; overflow: hidden; }
      .preview-canvas { height: 100%; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); }
    </style>
  </head>
  <body>
    <div class="preview-page">
      <div class="preview-canvas"></div>
    </div>

    <script>
      (function() {
        window.VintraChatConfig = window.VintraChatConfig || {};
        window.VintraChatConfig.widgetKey = ${JSON.stringify(params.widgetKey)};
        window.VintraChatConfig.previewSettings = ${initialSettingsJson};

        window.addEventListener('message', function(event) {
          var data = event && event.data;
          if (!data || data.type !== 'VINTRACHAT_PREVIEW_SETTINGS') return;

          window.VintraChatConfig = window.VintraChatConfig || {};
          window.VintraChatConfig.previewSettings = data.settings || {};

          if (window.VintraChat && typeof window.VintraChat.updatePreviewSettings === 'function') {
            window.VintraChat.updatePreviewSettings(data.settings || {});
          }
        });
      })();
    </script>

    <script src="${params.scriptSrc}" data-widget-key="${params.widgetKey}" async></script>
  </body>
</html>`
}

export function ScriptWidgetPreview({
  widgetKey,
  environment,
  prodBaseUrl,
  localBaseUrl,
  settings,
  className,
}: ScriptWidgetPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const baseUrl = environment === 'local' ? localBaseUrl : prodBaseUrl
  const scriptSrc = `${baseUrl.replace(/\/$/, '')}/widget/vintrachat.js`

  const srcDoc = useMemo(() => {
    return buildSrcDoc({
      widgetKey,
      scriptSrc,
      initialSettings: settings,
    })
  }, [widgetKey, scriptSrc])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    try {
      iframe.contentWindow?.postMessage(
        {
          type: 'VINTRACHAT_PREVIEW_SETTINGS',
          settings,
        },
        '*'
      )
    } catch {
      // ignore
    }
  }, [settings])

  return (
    <div className={`${styles.container} ${className || ''}`.trim()}>
      <iframe
        ref={iframeRef}
        className={styles.iframe}
        sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        title="Widget preview"
        srcDoc={srcDoc}
      />
    </div>
  )
}
