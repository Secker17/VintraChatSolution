(function() {
  'use strict';

  // Prevent double initialization
  if (window.VintraChat && window.VintraChat._initialized) {
    return;
  }

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
        try {
          var url = new URL(src);
          return url.origin;
        } catch(e) {
          // Fallback for older browsers
          var a = document.createElement('a');
          a.href = src;
          return a.protocol + '//' + a.host;
        }
      }
    }
    // Fallback to current origin
    return window.location.origin;
  }

  var baseUrl = getBaseUrl();

  // Inject CSS to ensure widget always appears on top
  var style = document.createElement('style');
  style.textContent = '#vintrachat-widget-container,#vintrachat-widget-container *{box-sizing:border-box!important}#vintrachat-widget-container{position:fixed!important;bottom:0!important;right:0!important;z-index:2147483647!important;pointer-events:none!important;width:auto!important;height:auto!important}#vintrachat-widget-iframe,#vintrachat-toggle-btn{pointer-events:auto!important}';
  document.head.appendChild(style);

  // Create widget container
  var container = document.createElement('div');
  container.id = 'vintrachat-widget-container';
  document.body.appendChild(container);

  // Create iframe
  var iframe = document.createElement('iframe');
  iframe.id = 'vintrachat-widget-iframe';
  iframe.src = baseUrl + '/widget/embed/' + widgetKey;
  iframe.allow = 'microphone; camera';
  iframe.title = 'VintraChat Widget';
  iframe.style.cssText = 'position:fixed!important;bottom:90px!important;right:20px!important;width:0!important;height:0!important;border:none!important;border-radius:16px!important;box-shadow:0 8px 32px rgba(0,0,0,0.2)!important;transition:all 0.3s cubic-bezier(0.4,0,0.2,1)!important;z-index:2147483647!important;opacity:0!important;pointer-events:none!important;background:#fff!important;';
  container.appendChild(iframe);

  // Create toggle button
  var button = document.createElement('button');
  button.id = 'vintrachat-toggle-btn';
  button.setAttribute('aria-label', 'Open chat');
  button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>';
  button.style.cssText = 'position:fixed!important;bottom:20px!important;right:20px!important;width:60px!important;height:60px!important;border-radius:50%!important;border:none!important;background:linear-gradient(135deg,#0066FF 0%,#0052CC 100%)!important;color:white!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;box-shadow:0 4px 16px rgba(0,102,255,0.4)!important;transition:all 0.3s cubic-bezier(0.4,0,0.2,1)!important;z-index:2147483647!important;outline:none!important;';
  
  // Add hover effect
  button.onmouseover = function() { 
    if (!isOpen) {
      this.style.transform = 'scale(1.1)';
      this.style.boxShadow = '0 6px 24px rgba(0,102,255,0.5)';
    }
  };
  button.onmouseout = function() { 
    if (!isOpen) {
      this.style.transform = 'scale(1)';
      this.style.boxShadow = '0 4px 16px rgba(0,102,255,0.4)';
    }
  };
  
  container.appendChild(button);

  var isOpen = false;

  function openWidget() {
    isOpen = true;
    iframe.style.width = '380px';
    iframe.style.height = '550px';
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
    button.style.boxShadow = '0 4px 16px rgba(0,102,255,0.4)';
  }

  // Toggle widget
  button.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
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
    if (window.innerWidth < 500 && isOpen) {
      iframe.style.width = '100vw';
      iframe.style.height = '100vh';
      iframe.style.bottom = '0';
      iframe.style.right = '0';
      iframe.style.borderRadius = '0';
    } else if (isOpen) {
      iframe.style.width = '380px';
      iframe.style.height = '550px';
      iframe.style.bottom = '90px';
      iframe.style.right = '20px';
      iframe.style.borderRadius = '16px';
    }
  }

  window.addEventListener('resize', handleResize);

  // Expose API for programmatic control
  window.VintraChat = {
    _initialized: true,
    open: openWidget,
    close: closeWidget,
    toggle: function() { isOpen ? closeWidget() : openWidget(); },
    isOpen: function() { return isOpen; }
  };
})();
