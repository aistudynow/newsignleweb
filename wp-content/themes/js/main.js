/** FOXIZ_MAIN_SCRIPT — Vanilla (no jQuery) */
var FOXIZ_MAIN_SCRIPT = (function (Module) {
  'use strict';

  /* =========================================
   * CORE POLYFILLS & SAFE DELEGATION HELPERS
   * ========================================= */
  (function () {
    if (!Element.prototype.matches) {
      Element.prototype.matches =
        Element.prototype.msMatchesSelector ||
        Element.prototype.webkitMatchesSelector ||
        function (s) {
          const m = (this.document || this.ownerDocument).querySelectorAll(s);
          let i = m.length;
          while (--i >= 0 && m.item(i) !== this) {}
          return i > -1;
        };
    }
    if (!Element.prototype.closest) {
      Element.prototype.closest = function (s) {
        let el = this;
        while (el && el.nodeType === 1) {
          if (el.matches(s)) return el;
          el = el.parentElement || el.parentNode;
        }
        return null;
      };
    }
      if (window.Node && !Node.prototype.closest) {
      Node.prototype.closest = function (selector) {
        if (this.nodeType === 1 && Element.prototype.closest) {
          return Element.prototype.closest.call(this, selector);
        }
        return this.parentElement ? this.parentElement.closest(selector) : null;
      };
    }
    if (window.Node && !Node.prototype.matches) {
      Node.prototype.matches = function (selector) {
        return this.nodeType === 1 && Element.prototype.matches
          ? Element.prototype.matches.call(this, selector)
          : false;
      };
    }
  })();

  const doc = document;
  const win = window;
  const htmlEl = doc.documentElement;
  const bodyEl = doc.body;

  const $  = (sel, ctx) => (ctx || doc).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || doc).querySelectorAll(sel));
  const on  = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts || false);
  const off = (el, ev, fn, opts) => el && el.removeEventListener(ev, fn, opts || false);

  const safeClosest = (node, selector, stopAt = doc) => {
    let n = node || null;
    if (!n) return null;
    if (n.nodeType && n.nodeType !== 1) n = n.parentElement || n.parentNode;
    while (n && n !== stopAt) {
      if (n.nodeType === 1 && n.matches && n.matches(selector)) return n;
      n = n.parentElement || n.parentNode;
    }
    return null;
  };

  const delegate = (root, sel, ev, fn) =>
    on(root, ev, (e) => {
      const match = safeClosest(e.target, sel, root);
      if (match && root.contains(match)) fn(e, match);
    });

  const toggle = (el, cls, force) => el && el.classList.toggle(cls, force);
  const show   = (el) => { if (el) el.style.display = ''; };
  const hide   = (el) => { if (el) el.style.display = 'none'; };

  let UID = 0;
  const nextID = (prefix) => `${prefix}-${++UID}`;

  const prefersReducedMotion = () =>
    win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const smoothScrollTo = (y, opts) => {
    const behavior = opts?.behavior || 'smooth';
    const offset = opts?.offset || 0;
    if (!('scrollBehavior' in doc.documentElement.style) || prefersReducedMotion()) {
      win.scrollTo(0, y + offset);
      return;
    }
    win.scrollTo({ top: y + offset, behavior });
  };

  const debounce = (fn, delay = 160) => {
    let id;
    return (...args) => {
      clearTimeout(id);
      id = setTimeout(() => fn.apply(null, args), delay);
    };
  };

  const raf = (cb) => (win.requestAnimationFrame ? win.requestAnimationFrame(cb) : setTimeout(cb, 16));

  const restoreStyles = (el, props) => {
    props.forEach((prop) => el.style.removeProperty(prop));
  };

  const ensureInlineDisplay = (el) => {
    if (!el) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none') {
      const nodeName = el.nodeName.toLowerCase();
      const fallback = nodeName === 'li' ? 'list-item' : 'block';
      el.style.display = fallback;
    }
  };

  /* =================
   * SLIDE HELPERS
   * ================= */
  function slideUp(el, duration = 200) {
    if (!el) return;
    if (prefersReducedMotion()) {
      el.style.display = 'none';
      return;
    }
    el.style.height = el.offsetHeight + 'px';
    el.offsetHeight;
    el.style.transition = `height ${duration}ms ease, margin ${duration}ms ease, padding ${duration}ms ease, opacity ${duration}ms ease`;
    el.style.overflow = 'hidden';
    el.style.opacity = '0';
    el.style.height = 0;
    el.style.paddingTop = 0; el.style.paddingBottom = 0;
    el.style.marginTop = 0;  el.style.marginBottom = 0;
    window.setTimeout(() => {
      el.style.display = 'none';
      restoreStyles(el, ['height','paddingTop','paddingBottom','marginTop','marginBottom','overflow','transition','opacity']);
    }, duration);
  }

  function slideDown(el, duration = 200) {
    if (!el) return;
    if (prefersReducedMotion()) {
      el.style.display = '';
      return;
    }
    el.style.removeProperty('display');
    const cs = getComputedStyle(el);
    el.style.display = cs.display === 'none' ? 'block' : cs.display;
    const height = el.offsetHeight;
    el.style.overflow = 'hidden';
    el.style.height = 0;
    el.style.opacity = '0';
    el.style.paddingTop = 0; el.style.paddingBottom = 0;
    el.style.marginTop = 0;  el.style.marginBottom = 0;
    el.offsetHeight;
    el.style.transition = `height ${duration}ms ease, margin ${duration}ms ease, padding ${duration}ms ease, opacity ${duration}ms ease`;
    el.style.height = height + 'px';
    el.style.opacity = '1';
    window.setTimeout(() => {
      restoreStyles(el, ['height','overflow','transition','paddingTop','paddingBottom','marginTop','marginBottom','opacity']);
    }, duration);
  }

  function slideToggle(el, duration = 200) {
    if (!el) return;
    if (getComputedStyle(el).display === 'none') slideDown(el, duration);
    else slideUp(el, duration);
  }

  const liftChild = (child, stopAt) => {
    if (!child) return;
    let current = child.parentElement;
    while (current && current !== stopAt) {
      if (current.childElementCount !== 1) break;
      const parent = current.parentElement;
      if (!parent) break;
      parent.insertBefore(child, current);
      current.remove();
      current = child.parentElement;
    }
  };

  const transferPresentation = (fromEl, toEl) => {
    if (!fromEl || !toEl) return;
    fromEl.classList.forEach((cls) => {
      if (!toEl.classList.contains(cls)) toEl.classList.add(cls);
    });
    Array.from(fromEl.attributes).forEach((attr) => {
      if (attr.name === 'class') return;
      if (attr.name === 'style') {
        const existing = toEl.getAttribute('style') || '';
        toEl.setAttribute('style', `${attr.value};${existing}`.trim());
      } else if (attr.name === 'id') {
        if (!toEl.id) toEl.id = attr.value;
      } else if (!toEl.hasAttribute(attr.name)) {
        toEl.setAttribute(attr.name, attr.value);
      }
    });
  };

  const isEmptyParagraph = (el) => {
    if (!el || el.tagName !== 'P') return false;
    if (el.querySelector('img, video, iframe, svg, object, embed')) return false;
    const html = el.innerHTML
      .replace(/<br\s*\/?>(\s|&nbsp;|\u00A0)*/gi, '')
      .replace(/&nbsp;/gi, '')
      .trim();
    return html === '';
  };

  const hasBlockDescendant = (el) => {
    return !!(
      el &&
      el.querySelector(
        'div, figure, table, ul, ol, blockquote, pre, section, article, aside'
      )
    );
  };

  const normalizeCaptionText = (el) => {
    return el
      ? el.textContent
          .replace(/\s+/g, ' ')
          .trim()
      : '';
  };

  const isCaptionParagraph = (el) => {
    if (!el || el.tagName !== 'P') return false;
    if (el.closest('figcaption')) return false;
    if (hasBlockDescendant(el)) return false;
    const text = normalizeCaptionText(el);
    if (!text) return false;
    if (/^(share|more\s+read|related)/i.test(text)) return false;
    return true;
  };

  const isCaptionTitle = (el) => {
    if (!isCaptionParagraph(el)) return false;
    const html = el.innerHTML.trim();
    if (!(html.startsWith('<strong') || html.startsWith('<b'))) return false;
    const words = normalizeCaptionText(el).split(/\s+/).filter(Boolean);
    if (words.length < 2) return false;
    return true;
  };

  const isCaptionDescription = (el) => {
    if (!isCaptionParagraph(el)) return false;
    const text = normalizeCaptionText(el);
    if (text.length < 25 && !/[.?!:]/.test(text)) return false;
    if (/^download/i.test(text)) return false;
    return true;
  };

  const takeSiblingParagraphs = (start, direction, predicate, maxCount) => {
    const nodes = [];
    if (!start) return nodes;
    let current =
      direction === 'previous'
        ? start.previousElementSibling
        : start.nextElementSibling;
    while (
      current &&
      current.tagName === 'P' &&
      predicate(current) &&
      nodes.length < maxCount
    ) {
      nodes.push(current);
      current =
        direction === 'previous'
          ? current.previousElementSibling
          : current.nextElementSibling;
    }
    return direction === 'previous' ? nodes.reverse() : nodes;
  };

  let captionStyleInjected = false;
  const ensureCaptionStyles = () => {
    if (captionStyleInjected) return;
    captionStyleInjected = true;
    const style = doc.createElement('style');
    style.id = 'wd-entry-caption-style';
    style.textContent = `
.entry-content figure.has-inline-caption {
  margin: 0 0 2.25rem;
}
.entry-content figure.has-inline-caption figcaption.inline-figure-caption {
  margin-top: 0.75rem;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--body-fcolor, #282828);
  opacity: 0.85;
}
.entry-content figure.has-inline-caption figcaption.inline-figure-caption strong:first-child {
  display: block;
  margin-bottom: 0.35rem;
}
.entry-content figure.workflow-columns-figure {
  display: grid;
  gap: 1rem;
  margin: 0 0 2.5rem;
}
.entry-content figure.workflow-columns-figure.columns-count-2 {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.entry-content figure.workflow-columns-figure.columns-count-3,
.entry-content figure.workflow-columns-figure.columns-count-4 {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}
.entry-content figure.workflow-columns-figure > img,
.entry-content figure.workflow-columns-figure > video,
.entry-content figure.workflow-columns-figure > iframe {
  width: 100%;
  height: auto;
}
.entry-content figure.workflow-columns-figure figcaption.inline-figure-caption {
  grid-column: 1 / -1;
  margin: 0;
}`;
    doc.head.appendChild(style);
  };

  const ensureMobileToggleStyles = () => {
    if (doc.getElementById('foxiz-mobile-toggle-styles')) return;
    const style = doc.createElement('style');
    style.id = 'foxiz-mobile-toggle-styles';
    style.textContent = `
#header-mobile li.menu-item-has-children {
  position: relative;
}
#header-mobile .submenu-toggle {
  position: absolute;
  top: 8px;
  right: 0;
  width: 34px;
  height: 34px;
  border: 0;
  padding: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 160ms ease;
}
#header-mobile .submenu-toggle:hover,
#header-mobile .submenu-toggle:focus-visible {
  background: var(--flex-gray-15, rgba(0,0,0,0.08));
}
#header-mobile .submenu-toggle:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
#header-mobile .submenu-toggle .rbi {
  pointer-events: none;
  transition: transform 160ms ease;
}
#header-mobile .submenu-toggle[aria-expanded="true"] .rbi {
  transform: rotate(45deg);
}`;
    doc.head.appendChild(style);
  };

  let youTubeAPIRequested = false;
  let youTubeAPIReady = false;
  const youTubeCallbacks = [];

  const ensureYouTubeAPI = (cb) => {
    if (youTubeAPIReady && win.YT && typeof win.YT.Player === 'function') {
      cb();
      return;
    }
    youTubeCallbacks.push(cb);
    if (youTubeAPIRequested) return;
    youTubeAPIRequested = true;
    const script = doc.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    doc.head.appendChild(script);
    const prev = win.onYouTubeIframeAPIReady;
    win.onYouTubeIframeAPIReady = function () {
      youTubeAPIReady = true;
      youTubeCallbacks.splice(0).forEach((fn) => {
        try { fn(); } catch (err) { console.error(err); }
      });
      if (typeof prev === 'function') prev();
    };
  };

  /* ===========================
   * STORAGE HELPERS
   * =========================== */
  Module.isStorageAvailable = function () {
    try { localStorage.setItem('__rb__t', '1'); localStorage.removeItem('__rb__t'); return true; }
    catch (e) { return false; }
  };
  Module.setStorage = function (key, data) {
    if (!this.yesStorage) return;
    localStorage.setItem(key, typeof data === 'string' ? data : JSON.stringify(data));
  };
  Module.getStorage = function (key, defVal) {
    if (!this.yesStorage) return null;
    const raw = localStorage.getItem(key);
    if (raw === null) return defVal;
    try { return JSON.parse(raw); } catch { return raw; }
  };
  Module.deleteStorage = function (key) { if (this.yesStorage) localStorage.removeItem(key); };

  /* ===========================
   * INIT PARAMS
   * =========================== */
  Module.initParams = function () {
    this.yesStorage = this.isStorageAvailable();
    this.themeSettings = typeof win.foxizParams !== 'undefined' ? win.foxizParams : {};
    this.ajaxURL = (win.foxizCoreParams && win.foxizCoreParams.ajaxurl) || '/wp-admin/admin-ajax.php';
    this.ajaxData = {};
    this.readIndicator = $('#reading-progress');
    this.outerHTML = doc.documentElement;
    this.YTPlayers = {};
    this.lazyComments = null;
    this.lazyAds = [];
  };

  /* ===========================
   * DOM FOOTPRINT OPTIMIZATIONS
   * =========================== */
  Module.removeEmptyParagraphs = function (container) {
    if (!container) return;
    container.querySelectorAll('p').forEach((p) => {
      if (isEmptyParagraph(p)) p.remove();
    });
  };

  Module.flattenEmbedWrappers = function (container) {
    if (!container) return;
    container.querySelectorAll('.wp-block-embed__wrapper').forEach((wrapper) => {
      if (wrapper.childElementCount === 1) {
        const child = wrapper.firstElementChild;
        if (child && child.matches('iframe, video')) {
          wrapper.parentElement.insertBefore(child, wrapper);
          wrapper.remove();
        }
      }

  });
  };

  Module.optimizeGalleries = function (container) {
    if (!container) return;
    container.querySelectorAll('figure.wp-block-gallery').forEach((gallery) => {
      gallery.classList.add('optimized-gallery');
      gallery.querySelectorAll(':scope > figure').forEach((nested) => {





        if (nested.querySelector('figcaption')) return;
        const media = nested.querySelector('img, video, iframe');
        if (!media) return;
        liftChild(media, nested);
        transferPresentation(nested, media);
        gallery.insertBefore(media, nested);
        nested.remove();
      });
      gallery.querySelectorAll(':scope > div').forEach((div) => {
        if (div.childElementCount === 1) {
          const media = div.firstElementChild;
          if (media && media.matches('img, video, iframe')) {
            liftChild(media, div);
            gallery.insertBefore(media, div);
            div.remove();
          }
        }
      });
    });
  };

  Module.flattenMediaFigures = function (container) {
    if (!container) return;
    container.querySelectorAll('figure').forEach((figure) => {
      if (figure.classList.contains('wp-block-gallery')) return;
      if (figure.dataset && figure.dataset.wdInlineCaption === '1') return;
      if (figure.querySelector('figcaption')) return;
      const media = figure.querySelector('img, video, iframe');
      if (!media) return;
      liftChild(media, figure);
      if (media.parentElement !== figure) return;
      transferPresentation(figure, media);
      figure.replaceWith(media);
    });
  };

  Module.mergeEntryCaptions = function (container) {
    if (!container) return;

    const appendCaption = (figure, nodes, instant) => {
      if (!nodes.length) return false;
      const parts = nodes
        .map((node) => {
          const html = node.innerHTML.trim();
          node.remove();
          return html;
        })
        .filter(Boolean);
      if (!parts.length) return false;
      ensureCaptionStyles();
      let figcaption = figure.querySelector(':scope > figcaption');
      if (!figcaption) {
        figcaption = doc.createElement('figcaption');
        figure.appendChild(figcaption);
      }
      figcaption.classList.add('inline-figure-caption');
      const existing = figcaption.innerHTML.trim();
      const addition = parts.join('<br>');
      figcaption.innerHTML = existing ? `${existing}<br>${addition}` : addition;
      figure.classList.add('has-inline-caption');
      figure.dataset.wdInlineCaption = '1';
      if (instant) figcaption.style.display = '';
      return true;
    };

    const convertColumns = (columns) => {
      const mediaNodes = [];
      columns.querySelectorAll('figure').forEach((nested) => {
        const media = nested.querySelector('img, video, iframe');
        if (!media) return;
        liftChild(media, nested);
        if (media.parentElement === nested) {
          transferPresentation(nested, media);
          nested.replaceWith(media);
        }
      });
      columns.querySelectorAll('img, video, iframe').forEach((media) => {
        mediaNodes.push(media);
      });
      if (!mediaNodes.length) return;

      ensureCaptionStyles();
      const titleNodes = takeSiblingParagraphs(
        columns,
        'previous',
        (p) => isCaptionTitle(p),
        2
      );
      const captionParts = titleNodes.map((node) => {
        const html = node.innerHTML.trim();
        node.remove();
        return html;
      }).filter(Boolean);

      const figure = doc.createElement('figure');
      figure.classList.add('workflow-columns-figure');
      figure.dataset.wdInlineCaption = '1';
      const count = mediaNodes.length;
      figure.classList.add(`columns-count-${Math.min(count, 4)}`);
      columns.parentElement.insertBefore(figure, columns);
      mediaNodes.forEach((media) => {
        figure.appendChild(media);
      });
      columns.remove();

      if (captionParts.length) {
        const figcaption = doc.createElement('figcaption');
        figcaption.classList.add('inline-figure-caption');
        figcaption.innerHTML = captionParts.join('<br>');
        figure.appendChild(figcaption);
        figure.classList.add('has-inline-caption');
      }
    };

    Array.from(container.querySelectorAll(':scope > .wp-block-columns')).forEach(convertColumns);

    Array.from(container.querySelectorAll(':scope > figure')).forEach((figure) => {
      if (figure.dataset && figure.dataset.wdInlineCaption === '1') return;
      const previous = takeSiblingParagraphs(
        figure,
        'previous',
        (p) => isCaptionTitle(p) || isCaptionDescription(p),
        2
      );
      const next = takeSiblingParagraphs(
        figure,
        'next',
        (p) => isCaptionDescription(p),
        2
      );
      appendCaption(figure, previous.concat(next), true);
    });
  };

  Module.deferShareBlocks = function () {
    const module = this;
    const configs = [
      {
        selector: '.e-shared-sec .rbbsl',
        buttonClass: 'share-toggle-btn bottom-share-toggle',
        label: 'Show share options',
        hideLabel: 'Hide share options',
      },
    ];

    configs.forEach((cfg) => {
      const list = doc.querySelector(cfg.selector);
      if (!list) return;
      const holder = list.parentElement;
      if (!holder) return;
      if (holder.querySelector(`.${cfg.buttonClass}`)) return;

      const template = doc.createElement('template');
      template.innerHTML = list.outerHTML;
      const targetId = list.id || nextID('share-list');
      list.remove();

      const button = doc.createElement('button');
      button.type = 'button';
      button.className = cfg.buttonClass;
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', targetId);
      const showLabel = cfg.label;
      const hideLabel = cfg.hideLabel || cfg.label;
      button.textContent = showLabel;

      let activeList = null;
      const mountList = () => {
        if (activeList) return activeList;
        const fragment = template.content.cloneNode(true);
        const block = fragment.firstElementChild;
        if (!block) return null;
        block.id = targetId;
        holder.insertBefore(block, button.nextSibling);
        activeList = block;
        module.hoverEffects();
        module.hoverTipsy();
        return block;
      };

      const unmountList = () => {
        if (!activeList) return;
        activeList.remove();
        activeList = null;
      };

      const toggleList = (forceOpen) => {
        const shouldOpen = typeof forceOpen === 'boolean'
          ? forceOpen
          : !activeList;
        if (!shouldOpen) {
          unmountList();
          button.setAttribute('aria-expanded', 'false');
          button.textContent = showLabel;
          return;
        }
        const block = mountList();
        if (!block) return;
        button.setAttribute('aria-expanded', 'true');
        button.textContent = hideLabel;
      };

      on(button, 'click', () => toggleList());
      holder.appendChild(button);

      if (cfg.autoOpen && typeof cfg.autoOpen === 'function' && cfg.autoOpen()) {
        toggleList(true);
      }
    });
  };

  Module.reserveImageSpace = function () {
    const selectors = [
      '.entry-content img',
      '.featured-lightbox-trigger img',
      '.single-featured img',
    ];

    const applyAspect = (img, width, height) => {
      if (!img || !width || !height) return;
      if (!img.style.aspectRatio) {
        img.style.aspectRatio = `${width} / ${height}`;
      }
      img.dataset.aspectReserved = 'true';
    };

    const processImage = (img) => {
      if (!img || img.dataset.aspectReserved === 'true') return;
      const attrWidth = parseInt(img.getAttribute('width') || '', 10);
      const attrHeight = parseInt(img.getAttribute('height') || '', 10);
      if (attrWidth > 0 && attrHeight > 0) {
        applyAspect(img, attrWidth, attrHeight);
        return;
      }
      if (img.complete && img.naturalWidth && img.naturalHeight) {
        applyAspect(img, img.naturalWidth, img.naturalHeight);
        return;
      }
      const onLoad = () => {
        if (img.naturalWidth && img.naturalHeight) {
          applyAspect(img, img.naturalWidth, img.naturalHeight);
        }
      };
      on(img, 'load', onLoad, { once: true });
    };

    selectors.forEach((selector) => {
      doc.querySelectorAll(selector).forEach(processImage);
    });
  };

  Module.deferComments = function () {
    const wrap = $('.comment-box-wrap');
    if (!wrap) return;
    const holder = wrap.querySelector('.comment-holder');
    if (!holder) return;

    const template = doc.createElement('template');
    template.innerHTML = holder.outerHTML;
    holder.remove();

    const headerText = wrap.querySelector('.comment-box-header span')?.textContent.trim() || 'Comments';
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'comment-toggle-btn show-post-comment';
    const targetId = holder.id || nextID('lazy-comments');
    button.setAttribute('aria-controls', targetId);
    button.setAttribute('aria-expanded', 'false');
    button.textContent = `Show ${headerText}`;

    wrap.appendChild(button);

    this.lazyComments = {
      wrapper: wrap,
      template,
      button,
      containerId: targetId,
      header: headerText,
      current: null,
    };
  };

  Module.toggleComments = function (forceOpen) {
    const store = this.lazyComments;
    if (!store || !store.button || !store.template) return;
    const shouldOpen = typeof forceOpen === 'boolean'
      ? forceOpen
      : store.button.getAttribute('aria-expanded') !== 'true';

    if (!shouldOpen) {
      if (store.current) {
        store.current.remove();
        store.current = null;
      }

      }
      store.button.setAttribute('aria-expanded', 'false');
      store.button.textContent = `Show ${store.header}`;
      return;
    }

    if (store.current) return;

    const fragment = store.template.content.cloneNode(true);
    const block = fragment.firstElementChild;
    if (!block) return;
    block.id = store.containerId;
    store.wrapper.appendChild(block);
    store.current = block;
    store.button.setAttribute('aria-expanded', 'true');
    store.button.textContent = `Hide ${store.header}`;
    const akismetField = block.querySelector('[id^="ak_js_"]');
    if (akismetField) akismetField.value = String(Date.now());
  };

  

Module.deferAds = function () {
    const ads = $$('.ad-wrap ins.adsbygoogle');
    if (!ads.length) return;

    const slots = new Map();
    const immediate = [];
    const processed = [];

    const renderOnce = (ins, wrapper) => {
      if (!ins) return;
      if (ins.dataset.adsbygoogleStatus && ins.dataset.adsbygoogleStatus !== 'unfilled') {
        if (wrapper) wrapper.dataset.lazyAd = 'loaded';
        processed.push({ ins, wrapper });
        return;
      }
      if (ins.dataset.adLazyRendered === 'true') {
        if (wrapper && wrapper.dataset.lazyAd === 'pending') wrapper.dataset.lazyAd = 'loaded';
        processed.push({ ins, wrapper });
        return;
      }
      ins.dataset.adLazyRendered = 'true';
      if (!ins.dataset.loaded) ins.dataset.loaded = '1';
      if (wrapper) wrapper.dataset.lazyAd = 'loaded';
      processed.push({ ins, wrapper });
      try {
        (win.adsbygoogle = win.adsbygoogle || []).push({});
      } catch (err) {
        console.error(err);
      }
    };

    ads.forEach((ins) => {
      if (!ins) return;

      if (ins.dataset.adsbygoogleStatus && ins.dataset.adsbygoogleStatus !== 'unfilled') {
        const wrapper = safeClosest(ins, '.ad-wrap', doc);
        if (wrapper) wrapper.dataset.lazyAd = 'loaded';
        return;
      }

      if (ins.dataset.adLazyRendered === 'true') return;

      const wrapper = safeClosest(ins, '.ad-wrap', doc);
      if (wrapper && !wrapper.dataset.lazyAd) wrapper.dataset.lazyAd = 'pending';

      if (ins.dataset.loaded === '1') {
        if (wrapper) wrapper.dataset.lazyAd = 'loaded';
        ins.dataset.adLazyRendered = 'true';
        return;
      }

      if (!('IntersectionObserver' in win)) {
        immediate.push({ ins, wrapper });
        return;
      }

      if (ins.dataset.adLazyBound === 'true') return;
      ins.dataset.adLazyBound = 'true';

      const target = wrapper || ins;
      const rect = target.getBoundingClientRect();
      const viewH = win.innerHeight || doc.documentElement.clientHeight || 0;
      if (rect.top <= viewH + 200) {
        renderOnce(ins, wrapper);
        return;
      }

      slots.set(target, { ins, wrapper });
    });

    if (!('IntersectionObserver' in win)) {
      immediate.forEach(({ ins, wrapper }) => renderOnce(ins, wrapper));
      return;
    }

    immediate.forEach(({ ins, wrapper }) => renderOnce(ins, wrapper));

    if (!slots.size) return;

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const slot = slots.get(entry.target);
        if (!slot) return;
        renderOnce(slot.ins, slot.wrapper);
        obs.unobserve(entry.target);
        slots.delete(entry.target);
      });
    }, { rootMargin: '200px 0px' });

    slots.forEach((slot, target) => {
      observer.observe(target);
    });

    this.lazyAds = processed.concat(Array.from(slots.values()));
  };

  Module.optimizeDomSize = function () {
    const entry = $('.entry-content');
    if (entry) {
      this.removeEmptyParagraphs(entry);
      this.flattenEmbedWrappers(entry);
      this.optimizeGalleries(entry);
      this.mergeEntryCaptions(entry);
      this.flattenMediaFigures(entry);
    }
    this.deferShareBlocks();
    this.reserveImageSpace();
    this.deferComments();
    this.deferAds();
  };


  
  /* ===========================
   * FONT RESIZER
   * =========================== */
  Module.fontResizer = function () {
    let size = this.yesStorage ? (sessionStorage.getItem('rubyResizerStep') || 1) : 1;
    delegate(doc, '.font-resizer-trigger', 'click', (e) => {
      e.preventDefault(); e.stopPropagation();
      size = parseInt(size, 10) + 1;
      if (size > 3) {
        size = 1;
        bodyEl.classList.remove('medium-entry-size', 'big-entry-size');
      } else if (size === 2) {
        bodyEl.classList.add('medium-entry-size');
        bodyEl.classList.remove('big-entry-size');
      } else if (size === 3) {
        bodyEl.classList.add('big-entry-size');
        bodyEl.classList.remove('medium-entry-size');
      }
      if (this.yesStorage) sessionStorage.setItem('rubyResizerStep', size);
    });
  };

  /* ===========================
   * HOVER TIPS
   * =========================== */
  Module.hoverTipsy = function () {
    $$('[data-copy]').forEach(el => { if (!el.getAttribute('title')) el.setAttribute('title', el.getAttribute('data-copy')); });
    if (win.innerWidth > 1024) {
      $$('#site-header [data-title], .site-wrap [data-title]').forEach(el => {
        if (!el.getAttribute('title')) el.setAttribute('title', el.getAttribute('data-title'));
      });
    }
  };

  /* ===========================
   * HOVER EFFECTS
   * =========================== */
  Module.hoverEffects = function () {
    $$('.effect-fadeout').forEach(el => {
      if (el.dataset.hoverBound === 'true') return;
      el.dataset.hoverBound = 'true';
      on(el, 'mouseenter', (e) => { e.stopPropagation(); el.classList.add('activated'); });
      on(el, 'mouseleave', () => el.classList.remove('activated'));
    });
  };

  /* ===========================
   * VIDEO PREVIEW
   * =========================== */
  Module.videoPreview = function () {
    let playPromise;
    delegate(doc, '.preview-trigger', 'mouseenter', (e, trigger) => {
      const wrap = trigger.querySelector('.preview-video');
      if (!wrap) return;
      if (!wrap.classList.contains('video-added')) {
        const video = doc.createElement('video');
        video.preload = 'auto'; video.muted = true; video.loop = true;
        const src = doc.createElement('source');
        src.src = wrap.dataset.source || ''; src.type = wrap.dataset.type || '';
        video.appendChild(src);
        wrap.appendChild(video);
        wrap.classList.add('video-added');
      }
      trigger.classList.add('show-preview');
      wrap.style.zIndex = 3;
      const el = wrap.querySelector('video');
      if (el) playPromise = el.play();
    });
    delegate(doc, '.preview-trigger', 'mouseleave', (e, trigger) => {
      const el = trigger.querySelector('video');
      const wrap = trigger.querySelector('.preview-video');
      if (wrap) wrap.style.zIndex = 1;
      if (el && playPromise !== undefined) {
        playPromise.then(_ => el.pause()).catch(() => {});
      }
    });
  };

  Module.videoPlayToggle = function () {
    const players = this.YTPlayers;
    delegate(doc, '.yt-trigger', 'click', (e, trg) => {
      e.preventDefault(); e.stopPropagation();
      const pl = safeClosest(trg, '.yt-playlist', doc);
      const blockID = pl && pl.dataset.block;
      const p = blockID && players[blockID];
      if (!p) return;
      const state = p.getPlayerState();
      const isPlaying = [1,3].includes(state);
      if (!isPlaying) { p.playVideo(); trg.classList.add('is-playing'); }
      else { p.pauseVideo(); trg.classList.remove('is-playing'); }
    });
  };

  /* ===========================
   * COMMENTS HELPERS
   * =========================== */
  Module.showPostComment = function () {
    const module = this;
    delegate(doc, '.smeta-sec .meta-comment', 'click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const btn = module.lazyComments?.button;
      if (!btn) return;
      module.toggleComments(true);
      smoothScrollTo(btn.getBoundingClientRect().top + win.scrollY);
    });

    delegate(doc, '.show-post-comment', 'click', (e) => {
      e.preventDefault(); e.stopPropagation();
      module.toggleComments();
    });
  };

  Module.scrollToComment = function () {
    const h = win.location.hash || '';
    if (h === '#respond' || h.startsWith('#comment')) {
      this.toggleComments(true);
      const target = doc.querySelector(h) || this.lazyComments?.button;
      if (target) {
        raf(() => {
          smoothScrollTo(target.getBoundingClientRect().top + win.scrollY - 200);
        });
      }
    }
  };

  /* ===========================
   * TABLE OF CONTENTS TOGGLE
   * =========================== */
  Module.tocToggle = function () {
    const wrappers = $$('.single-toc, .toc-wrap, .toc-container, .wp-block-foxiz-table-of-contents, .foxiz-toc');
    if (!wrappers.length) return;
    const storageKey = 'RubyTOCExpanded';
    const stored = this.yesStorage ? sessionStorage.getItem(storageKey) : null;

    const setState = (wrap, open, instant) => {
      const panel = wrap.querySelector('[data-toc-panel]') || wrap.querySelector('.toc-inner, .toc-body, .toc-content, .toc-list, ol, ul');
      const btn = wrap.querySelector('[data-toc-toggle], .toc-toggle, .toc-title button, .toc-trigger, .toc-toggle-btn');
      wrap.setAttribute('data-expanded', open ? 'true' : 'false');
      toggle(wrap, 'is-open', open);
      toggle(wrap, 'is-collapsed', !open);
      if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (!panel) return;
      if (instant || prefersReducedMotion()) {
        panel.style.display = open ? '' : 'none';
        return;
      }
      if (open) {
        slideDown(panel, 180);
      } else {
        slideUp(panel, 180);
      }
    };

    wrappers.forEach((wrap) => {
      const btn = wrap.querySelector('[data-toc-toggle], .toc-toggle, .toc-title button, .toc-trigger, .toc-toggle-btn');
      const panel = wrap.querySelector('[data-toc-panel]') || wrap.querySelector('.toc-inner, .toc-body, .toc-content, .toc-list, ol, ul');
      const defaultOpen = wrap.classList.contains('is-open') || wrap.dataset.tocDefault === 'open';
      const startOpen = stored ? stored === 'open' : defaultOpen;
      if (panel && !startOpen) panel.style.display = 'none';
      setState(wrap, startOpen, true);
      if (btn) {
        if (!btn.getAttribute('aria-controls') && panel) {
          const id = panel.id || nextID('toc-panel');
          panel.id = id;
          btn.setAttribute('aria-controls', id);
        }
        btn.setAttribute('aria-expanded', startOpen ? 'true' : 'false');
        on(btn, 'click', (ev) => {
          ev.preventDefault();
          const open = wrap.getAttribute('data-expanded') !== 'true';
          setState(wrap, open, false);
          if (Module.yesStorage) sessionStorage.setItem(storageKey, open ? 'open' : 'closed');
        });
      }

      if (bodyEl.classList.contains('toc-smooth')) {
        delegate(wrap, 'a[href^="#"]', 'click', (ev, link) => {
          const href = link.getAttribute('href') || '';
          if (!href || href === '#') return;
          const targetId = href.slice(1);
          const target = doc.getElementById(targetId);
          if (!target) return;
          ev.preventDefault();
          const offset = parseInt(link.getAttribute('data-offset') || '0', 10);
          smoothScrollTo(target.getBoundingClientRect().top + win.scrollY, { offset: -offset });
          if (history.replaceState) {
            history.replaceState({}, '', `#${targetId}`);
          }
        });
      }
    });
  };

  /* ===========================
   * HEADER DROPDOWNS
   * =========================== */
  Module.headerDropdown = function () {
    const nav = $('.navbar-wrap .main-menu');
    if (!nav) return;
    const items = $$(':scope > li.menu-item-has-children', nav);
    if (!items.length) return;

    const isDesktop = () => win.matchMedia('(min-width: 1025px)').matches;

    const syncDisplay = () => {
      const desktop = isDesktop();
      items.forEach((item) => {
        const submenu = item.querySelector(':scope > .sub-menu');
        const link = item.querySelector(':scope > a');
        if (!submenu) return;
        if (desktop) {
          submenu.style.removeProperty('display');
          if (link && !item.matches(':hover') && !item.matches(':focus-within')) {
            link.setAttribute('aria-expanded', 'false');
          }
        } else {
          if (item.classList.contains('dropdown-open')) {
            submenu.style.display = '';
            if (link) link.setAttribute('aria-expanded', 'true');
          } else {
            submenu.style.display = 'none';
            if (link) link.setAttribute('aria-expanded', 'false');
          }
        }
      });
    };

    items.forEach((item) => {
      const link = item.querySelector(':scope > a');
      const submenu = item.querySelector(':scope > .sub-menu');
      if (submenu && !submenu.id) submenu.id = nextID('submenu');
      if (link) {
        link.setAttribute('aria-haspopup', 'true');
        link.setAttribute('aria-expanded', 'false');
        on(link, 'click', (ev) => {
          if (isDesktop()) return;
          const submenu = item.querySelector(':scope > .sub-menu');
          if (!submenu) return;
          ev.preventDefault();
          const open = !item.classList.contains('dropdown-open');
          toggle(item, 'dropdown-open', open);
          if (open) {
            slideDown(submenu, 200);
            link.setAttribute('aria-expanded', 'true');
          } else {
            slideUp(submenu, 200);
            link.setAttribute('aria-expanded', 'false');
          }
        });
        on(link, 'keydown', (ev) => {
          if (ev.key === 'Escape') {
            toggle(item, 'dropdown-open', false);
            link.setAttribute('aria-expanded', 'false');
            link.blur();
          }
        });
      }

      on(item, 'mouseenter', () => {
        if (!isDesktop()) return;
        toggle(item, 'dropdown-open', true);
        if (link) link.setAttribute('aria-expanded', 'true');
      });
      on(item, 'mouseleave', () => {
        if (!isDesktop()) return;
        toggle(item, 'dropdown-open', false);
        if (link) link.setAttribute('aria-expanded', 'false');
      });
    });

    syncDisplay();
    win.addEventListener('resize', debounce(syncDisplay, 160));
  };

  /* ===========================
   * SUBMENU POSITION CORRECTION
   * =========================== */
  Module.initSubMenuPos = function () {
    const container = $('.navbar-wrap');
    if (!container) return;
    const adjust = () => {
      const desktop = win.matchMedia('(min-width: 1025px)').matches;
      const menus = $$('ul.sub-menu', container);
      menus.forEach((menu) => {
        if (!desktop) {
          menu.style.removeProperty('right');
          menu.style.removeProperty('left');
          return;
        }
        menu.style.left = '';
        menu.style.right = '';
        const rect = menu.getBoundingClientRect();
        if (rect.right > win.innerWidth) {
          menu.style.left = 'auto';
          menu.style.right = '0';
        } else if (rect.left < 0) {
          menu.style.left = '0';
          menu.style.right = 'auto';
        }
      });
    };
    adjust();
    win.addEventListener('resize', debounce(adjust, 160));
  };

  /* ===========================
   * MOBILE COLLAPSE NAVIGATION
   * =========================== */
  Module.closeMobileMenu = function () {
    const headerMobile = $('#header-mobile');
    const collapse = headerMobile ? headerMobile.querySelector('.mobile-collapse') : null;
    const triggers = headerMobile ? headerMobile.querySelectorAll('.mobile-menu-trigger') : [];
    if (!headerMobile || !collapse) return;
    headerMobile.classList.remove('collapse-activated');
    collapse.setAttribute('aria-hidden', 'true');
    bodyEl.classList.remove('mobile-menu-open');
    triggers.forEach((btn) => btn.setAttribute('aria-expanded', 'false'));
  };

  Module.openMobileMenu = function () {
    const headerMobile = $('#header-mobile');
    const collapse = headerMobile ? headerMobile.querySelector('.mobile-collapse') : null;
    const triggers = headerMobile ? headerMobile.querySelectorAll('.mobile-menu-trigger') : [];
    if (!headerMobile || !collapse) return;
    headerMobile.classList.add('collapse-activated');
    collapse.setAttribute('aria-hidden', 'false');
    bodyEl.classList.add('mobile-menu-open');
    triggers.forEach((btn) => btn.setAttribute('aria-expanded', 'true'));
  };

  Module.mobileCollapse = function () {
    const headerMobile = $('#header-mobile');
    if (!headerMobile) return;
    const collapse = headerMobile.querySelector('.mobile-collapse');
    const menu = headerMobile.querySelector('.mobile-menu');
    const triggers = headerMobile.querySelectorAll('.mobile-menu-trigger');
    if (!collapse || !menu) return;

    collapse.setAttribute('aria-hidden', 'true');
    triggers.forEach((btn) => {
      btn.setAttribute('aria-expanded', 'false');
      on(btn, 'click', (ev) => {
        ev.preventDefault();
        const active = headerMobile.classList.contains('collapse-activated');
        if (active) Module.closeMobileMenu();
        else Module.openMobileMenu();
      });
    });

    ensureMobileToggleStyles();
    $$('li.menu-item-has-children', menu).forEach((item) => {
      const submenu = item.querySelector(':scope > .sub-menu');
      const anchor = item.querySelector(':scope > a');
      if (!submenu) return;
      submenu.style.display = 'none';
      submenu.setAttribute('aria-hidden', 'true');
      item.classList.add('submenu-collapsed');
      let toggleBtn = item.querySelector(':scope > button.submenu-toggle');
      if (!toggleBtn) {
        toggleBtn = doc.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'submenu-toggle';
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('aria-label', 'Toggle submenu');
        toggleBtn.innerHTML = '<span class="screen-reader-text">Toggle submenu</span><i class="rbi rbi-plus" aria-hidden="true"></i>';
        item.insertBefore(toggleBtn, submenu);
      }
      on(toggleBtn, 'click', (ev) => {
        ev.preventDefault();
        const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
        if (expanded) {
          slideUp(submenu, 200);
          toggleBtn.setAttribute('aria-expanded', 'false');
          submenu.setAttribute('aria-hidden', 'true');
          item.classList.remove('submenu-expanded');
        } else {
          slideDown(submenu, 200);
          toggleBtn.setAttribute('aria-expanded', 'true');
          submenu.setAttribute('aria-hidden', 'false');
          item.classList.add('submenu-expanded');
        }
      });
      if (anchor) {
        anchor.setAttribute('aria-haspopup', 'true');
        anchor.setAttribute('aria-expanded', 'false');
      }
    });
  };

  /* ===========================
   * DOCUMENT CLICK HANDLING
   * =========================== */
  Module.documentClick = function () {
    const module = this;
    on(doc, 'click', (ev) => {
      const target = ev.target;
      if (!safeClosest(target, '#header-mobile')) {
        module.closeMobileMenu();
      }
      if (!safeClosest(target, '.header-dropdown') && !safeClosest(target, '.dropdown-trigger')) {
        $$('.dropdown-open', doc).forEach((el) => el.classList.remove('dropdown-open'));
      }
      if (module.lazyComments?.button && !module.lazyComments.wrapper.contains(target)) {
        module.toggleComments(false);
      }
    });
    on(doc, 'keydown', (ev) => {
      if (ev.key === 'Escape') {
        module.closeMobileMenu();
        if (module.closeLoginPopup) module.closeLoginPopup();
      }
    });
  };

  /* ===========================
   * PRIVACY BAR
   * =========================== */
  Module.privacyTrigger = function () {
    const box = $('#rb-privacy');
    if (!box) return;
    const btn = $('#privacy-trigger', box) || box.querySelector('.privacy-dismiss-btn');
    const hideBar = () => {
      box.classList.remove('activated');
      if (this.yesStorage) localStorage.setItem('RubyPrivacyAllowed', '1');
    };
    if (btn) {
      on(btn, 'click', (ev) => {
        ev.preventDefault();
        hideBar();
      });
    }
    const allowed = this.yesStorage ? localStorage.getItem('RubyPrivacyAllowed') : null;
    if (allowed === '1') hideBar();
  };

  /* ===========================
   * LOGIN POPUP
   * =========================== */
  Module.loginPopup = function () {
    const popup = $('#rb-login') || $('.login-popup');
    const triggers = $$('.login-toggle, .login-popup-trigger, .popup-login-trigger');
    if (!popup) {
      triggers.forEach((btn) => {
        const href = btn.getAttribute('href');
        if (!href || href.startsWith('#')) {
          on(btn, 'click', (ev) => {
            if (!href || href === '#') {
              ev.preventDefault();
              win.location.href = btn.dataset.url || '/wp-login.php';
            }
          });
        }
      });
      return;
    }

    const close = () => {
      popup.classList.remove('activated');
      popup.setAttribute('aria-hidden', 'true');
    };
    const open = () => {
      popup.classList.add('activated');
      popup.setAttribute('aria-hidden', 'false');
    };

    triggers.forEach((btn) => {
      on(btn, 'click', (ev) => {
        const href = btn.getAttribute('href');
        if (href && href[0] !== '#') return;
        ev.preventDefault();
        open();
      });
    });

    delegate(popup, '.login-close, .popup-close, .popup-dismiss', 'click', (ev) => {
      ev.preventDefault();
      close();
    });

    this.closeLoginPopup = close;
  };

  /* ===========================
   * YOUTUBE LAZY LOADING
   * =========================== */
  Module.loadYoutubeIframe = function () {
    const facades = $$('.yt-facade, .wp-block-embed__wrapper.has-yt-facade');
     const activate = (wrapper, facade, opts = {}) => {
      if (!wrapper || wrapper.dataset.embedLoaded === 'true') return;
      const videoId = opts.videoId || wrapper.dataset.videoId;
      let src = opts.embed || wrapper.dataset.embed;
      if (!src && videoId) {
        const params = opts.params || wrapper.dataset.params || 'rel=0&showinfo=0';
        src = `https://www.youtube.com/embed/${videoId}?${params}`;
      }
      if (!src) {
        const url = opts.url || wrapper.dataset.url || wrapper.getAttribute('href');
        if (url) {
          const match = url.match(/(?:youtu\.be\/|v=)([A-Za-z0-9_-]{6,11})/);
          if (match) {
            src = `https://www.youtube.com/embed/${match[1]}?rel=0&showinfo=0`;
          }
        }
      }
      if (!src) return;
      const iframe = doc.createElement('iframe');
      iframe.src = src;
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      iframe.width = opts.width || wrapper.dataset.width || '560';
      iframe.height = opts.height || wrapper.dataset.height || '315';
      wrapper.innerHTML = '';
      wrapper.appendChild(iframe);
      wrapper.dataset.embedLoaded = 'true';
      if (facade) {
        facade.dataset.embedLoaded = 'true';
      }
      if (wrapper.classList.contains('has-yt-facade')) {
        wrapper.classList.remove('has-yt-facade');
      }
      wrapper.classList.add('yt-embed-loaded');
      const figure = safeClosest(wrapper, '.wp-block-embed.wp-block-embed-youtube');
      if (figure && figure.classList.contains('has-yt-facade')) {
        figure.classList.remove('has-yt-facade');
      }
    };

    facades.forEach((node) => {
      const isFacadeEl = node.classList.contains('yt-facade');
      const target = isFacadeEl ? node : node.querySelector('.yt-facade');
      const wrapper = isFacadeEl ? node.parentElement || node : node;
      if (!target) return;
      const handler = (ev) => {
        ev.preventDefault();
        const dataset = target.dataset;
        activate(wrapper, target, {
          videoId: dataset.videoId,
          embed: dataset.embed,
          params: dataset.params,
          url: dataset.url,
        });
      };
      on(target, 'click', handler);
      on(target, 'keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          handler(ev);
        }
      });
    });

    const playlists = $$('.yt-playlist[data-video]');
    if (!playlists.length) return;

    ensureYouTubeAPI(() => {
      playlists.forEach((block) => {
        const video = block.dataset.video;
        const opts = block.dataset.options ? JSON.parse(block.dataset.options) : {};
        const holder = block.querySelector('.yt-player');
        if (!holder || !video) return;
        const id = block.dataset.block || nextID('yt-block');
        block.dataset.block = id;
        const player = new win.YT.Player(holder, {
          videoId: video,
          playerVars: opts,
          events: {
            onReady: () => {
              Module.YTPlayers[id] = player;
            }
          }
        });
        Module.YTPlayers[id] = player;
      });
    });
  };

  /* ===========================
   * OPTIONAL THEME HOOK STUBS
   * =========================== */
  if (typeof Module.reInitAll !== 'function') {
    Module.reInitAll = function () { /* no-op */ };
  }
  if (typeof Module.reloadBlockFunc !== 'function') {
    Module.reloadBlockFunc = function () { /* no-op */ };
  }

  /* ===========================
   * MASTER INIT (NO PAGINATION)
   * =========================== */
  Module.init = function () {
    this.initParams();
    this.optimizeDomSize();
    this.tocToggle();
    this.fontResizer();
    this.hoverTipsy();
    this.hoverEffects();
    this.videoPreview();
    this.videoPlayToggle();
    this.headerDropdown();
    this.initSubMenuPos();
    this.documentClick();
    this.mobileCollapse();
    this.privacyTrigger();
    this.loginPopup();
    this.loadYoutubeIframe();
    this.showPostComment();
    this.scrollToComment();
    const module = this;
    win.addEventListener('load', () => module.reserveImageSpace());
  };

  return Module;
}(window.FOXIZ_MAIN_SCRIPT || {}));

/* Boot */
document.addEventListener('DOMContentLoaded', function () {
  FOXIZ_MAIN_SCRIPT.init();
});
