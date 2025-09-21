/** FOXIZ_CORE_SCRIPT — Vanilla JS (no jQuery) */
var FOXIZ_CORE_SCRIPT = (function (Module) {
  "use strict";

  /* ---------- tiny helpers ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function on(el, type, fn, opts) { if (el) el.addEventListener(type, fn, opts || false); }
  function off(el, type, fn) { if (el) el.removeEventListener(type, fn); }
  function bindOnce(list, type, fn, flagName) {
    list.forEach(function (el) {
      if (el.dataset[flagName]) return;
      el.dataset[flagName] = "1";
      on(el, type, fn);
    });
  }
  function toDOM(html) { const d = document.createElement('div'); d.innerHTML = html; return d; }

  // slide helpers (jQuery-like slideToggle)
  function slideUp(el, duration) {
    if (!el) return;
    if (duration === 0) { el.style.display = 'none'; return; }
    el.style.height = el.offsetHeight + 'px';
    el.offsetHeight;
    el.style.transitionProperty = 'height, margin, padding';
    el.style.transitionDuration = duration + 'ms';
    el.style.overflow = 'hidden';
    el.style.height = 0;
    el.style.paddingTop = 0;
    el.style.paddingBottom = 0;
    el.style.marginTop = 0;
    el.style.marginBottom = 0;
    window.setTimeout(function () {
      el.style.display = 'none';
      ['height','padding-top','padding-bottom','margin-top','margin-bottom','overflow','transition-duration','transition-property']
        .forEach(function(p){ el.style.removeProperty(p); });
    }, duration);
  }
  function slideDown(el, duration) {
    if (!el) return;
    el.style.removeProperty('display');
    var display = window.getComputedStyle(el).display;
    if (display === 'none') display = 'block';
    el.style.display = display;
    var height = el.offsetHeight;
    el.style.overflow = 'hidden';
    el.style.height = 0;
    el.style.paddingTop = 0;
    el.style.paddingBottom = 0;
    el.style.marginTop = 0;
    el.style.marginBottom = 0;
    el.offsetHeight;
    if (duration === 0) {
      el.style.height = '';
      el.style.overflow = '';
      return;
    }
    el.style.transitionProperty = 'height, margin, padding';
    el.style.transitionDuration = duration + 'ms';
    el.style.height = height + 'px';
    window.setTimeout(function () {
      ['height','overflow','transition-duration','transition-property','padding-top','padding-bottom','margin-top','margin-bottom']
        .forEach(function(p){ el.style.removeProperty(p); });
    }, duration);
  }
  function slideToggle(el, duration) {
    if (!el) return;
    if (window.getComputedStyle(el).display === 'none') slideDown(el, duration);
    else slideUp(el, duration);
  }

  /* ---------- module ---------- */
  Module.init = function () {
    this.yesStorage = this.isStorageAvailable();
    this._body = document.body;
    this.themeSettings = window.foxizCoreParams || {};
    this.darkModeID = this.themeSettings.darkModeID || 'RubyDarkMode';
    this.mSiteID = this.themeSettings.mSiteID || null;
    this.isCMode = document.body.classList.contains("is-cmode");
    this.personalizeUID = this.getUserUUID();
    this.initDarkModeCookie();
    this.switchDarkMode();
    this.noteToggle();
    this.passwordToggle();
    this.emailToDownload();
  };

  /** generate UUID */
  Module.generateUUID = function () {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 7; i++) id += alphabet[Math.floor(Math.random() * alphabet.length)];
    return id;
  };

  /** cookies */
  Module.setCookie = function (name, value, days = 60) {
    const date = new Date();
    date.setTime(date.getTime() + Math.round(days * 24 * 60 * 60 * 1000));
    const expires = '; expires=' + date.toUTCString();
    const cookieDomain = this.themeSettings.cookieDomain || '';
    const cookiePath = this.themeSettings.cookiePath || '/';
    document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=' + cookiePath + '; domain=' + cookieDomain;
  };
  Module.getCookie = function (name) {
    const nameEQ = name + '=';
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      let c = cookies[i];
      while (c.charAt(0) === ' ') c = c.substring(1);
      if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length));
    }
    return null;
  };
  Module.deleteCookie = function (name) {
    const cookieDomain = this.themeSettings.cookieDomain || '';
    const cookiePath = this.themeSettings.cookiePath || '/';
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=' + cookiePath + '; domain=' + cookieDomain;
  };

  /** localStorage */
  Module.isStorageAvailable = function () {
    try {
      const s = window.localStorage;
      s.setItem('__rbStorageSet', 'x');
      s.removeItem('__rbStorageSet');
      return true;
    } catch (e) { return false; }
  };
  Module.setStorage = function (key, data) {
    if (this.yesStorage) localStorage.setItem(key, typeof data === 'string' ? data : JSON.stringify(data));
  };
  Module.getStorage = function (key, def) {
    if (!this.yesStorage) return null;
    const raw = localStorage.getItem(key);
    if (raw === null) return def;
    try { return JSON.parse(raw); } catch (e) { return raw; }
  };
  Module.deleteStorage = function (key) { if (this.yesStorage) localStorage.removeItem(key); };

  /** UUID */
  Module.getUserUUID = function () {
    let uuid;
    if (this.getCookie('RBUUID')) {
      uuid = this.getCookie('RBUUID');
    } else {
      uuid = this.getStorage('RBUUID', null);
      if (uuid === null) {
        uuid = this.generateUUID();
        this.setStorage('RBUUID', uuid);
        if (this.themeSettings.yesPersonalized) this.setCookie('personalize_sync', 'yes', 1);
      }
      if (this.themeSettings.yesPersonalized) this.setCookie('RBUUID', uuid);
    }
    if (this.mSiteID) uuid = this.mSiteID + uuid;
    return uuid;
  };

  /** dark mode cookie */
  Module.initDarkModeCookie = function () {
    if (this.isCMode && !this.getCookie(this.darkModeID)) {
      this.setCookie(this.darkModeID, document.body.getAttribute('data-theme'));
    }
  };
  Module.setDarkModeCookie = function (name, value) {
    if (this.isCMode) this.setCookie(name, value);
  };

  /** dark mode toggle */
  Module.switchDarkMode = function () {
    const self = this;
    const toggles = $all('.dark-mode-toggle');
    const iconDefault = $all('.mode-icon-default');
    const iconDark = $all('.mode-icon-dark');

    bindOnce(toggles, 'click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      const target = e.currentTarget;
      target.classList.add('triggered');

      const useStorage = !self.isCMode && self.yesStorage;
      const currentMode = useStorage ? self.getStorage(self.darkModeID) : document.body.getAttribute('data-theme');

      const isDark = currentMode === 'dark';
      const nextMode = isDark ? 'default' : 'dark';

      if (useStorage) self.setStorage(self.darkModeID, nextMode);
      self.setDarkModeCookie(self.darkModeID, nextMode);

      document.body.setAttribute('data-theme', nextMode);
      document.body.classList.add('switch-smooth');

      iconDefault.forEach(function (el) { el.classList.toggle('activated', nextMode === 'default'); });
      iconDark.forEach(function (el) { el.classList.toggle('activated', nextMode === 'dark'); });
    }, 'boundDarkToggle');
  };

  /** share action */
  Module.shareTrigger = function () {
    // popup share
    bindOnce($all('a.share-trigger'), 'click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      window.open(this.getAttribute('href'), '_blank', 'width=600, height=350');
      return false;
    }, 'boundShare');

    // copy to clipboard
    var copyButtons = $all('a.copy-trigger');
    if (navigator.clipboard) {
      bindOnce(copyButtons, 'click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var link = this.dataset.link;
        var copied = this.dataset.copied;
        if (!link) return;
        navigator.clipboard.writeText(link).then(function () {
          var tip = document.body.querySelector('.tipsy-inner');
          if (tip) tip.innerHTML = copied || 'Copied!';
        }).catch(function(){});
      }, 'boundCopy');
    } else {
      copyButtons.forEach(function (b) { b.style.display = 'none'; });
    }

    // native share
    var shareButtons = $all('a.native-share-trigger');
    if (navigator.share) {
      bindOnce(shareButtons, 'click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        navigator.share({ title: this.dataset.ptitle, url: this.dataset.link });
      }, 'boundNativeShare');
    } else {
      shareButtons.forEach(function (b) { b.style.display = 'none'; });
    }
  };

  /** single infinite load helpers */
  Module.loadGoogleAds = function (response) {
    var container = typeof response === 'string' ? toDOM(response) : response;
    var googleAds = (container || document).querySelectorAll('.adsbygoogle');
    if (typeof window.adsbygoogle !== 'undefined' && googleAds.length) {
      googleAds.forEach(function () { (window.adsbygoogle = window.adsbygoogle || []).push({}); });
    }
  };

  Module.loadInstagram = function (response) {
    var container = typeof response === 'string' ? toDOM(response) : response;
    var instEmbed = (container || document).querySelectorAll('.instagram-media');
    if (typeof window.instgrm !== 'undefined') {
      window.instgrm.Embeds.process();
    } else if (instEmbed.length && typeof window.instgrm === 'undefined') {
      const embedJS = document.createElement('script');
      embedJS.src = '//platform.instagram.com/en_US/embeds.js';
      embedJS.onload = function () { window.instgrm.Embeds.process(); };
      document.body.appendChild(embedJS);
    }
  };

  Module.loadTwttr = function () {
    if (typeof window.twttr !== 'undefined' && typeof window.twttr.widgets !== 'undefined') {
      window.twttr.ready(function (twttr) { twttr.widgets.load(); });
    }
  };

  Module.updateGA = function (article) {
    const gaURL = article.postURL.replace(/https?:\/\/[^\/]+/i, '');
    if (typeof window._gaq !== 'undefined' && window._gaq !== null) _gaq.push(['_trackPageview', gaURL]);
    if (typeof window.ga !== 'undefined' && window.ga !== null) window.ga('send', 'pageview', gaURL);
    if (typeof window.__gaTracker !== 'undefined' && window.__gaTracker !== null) window.__gaTracker('send', 'pageview', gaURL);
    if (window.googletag && window.googletag.pubadsReady) window.googletag.pubads().refresh();
  };

  Module.noteToggle = function () {
    bindOnce($all('.yes-toggle > .note-header'), 'click', function () {
      var wrapper = this.parentElement;
      var timing = wrapper.classList.contains('is-inline') ? 0 : 300;
      wrapper.classList.toggle('explain');
      var content = wrapper.querySelector('.note-content');
      slideToggle(content, timing);
    }, 'boundNoteToggle');
  };

  Module.passwordToggle = function () {
    bindOnce($all('.rb-password-toggle'), 'click', function () {
      var input = this.previousElementSibling && this.previousElementSibling.matches('input')
        ? this.previousElementSibling
        : this.parentElement.querySelector('input');
      var icon = this.querySelector('i');
      if (!input) return;
      if (input.getAttribute('type') === 'password') {
        input.setAttribute('type', 'text');
        if (icon) { icon.classList.remove('rbi-show'); icon.classList.add('rbi-hide'); }
      } else {
        input.setAttribute('type', 'password');
        if (icon) { icon.classList.remove('rbi-hide'); icon.classList.add('rbi-show'); }
      }
    }, 'boundPwdToggle');
  };

  Module.isValidEmail = function (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  Module.emailToDownload = function () {
    const self = this;

    $all('.download-form').forEach(function (form) {
      var acceptTerms = form.querySelector('input[name="acceptTerms"]');
      var submitBtn = form.querySelector('input[type="submit"]');
      var noticeText = form.querySelector('.notice-text');

      if (acceptTerms && submitBtn) {
        on(acceptTerms, 'change', function () {
          submitBtn.disabled = !this.checked;
        });
      }

      // prevent duplicate binding if init() re-runs
      if (form.dataset.boundSubmit) return;
      form.dataset.boundSubmit = '1';

      on(form, 'submit', function (event) {
        event.preventDefault();

        var emailInput = form.querySelector('input[name="EMAIL"]');
        var email = emailInput ? emailInput.value : '';
        var labelEl = form.querySelector('input[type="submit"]');
        var label = labelEl ? labelEl.value : 'Download';
        if (noticeText) noticeText.textContent = '';

        if (!self.isValidEmail(email)) {
          if (noticeText) noticeText.textContent = 'Please enter a valid email address.';
          return;
        }

        var wrapper = form.closest('.gb-download');
        if (wrapper) wrapper.classList.add('submitting');

        var url = self.themeSettings.ajaxurl || null;
        if (!url) {
          if (noticeText) noticeText.textContent = 'Submission endpoint missing.';
          if (wrapper) wrapper.classList.remove('submitting');
          return;
        }

        var fd = new FormData(form);

        fetch(url, { method: 'POST', body: fd, credentials: 'same-origin' })
          .then(function (r) { return r.json(); })
          .then(function (response) {
            var fileURL = response.file;
            if (fileURL) {
              var link = document.createElement('a');
              link.href = fileURL;
              link.setAttribute('download', '');
              document.body.appendChild(link);
              link.click();
              link.remove();
              var newContent = '<div class="fallback-info">' + (response.message || '') + '</div>' +
                '<a href="' + fileURL + '" download="" rel="nofollow" class="is-btn gb-download-btn fallback-download-btn">' + label + '</a>';
              // Replace the form with new content
              form.outerHTML = newContent;
            } else {
              if (noticeText) noticeText.textContent = response.message || 'Something went wrong.';
              if (wrapper) wrapper.classList.remove('submitting');
            }
            if (wrapper) wrapper.classList.remove('submitting');
          })
          .catch(function () {
            if (noticeText) noticeText.textContent = 'Network error. Please try again.';
            if (wrapper) wrapper.classList.remove('submitting');
          });
      });
    });
  };
  
 Module.lazyLoadScripts = function () {
    var selectors = '[data-lazy-script-src]';
    var placeholders = $all(selectors);
    if (!placeholders.length) return;

    var loadedAttr = 'lazyScriptLoaded';
    var boundAttr = 'lazyScriptBound';
    var observer = null;

    function insertBeforeScript(scriptEl, html) {
      if (!scriptEl || !html) return;
      var parent = scriptEl.parentNode;
      if (!parent) return;

      var container = document.createElement('div');
      container.innerHTML = html;

      while (container.firstChild) {
        var node = container.firstChild;
        container.removeChild(node);

        if (node.nodeType === 1 && node.tagName && node.tagName.toLowerCase() === 'script') {
          var replacement = document.createElement('script');
          for (var i = 0; i < node.attributes.length; i++) {
            var attr = node.attributes[i];
            replacement.setAttribute(attr.name, attr.value);
          }

          if (node.textContent) replacement.text = node.textContent;
          if (replacement.src && !replacement.hasAttribute('async')) replacement.async = false;

          parent.insertBefore(replacement, scriptEl);
        } else {
          parent.insertBefore(node, scriptEl);
        }
      }
    }

    function createDocumentWriteProxy(scriptEl) {
      var doc = document;
      if (!doc || typeof doc.write !== 'function') return null;

      var originalWrite = doc.write;
      var originalWriteln = doc.writeln;
      var queue = [];

      function flushQueue() {
        if (!queue.length || !scriptEl || !scriptEl.parentNode) return;
        for (var i = 0; i < queue.length; i++) insertBeforeScript(scriptEl, queue[i]);
        queue.length = 0;
      }

      function handleWrite(content) {
        if (!content) return;
        if (scriptEl && scriptEl.parentNode) {
          flushQueue();
          insertBeforeScript(scriptEl, content);
        } else {
          queue.push(content);
        }
      }

      doc.write = function (content) {
        handleWrite(String(content));
      };

      doc.writeln = function (content) {
        handleWrite(String(content) + '\n');
      };

      return {
        flush: flushQueue,
        release: function () {
          flushQueue();
          doc.write = originalWrite;
          doc.writeln = originalWriteln;
        }
      };
    }

    function loadScript(el) {
      if (!el || el.dataset[loadedAttr] === '1') return;

      var src = el.getAttribute('data-lazy-script-src');
      if (!src) return;

      el.dataset[loadedAttr] = '1';

      var script = document.createElement('script');
      script.src = src;

      var asyncAttr = el.getAttribute('data-lazy-script-async');
      if (asyncAttr) {
        var asyncValue = asyncAttr.toLowerCase();
        script.async = !(asyncValue === 'false' || asyncValue === '0' || asyncValue === 'no');
      } else {
        script.async = true;
      }

      var deferAttr = el.getAttribute('data-lazy-script-defer');
      if (deferAttr) {
        var deferValue = deferAttr.toLowerCase();
        if (deferValue !== 'false' && deferValue !== '0' && deferValue !== 'no') script.defer = true;
      }

      var scriptId = el.getAttribute('data-lazy-script-id');
      if (scriptId && !document.getElementById(scriptId)) script.id = scriptId;

      var targetSelector = el.getAttribute('data-lazy-script-target');
      var anchor = null;
      if (targetSelector) {
        try { anchor = document.querySelector(targetSelector); }
        catch (err) { anchor = null; }
      }
      if (!anchor) anchor = el;

      var insertMode = (el.getAttribute('data-lazy-script-insert') || '').toLowerCase();
      var inserted = false;

      var docWriteProxy = createDocumentWriteProxy(script);
      var releaseDocWrite = function () {
        if (!docWriteProxy) return;
        if (typeof docWriteProxy.flush === 'function') docWriteProxy.flush();
        if (typeof docWriteProxy.release === 'function') docWriteProxy.release();
        docWriteProxy = null;
      };

      script.addEventListener('load', releaseDocWrite);
      script.addEventListener('error', releaseDocWrite);
      script.addEventListener('abort', releaseDocWrite);

      if (insertMode === 'append' && anchor && anchor.appendChild) {
        anchor.appendChild(script);
        inserted = true;
      } else if (insertMode === 'prepend' && anchor && anchor.insertBefore) {
        anchor.insertBefore(script, anchor.firstChild);
        inserted = true;
      } else if (insertMode === 'before' && anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(script, anchor);
        inserted = true;
      } else if (insertMode === 'after' && anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(script, anchor.nextSibling);
        inserted = true;
      } else if (insertMode === 'body' && document.body) {
        document.body.appendChild(script);
        inserted = true;
      } else if (insertMode === 'head' && document.head) {
        document.head.appendChild(script);
        inserted = true;
      }

      if (!inserted) {
        var parent = document.body || document.head || document.documentElement;
        parent.appendChild(script);
        inserted = true;
      }

      if (docWriteProxy && typeof docWriteProxy.flush === 'function' && inserted) {
        window.setTimeout(docWriteProxy.flush, 0);
      }

      window.setTimeout(releaseDocWrite, 15000);
    }

    function scheduleFallback(el) {
      var fallbackAttr = el.getAttribute('data-lazy-script-timeout');
      var fallbackDelay = parseInt(fallbackAttr, 10);
      if (isNaN(fallbackDelay) || fallbackDelay < 0) fallbackDelay = 10000;

      window.setTimeout(function () { loadScript(el); }, fallbackDelay);
    }

    function queue(el) {
      if (!el || el.dataset[boundAttr] === '1') return;
      el.dataset[boundAttr] = '1';

      if (observer) {
        observer.observe(el);
      } else {
        var onReady = function () {
          off(window, 'load', onReady);
          var delayAttr = el.getAttribute('data-lazy-script-delay');
          var delay = parseInt(delayAttr, 10);
          var runner = function () { loadScript(el); };

          if (!isNaN(delay) && delay > 0) {
            window.setTimeout(runner, delay);
          } else if ('requestIdleCallback' in window) {
            requestIdleCallback(function () { loadScript(el); }, { timeout: 2000 });
          } else {
            window.setTimeout(runner, 400);
          }
        };

        if (document.readyState === 'complete') onReady();
        else on(window, 'load', onReady);
      }

      scheduleFallback(el);
    }

    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;

          var target = entry.target;
          observer.unobserve(target);

          var delayAttr = target.getAttribute('data-lazy-script-delay');
          var delay = parseInt(delayAttr, 10);
          var execute = function () { loadScript(target); };

          if (!isNaN(delay) && delay > 0) {
            window.setTimeout(execute, delay);
          } else if ('requestIdleCallback' in window) {
            requestIdleCallback(function () { loadScript(target); }, { timeout: 2000 });
          } else {
            window.setTimeout(execute, 100);
          }
        });
      }, { rootMargin: '200px 0px', threshold: 0 });
    }

    placeholders.forEach(queue);

    if ('MutationObserver' in window) {
      var mo = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          for (var i = 0; i < mutation.addedNodes.length; i++) {
            var node = mutation.addedNodes[i];
            if (!node || node.nodeType !== 1) continue;

            if (node.hasAttribute && node.hasAttribute('data-lazy-script-src')) queue(node);

            var nested = node.querySelectorAll ? node.querySelectorAll(selectors) : [];
            for (var j = 0; j < nested.length; j++) queue(nested[j]);
          }
        });
      });

      mo.observe(document.body || document.documentElement, { childList: true, subtree: true });
    }
  };
  
  

  return Module;
}(window.FOXIZ_CORE_SCRIPT || {}));

/* init & load hooks (no jQuery) */
document.addEventListener('DOMContentLoaded', function () {
  FOXIZ_CORE_SCRIPT.init();
});
window.addEventListener('load', function () {
  FOXIZ_CORE_SCRIPT.shareTrigger();
});
