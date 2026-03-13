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

  // Placeholders - built after config loads
  var iframe = null;
  var button = null;
  var isOpen = false;

  // Fetch config first, THEN build the UI with correct values
  fetch(baseUrl + '/api/widget/config?key=' + widgetKey)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.settings) {
        widgetSettings = Object.assign(widgetSettings, data.settings);
      }
      buildUI();
    })
    .catch(function() {
      buildUI(); // Use defaults on error
    });

  function buildUI() {
    // Create iframe with correct src including color so embed page also gets it
    iframe = document.createElement('iframe');
    iframe.id = 'vintrachat-widget-iframe';
    iframe.src = baseUrl + '/widget/embed/' + widgetKey;
    iframe.allow = 'microphone; camera';
    iframe.title = 'VintraChat Widget';
    container.appendChild(iframe);

    // Create toggle button
    button = document.createElement('button');
    button.id = 'vintrachat-toggle-btn';
    button.setAttribute('aria-label', 'Open chat');
    container.appendChild(button);

    // Now apply with real settings
    applySettings();

    // Wire up events
    button.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (isOpen) { closeWidget(); } else { openWidget(); }
    });
  }

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

    // Update iframe position - for glassOrb, position beside the avatar
    var avatarOffset = 20;
    var gap = 16;
    var iframeBottom = iconType === 'glassOrb' ? '20px' : (size.button + 30) + 'px';
    var iframePos = pos === 'bottom-left' 
      ? (iconType === 'glassOrb' ? 'left:' + (avatarOffset + size.button + gap) + 'px' : 'left:20px')
      : (iconType === 'glassOrb' ? 'right:' + (avatarOffset + size.button + gap) + 'px' : 'right:20px');
    
    iframe.style.cssText = 'position:fixed!important;bottom:' + iframeBottom + '!important;' + iframePos + '!important;width:0!important;height:0!important;border:none!important;border-radius:16px!important;box-shadow:0 12px 48px rgba(0,0,0,0.25)!important;transition:width 0.3s cubic-bezier(0.4,0,0.2,1), height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease!important;z-index:2147483646!important;opacity:0!important;pointer-events:none!important;background:#fff!important;';

    // Update button with all styles
    var btnPos = pos === 'bottom-left' ? 'left:20px' : 'right:20px';
    var borderStyle = bubbleStyle === 'outline' ? '2px solid ' + color : 'none';
    
    // Handle GlassOrb separately - render full canvas that fills the button
    if (iconType === 'glassOrb') {
      // Use full button size for the orb canvas
      var orbSize = size.button;
      button.innerHTML = '<div id="vintrachat-glass-orb-container" style="width:' + orbSize + 'px;height:' + orbSize + 'px;position:relative;border-radius:50%;overflow:visible;display:flex;align-items:center;justify-content:center;transition:filter 0.3s ease;"><canvas id="vintrachat-glass-orb-canvas" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;"></canvas></div>';
      // Initialize GlassOrb animation for the button
      setTimeout(function() {
        initGlassOrbButton(orbSize, widgetSettings.glassOrbGlyph || 'V');
      }, 50);
    } else {
      button.innerHTML = getIcon(iconType, size.icon);
    }
    
    // For glassOrb: completely transparent button with NO shadow - the orb itself provides all visuals
    var buttonBg = iconType === 'glassOrb' ? 'transparent' : bgStyle;
    var buttonBorder = iconType === 'glassOrb' ? 'none' : borderStyle;
    // NO box-shadow for glassOrb - removes the white circle/blue glow issue
    var buttonShadow = iconType === 'glassOrb' ? 'none' : shadowStyle;
    
    button.style.cssText = 'position:fixed!important;bottom:20px!important;' + btnPos + '!important;width:' + size.button + 'px!important;height:' + size.button + 'px!important;border-radius:50%!important;border:' + buttonBorder + '!important;background:' + buttonBg + '!important;color:' + textColor + '!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;box-shadow:' + buttonShadow + '!important;transition:transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease!important;z-index:2147483647!important;outline:none!important;overflow:visible!important;' + animationCss;

    // Hover effects - for glassOrb, use filter brightness on canvas instead of box-shadow
    var hoverShadow = bubbleShadow ? '0 6px 24px ' + hexToRgba(color, 0.5) : 'none';
    var normalShadow = shadowStyle;
    
    button.onmouseover = function() { 
      if (iconType === 'glassOrb') {
        // For glassOrb: scale slightly and brighten the canvas - NO box-shadow
        this.style.transform = 'scale(1.08)';
        var glassContainer = document.getElementById('vintrachat-glass-orb-container');
        if (glassContainer) {
          glassContainer.style.filter = 'brightness(1.2) drop-shadow(0 0 20px rgba(0, 255, 255, 0.5))';
        }
      } else {
        this.style.transform = 'scale(1.1)';
        if (bubbleShadow) {
          this.style.boxShadow = hoverShadow;
        }
      }
    };
    button.onmouseout = function() { 
      this.style.transform = 'scale(1)';
      if (iconType === 'glassOrb') {
        // Reset to normal - no box-shadow, just filter
        var glassContainer = document.getElementById('vintrachat-glass-orb-container');
        if (glassContainer) {
          glassContainer.style.filter = 'brightness(1) drop-shadow(0 0 0 transparent)';
        }
      } else {
        this.style.boxShadow = normalShadow;
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
    if (!iframe || !button) return;
    isOpen = true;
    
    var pos = widgetSettings.position || 'bottom-right';
    var sizeType = widgetSettings.bubbleSize || 'medium';
    var size = SIZES[sizeType] || SIZES.medium;
    var avatarOffset = 20;
    var avatarSize = size.button;
    var gap = 16;
    
    if (widgetSettings.bubbleIcon === 'glassOrb') {
      // GlassOrb: Avatar stays in EXACT same position, chat window opens beside it
      // Position iframe to the left of avatar (for bottom-right) or right (for bottom-left)
      if (pos === 'bottom-right') {
        iframe.style.right = (avatarOffset + avatarSize + gap) + 'px';
        iframe.style.left = 'auto';
      } else {
        iframe.style.left = (avatarOffset + avatarSize + gap) + 'px';
        iframe.style.right = 'auto';
      }
      iframe.style.bottom = '20px';
      iframe.style.width = '380px';
      iframe.style.height = '520px';
      iframe.style.opacity = '1';
      iframe.style.pointerEvents = 'auto';
      
      // Avatar STAYS in same position - no transform, no movement
      button.style.transform = 'scale(1)';
      button.style.opacity = '1';
      button.style.pointerEvents = 'auto';
      button.style.bottom = avatarOffset + 'px';
      if (pos === 'bottom-right') {
        button.style.right = avatarOffset + 'px';
        button.style.left = 'auto';
      } else {
        button.style.left = avatarOffset + 'px';
        button.style.right = 'auto';
      }
    } else {
      // Standard behavior for non-glassOrb icons
      iframe.style.width = '380px';
      iframe.style.height = '550px';
      iframe.style.opacity = '1';
      iframe.style.pointerEvents = 'auto';
      button.style.transform = 'scale(0)';
      button.style.opacity = '0';
      button.style.pointerEvents = 'none';
    }
    
    handleResize();
  }

  function closeWidget() {
    if (!iframe || !button) return;
    isOpen = false;
    
    // Close iframe
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    
    var pos = widgetSettings.position || 'bottom-right';
    var avatarOffset = 20;
    
    // Avatar button stays in exact same position
    button.style.transform = 'scale(1)';
    button.style.opacity = '1';
    button.style.pointerEvents = 'auto';
    button.style.bottom = avatarOffset + 'px';
    
    if (pos === 'bottom-right') {
      button.style.right = avatarOffset + 'px';
      button.style.left = 'auto';
    } else {
      button.style.left = avatarOffset + 'px';
      button.style.right = 'auto';
    }
    
    // For glassOrb: NO box-shadow (removes white circle issue)
    // For others: restore normal shadow
    if (widgetSettings.bubbleIcon === 'glassOrb') {
      button.style.boxShadow = 'none';
    } else {
      var color = widgetSettings.primaryColor || '#0066FF';
      button.style.boxShadow = '0 4px 16px ' + hexToRgba(color, 0.4);
    }
  }

  // Listen for close message from iframe
  window.addEventListener('message', function(event) {
    if (event.data === 'vintrachat:close' || event.data === 'chatflow:close') {
      closeWidget();
    }
  });

  // Mobile responsiveness
  function handleResize() {
    if (!iframe || !isOpen) return;
    
    var pos = widgetSettings.position || 'bottom-right';
    var sizeType = widgetSettings.bubbleSize || 'medium';
    var size = SIZES[sizeType] || SIZES.medium;
    var avatarOffset = 20;
    var avatarSize = size.button;
    var gap = 16;
    
    if (window.innerWidth < 500 && isOpen) {
      // Mobile: full screen chat
      iframe.style.width = '100vw';
      iframe.style.height = '100vh';
      iframe.style.bottom = '0';
      iframe.style.right = '0';
      iframe.style.left = '0';
      iframe.style.borderRadius = '0';
      
      // On mobile, hide the avatar button when chat is open
      if (widgetSettings.bubbleIcon === 'glassOrb') {
        button.style.opacity = '0';
        button.style.pointerEvents = 'none';
      }
    } else if (isOpen) {
      // Desktop: position chat window beside avatar for glassOrb
      if (widgetSettings.bubbleIcon === 'glassOrb') {
        if (pos === 'bottom-right') {
          iframe.style.right = (avatarOffset + avatarSize + gap) + 'px';
          iframe.style.left = 'auto';
        } else {
          iframe.style.left = (avatarOffset + avatarSize + gap) + 'px';
          iframe.style.right = 'auto';
        }
        iframe.style.bottom = '20px';
        iframe.style.width = '380px';
        iframe.style.height = '520px';
        iframe.style.borderRadius = '16px';
        
        // Ensure avatar stays visible
        button.style.opacity = '1';
        button.style.pointerEvents = 'auto';
      } else {
        // Standard positioning for non-glassOrb
        iframe.style.width = '380px';
        iframe.style.height = '550px';
        iframe.style.bottom = '90px';
        if (pos === 'bottom-right') {
          iframe.style.right = '20px';
          iframe.style.left = 'auto';
        } else {
          iframe.style.left = '20px';
          iframe.style.right = 'auto';
        }
        iframe.style.borderRadius = '16px';
      }
    }
  }

  window.addEventListener('resize', handleResize);

  // GlassOrb animation for button
  function initGlassOrbButton(size, glyph) {
    var container = document.getElementById('vintrachat-glass-orb-container');
    var canvas = document.getElementById('vintrachat-glass-orb-canvas');
    if (!container || !canvas) return;

    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 1.35);
    var centerX = size / 2;
    var centerY = size / 2;
    var orbRadius = size / 2;
    var ringOuter = orbRadius * 0.95;
    var ringInner = orbRadius * 0.50;
    var centerRadius = ringInner * 0.985;

    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var ringParticles = [];
    var goldDots = [];
    var miniOrbs = [];
    var colorIndex = 0;
    var colorProgress = 0;
    var animationId = null;

    // Color palettes
    var colorPalettes = {
      idle: [
        { r: 0, g: 255, b: 255 },
        { r: 0, g: 240, b: 190 },
        { r: 50, g: 255, b: 255 },
        { r: 0, g: 200, b: 255 },
        { r: 0, g: 255, b: 180 },
        { r: 100, g: 255, b: 255 },
      ]
    };

    // Initialize particles
    function initParticles() {
      var particleCount = Math.max(60, Math.floor(120 * (size / 32)));
      ringParticles = [];
      for (var i = 0; i < particleCount; i++) {
        ringParticles.push({
          radius: ringInner + Math.random() * (ringOuter - ringInner),
          angle: Math.random() * Math.PI * 2,
          speed: (Math.random() * 0.010 + 0.004) * (Math.random() < 0.5 ? 1 : -1),
          size: (Math.random() * 1.5 + 1.0) * (size / 32),
          colorOffset: Math.random() * 9999
        });
      }

      // Initialize mini orbs
      var orbCount = 6;
      miniOrbs = [];
      for (var i = 0; i < orbCount; i++) {
        miniOrbs.push({
          angle: (Math.PI * 2 * i) / orbCount,
          radius: centerRadius * (0.2 + Math.random() * 0.3),
          speed: 0.006 + Math.random() * 0.008,
          size: (size / 32) * (1.5 + Math.random() * 2)
        });
      }
    }

    function getRingColor(offset) {
      var palette = colorPalettes.idle;
      var base = (colorIndex + offset) % palette.length;
      var a = palette[base];
      var b = palette[(base + 1) % palette.length];
      var t = colorProgress;
      return {
        r: Math.floor(a.r + (b.r - a.r) * t),
        g: Math.floor(a.g + (b.g - a.g) * t),
        b: Math.floor(a.b + (b.b - a.b) * t)
      };
    }

    function rgba(rgb, a) {
      return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + a + ')';
    }

    function drawPortalBase() {
      // Dark portal background
      var gradient = ctx.createRadialGradient(centerX, centerY, orbRadius * 0.08, centerX, centerY, orbRadius);
      gradient.addColorStop(0, 'rgba(10, 13, 22, 1)');
      gradient.addColorStop(0.55, 'rgba(14, 20, 40, 1)');
      gradient.addColorStop(1, 'rgba(6, 8, 14, 1)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      ctx.fill();

      // Casing
      ctx.save();
      var casingGradient = ctx.createRadialGradient(centerX, centerY, orbRadius * 0.90, centerX, centerY, orbRadius);
      casingGradient.addColorStop(0, 'rgba(18, 22, 32, 1)');
      casingGradient.addColorStop(1, 'rgba(10, 12, 18, 1)');
      ctx.fillStyle = casingGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, orbRadius * 0.90, 0, Math.PI * 2, true);
      ctx.fill('evenodd');
      ctx.restore();

      // Center
      ctx.save();
      var centerGradient = ctx.createRadialGradient(centerX, centerY, centerRadius * 0.05, centerX, centerY, centerRadius);
      centerGradient.addColorStop(0, 'rgba(14, 20, 40, 1)');
      centerGradient.addColorStop(0.65, 'rgba(10, 13, 22, 1)');
      centerGradient.addColorStop(1, 'rgba(6, 8, 14, 1)');
      ctx.fillStyle = centerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, centerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Rim
      ctx.save();
      ctx.shadowBlur = 4 * (size / 32);
      ctx.shadowColor = 'rgba(110, 130, 155, 0.35)';
      ctx.strokeStyle = 'rgba(175, 185, 200, 0.70)';
      ctx.lineWidth = Math.max(1, size / 140);
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius - ctx.lineWidth * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    function animate() {
      colorProgress += 0.0032;
      if (colorProgress >= 1) {
        colorProgress = 0;
        colorIndex = (colorIndex + 1) % colorPalettes.idle.length;
      }

      ctx.clearRect(0, 0, size, size);
      
      drawPortalBase();

      // Draw ring particles
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringOuter, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, ringInner, 0, Math.PI * 2, true);
      ctx.clip('evenodd');

      for (var i = 0; i < ringParticles.length; i++) {
        var p = ringParticles[i];
        p.angle += p.speed;
        
        var x = centerX + Math.cos(p.angle) * p.radius;
        var y = centerY + Math.sin(p.angle) * p.radius;
        
        var rgb = getRingColor(p.colorOffset);
        ctx.shadowBlur = 6 * (size / 32);
        ctx.shadowColor = rgba(rgb, 0.12);
        ctx.fillStyle = rgba(rgb, 0.26);
        
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Draw mini orbs
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      ctx.clip();

      for (var i = 0; i < miniOrbs.length; i++) {
        var orb = miniOrbs[i];
        orb.angle += orb.speed;
        
        var x = centerX + Math.cos(orb.angle) * orb.radius;
        var y = centerY + Math.sin(orb.angle) * orb.radius;
        
        var rgb = getRingColor(orb.angle * 10);
        ctx.shadowBlur = 3 * (size / 32);
        ctx.shadowColor = rgba(rgb, 0.28);
        ctx.fillStyle = rgba(rgb, 0.88);
        
        ctx.beginPath();
        ctx.arc(x, y, orb.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      animationId = requestAnimationFrame(animate);
    }

    initParticles();
    animate();

    // Cleanup on page unload
    window.addEventListener('beforeunload', function() {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    });
  }

  // Expose API for programmatic control
  window.VintraChat = {
    _initialized: true,
    open: openWidget,
    close: closeWidget,
    toggle: function() { isOpen ? closeWidget() : openWidget(); },
    isOpen: function() { return isOpen; }
  };
})();
