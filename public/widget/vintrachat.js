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
        try {
          var url = new URL(src);
          return url.origin;
        } catch(e) {
          var a = document.createElement('a');
          a.href = src;
          return a.protocol + '//' + a.host;
        }
      }
    }
    return window.location.origin;
  }

  var baseUrl = getBaseUrl();

  // Icon SVGs (use viewBox for scaling)
  function getIcon(type, size) {
    var icons = {
      chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
      message: '<rect width="18" height="14" x="3" y="5" rx="2"/><path d="m3 7 9 6 9-6"/>',
      support: '<path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/>',
      wave: '<path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>'
    };
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (icons[type] || icons.chat) + '</svg>';
  }

  var SIZES = {
    small: { button: 48, icon: 20 },
    medium: { button: 60, icon: 28 },
    large: { button: 72, icon: 32 }
  };

  // Default settings
  var widgetSettings = {
    primaryColor: '#0066FF',
    position: 'bottom-right',
    bubbleIcon: 'chat',
    bubbleSize: 'medium',
    bubbleStyle: 'solid',
    bubbleShadow: true,
    bubbleAnimation: 'none'
  };

  // Inject CSS to ensure widget always appears on top
  var style = document.createElement('style');
  style.textContent = '#vintrachat-widget-container,#vintrachat-widget-container *{box-sizing:border-box!important}#vintrachat-widget-container{position:fixed!important;bottom:0!important;z-index:2147483647!important;pointer-events:none!important;width:auto!important;height:auto!important}#vintrachat-widget-iframe,#vintrachat-toggle-btn{pointer-events:auto!important}';
  document.head.appendChild(style);

  // Create widget container
  var container = document.createElement('div');
  container.id = 'vintrachat-widget-container';
  document.body.appendChild(container);

  // Create iframe (hidden initially)
  var iframe = document.createElement('iframe');
  iframe.id = 'vintrachat-widget-iframe';
  iframe.src = baseUrl + '/widget/embed/' + widgetKey;
  iframe.allow = 'microphone; camera';
  iframe.title = 'VintraChat Widget';
  container.appendChild(iframe);

  // Create toggle button
  var button = document.createElement('button');
  button.id = 'vintrachat-toggle-btn';
  button.setAttribute('aria-label', 'Open chat');
  container.appendChild(button);

  var isOpen = false;

  // Apply default settings immediately so button shows
  applySettings();

  // Fetch widget config and apply custom settings
  fetch(baseUrl + '/api/widget/config?key=' + widgetKey)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.settings) {
        widgetSettings = Object.assign(widgetSettings, data.settings);
      }
      applySettings();
    })
    .catch(function() {
      // Keep default settings on error
    });

  function applySettings() {
    var color = widgetSettings.primaryColor || '#0066FF';
    var pos = widgetSettings.position || 'bottom-right';
    var iconType = widgetSettings.bubbleIcon || 'chat';
    var sizeType = widgetSettings.bubbleSize || 'medium';
    var bubbleStyle = widgetSettings.bubbleStyle || 'solid';
    var bubbleShadow = widgetSettings.bubbleShadow !== false;
    var bubbleAnimation = widgetSettings.bubbleAnimation || 'none';
    var size = SIZES[sizeType] || SIZES.medium;

    // Calculate background based on style
    var bgStyle;
    var textColor = 'white';
    if (bubbleStyle === 'gradient') {
      bgStyle = 'linear-gradient(135deg, ' + color + ' 0%, ' + darkenColor(color, 20) + ' 100%)';
    } else if (bubbleStyle === 'outline') {
      bgStyle = 'transparent';
      textColor = color;
    } else {
      bgStyle = color;
    }

    // Shadow style
    var shadowStyle = bubbleShadow ? '0 4px 16px ' + hexToRgba(color, 0.4) : 'none';

    // Animation CSS
    var animationCss = '';
    if (bubbleAnimation === 'pulse') {
      animationCss = 'animation:vintrachat-pulse 2s ease-in-out infinite!important;';
    } else if (bubbleAnimation === 'bounce') {
      animationCss = 'animation:vintrachat-bounce 2s ease-in-out infinite!important;';
    } else if (bubbleAnimation === 'shake') {
      animationCss = 'animation:vintrachat-shake 0.5s ease-in-out infinite!important;';
    }

    // Inject animation keyframes
    if (bubbleAnimation !== 'none' && !document.getElementById('vintrachat-animations')) {
      var animStyle = document.createElement('style');
      animStyle.id = 'vintrachat-animations';
      animStyle.textContent = '@keyframes vintrachat-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}@keyframes vintrachat-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes vintrachat-shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-5deg)}75%{transform:rotate(5deg)}}';
      document.head.appendChild(animStyle);
    }

    // Update container position
    container.style.cssText = 'position:fixed!important;bottom:0!important;' + (pos === 'bottom-left' ? 'left:0!important;' : 'right:0!important;') + 'z-index:2147483647!important;pointer-events:none!important;width:auto!important;height:auto!important;';

    // Update iframe position
    var iframePos = pos === 'bottom-left' ? 'left:20px' : 'right:20px';
    iframe.style.cssText = 'position:fixed!important;bottom:' + (size.button + 30) + 'px!important;' + iframePos + '!important;width:0!important;height:0!important;border:none!important;border-radius:16px!important;box-shadow:0 8px 32px rgba(0,0,0,0.2)!important;transition:all 0.3s cubic-bezier(0.4,0,0.2,1)!important;z-index:2147483647!important;opacity:0!important;pointer-events:none!important;background:#fff!important;';

    // Update button with all styles
    var btnPos = pos === 'bottom-left' ? 'left:20px' : 'right:20px';
    var borderStyle = bubbleStyle === 'outline' ? '2px solid ' + color : 'none';
    button.innerHTML = getIcon(iconType, size.icon);
    button.style.cssText = 'position:fixed!important;bottom:20px!important;' + btnPos + '!important;width:' + size.button + 'px!important;height:' + size.button + 'px!important;border-radius:50%!important;border:' + borderStyle + '!important;background:' + bgStyle + '!important;color:' + textColor + '!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;box-shadow:' + shadowStyle + '!important;transition:all 0.3s cubic-bezier(0.4,0,0.2,1)!important;z-index:2147483647!important;outline:none!important;' + animationCss;

    // Hover effects
    var hoverShadow = bubbleShadow ? '0 6px 24px ' + hexToRgba(color, 0.5) : 'none';
    var normalShadow = shadowStyle;
    button.onmouseover = function() { 
      if (!isOpen) {
        this.style.transform = 'scale(1.1)';
        if (bubbleShadow) this.style.boxShadow = hoverShadow;
      }
    };
    button.onmouseout = function() { 
      if (!isOpen) {
        this.style.transform = 'scale(1)';
        if (bubbleShadow) this.style.boxShadow = normalShadow;
      }
    };
  }

  function darkenColor(hex, percent) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    r = Math.floor(r * (100 - percent) / 100);
    g = Math.floor(g * (100 - percent) / 100);
    b = Math.floor(b * (100 - percent) / 100);
    return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
  }

  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

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
    var color = widgetSettings.primaryColor || '#0066FF';
    button.style.boxShadow = '0 4px 16px ' + hexToRgba(color, 0.4);
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
