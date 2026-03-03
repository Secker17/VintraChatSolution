(function() {
  'use strict';

  // Get widget configuration from multiple sources
  var config = window.VintraChatConfig || window.ChatFlowConfig || {};
  var widgetKey = config.widgetKey;
  
  // Also check for data attribute on script tag
  if (!widgetKey) {
    var currentScript = document.currentScript || (function() {
      var scripts = document.getElementsByTagName('script');
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && (scripts[i].src.indexOf('vintrachat.js') !== -1 || scripts[i].src.indexOf('chatflow.js') !== -1)) {
          return scripts[i];
        }
      }
      return null;
    })();
    
    if (currentScript) {
      widgetKey = currentScript.getAttribute('data-widget-key') || currentScript.getAttribute('data-key');
    }
  }

  if (!widgetKey) {
    console.error('VintraChat: Widget key is required. Add data-widget-key="YOUR_KEY" to the script tag or set window.VintraChatConfig = { widgetKey: "YOUR_KEY" }');
    return;
  }

  // Get base URL from script source
  function getBaseUrl() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src;
      if (src && (src.indexOf('vintrachat.js') !== -1 || src.indexOf('chatflow.js') !== -1)) {
        // Extract origin from script URL
        var url = new URL(src);
        return url.origin;
      }
    }
    // Fallback to current origin
    return window.location.origin;
  }

  var baseUrl = getBaseUrl();

  // Create widget container
  var container = document.createElement('div');
  container.id = 'vintrachat-widget-container';
  document.body.appendChild(container);

  // Create iframe
  var iframe = document.createElement('iframe');
  iframe.id = 'vintrachat-widget-iframe';
  iframe.src = baseUrl + '/widget/embed/' + widgetKey;
  iframe.allow = 'microphone; camera';
  iframe.style.cssText = 'position:fixed;bottom:90px;right:20px;width:0;height:0;border:none;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.15);transition:all 0.3s ease;z-index:2147483647;opacity:0;pointer-events:none;';
  container.appendChild(iframe);

  // Create toggle button
  var button = document.createElement('button');
  button.id = 'vintrachat-toggle-btn';
  button.setAttribute('aria-label', 'Open chat');
  button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>';
  button.style.cssText = 'position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;border:none;background:#0066FF;color:white;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,102,255,0.4);transition:all 0.3s ease;z-index:2147483647;';
  container.appendChild(button);

  var isOpen = false;

  function openWidget() {
    isOpen = true;
    iframe.style.width = '380px';
    iframe.style.height = '520px';
    iframe.style.opacity = '1';
    iframe.style.pointerEvents = 'auto';
    button.style.transform = 'scale(0)';
    button.style.opacity = '0';
    button.style.pointerEvents = 'none';
    handleResize();
  }

  function closeWidget() {
    isOpen = false;
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    button.style.transform = 'scale(1)';
    button.style.opacity = '1';
    button.style.pointerEvents = 'auto';
  }

  // Toggle widget
  button.addEventListener('click', function() {
    if (isOpen) {
      closeWidget();
    } else {
      openWidget();
    }
  });

  // Listen for close message from iframe
  window.addEventListener('message', function(event) {
    if (event.data === 'vintrachat:close' || event.data === 'chatflow:close') {
      closeWidget();
    }
  });

  // Mobile responsiveness
  function handleResize() {
    if (window.innerWidth < 480 && isOpen) {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.bottom = '0';
      iframe.style.right = '0';
      iframe.style.borderRadius = '0';
    } else if (isOpen) {
      iframe.style.width = '380px';
      iframe.style.height = '520px';
      iframe.style.bottom = '90px';
      iframe.style.right = '20px';
      iframe.style.borderRadius = '16px';
    }
  }

  window.addEventListener('resize', handleResize);

  // Expose API for programmatic control
  window.VintraChat = {
    open: openWidget,
    close: closeWidget,
    toggle: function() { isOpen ? closeWidget() : openWidget(); }
  };
})();
