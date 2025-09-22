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

  const $  = (sel, ctx) => (ctx || document).querySelector(sel);




   const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const on  = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts || false);
  const off = (el, ev, fn) => el && el.removeEventListener(ev, fn);

  const safeClosest = (node, selector, stopAt = document) => {
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
    const style = document.createElement('style');
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
    document.head.appendChild(style);
  };




  const htmlEl = document.documentElement;
  const bodyEl = document.body;
  const smoothScrollTo = (y) => window.scrollTo({ top: y, behavior: 'smooth' });

  /* =================
   * SLIDE HELPERS
   * ================= */
  function slideUp(el, duration=200){
    if (!el) return;
    el.style.height = el.offsetHeight + 'px';
    el.offsetHeight;
    el.style.transition = `height ${duration}ms ease, margin ${duration}ms ease, padding ${duration}ms ease`;
    el.style.overflow = 'hidden';
    el.style.height = 0;
    el.style.paddingTop = 0; el.style.paddingBottom = 0;
    el.style.marginTop = 0;  el.style.marginBottom = 0;
    window.setTimeout(() => {
@@ -132,91 +176,430 @@ var FOXIZ_MAIN_SCRIPT = (function (Module) {
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
    this.themeSettings = typeof window.foxizParams !== 'undefined' ? window.foxizParams : {};
    this.ajaxURL = (window.foxizCoreParams && window.foxizCoreParams.ajaxurl) || '/wp-admin/admin-ajax.php';
    this.ajaxData = {};
    this.readIndicator = $('#reading-progress');
    this.outerHTML = document.documentElement;
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

    const appendCaption = (figure, nodes) => {
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
        figcaption = document.createElement('figcaption');
        figure.appendChild(figcaption);
      }
      figcaption.classList.add('inline-figure-caption');
      const existing = figcaption.innerHTML.trim();
      const addition = parts.join('<br>');
      figcaption.innerHTML = existing ? `${existing}<br>${addition}` : addition;
      figure.classList.add('has-inline-caption');
      figure.dataset.wdInlineCaption = '1';
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

      const figure = document.createElement('figure');
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
        const figcaption = document.createElement('figcaption');
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
      appendCaption(figure, previous.concat(next));
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
      const list = document.querySelector(cfg.selector);
      if (!list) return;
      const holder = list.parentElement;
      if (!holder) return;
      if (holder.querySelector(`.${cfg.buttonClass}`)) return;

      const template = document.createElement('template');
      template.innerHTML = list.outerHTML;
      const targetId = list.id || nextID('share-list');
      list.remove();

      const button = document.createElement('button');
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

      button.addEventListener('click', () => toggleList());
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
      img.addEventListener('load', onLoad, { once: true });
    };

    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach(processImage);
    });
  };

  Module.deferComments = function () {
    const wrap = $('.comment-box-wrap');
    if (!wrap) return;
    const holder = wrap.querySelector('.comment-holder');
    if (!holder) return;

    const template = document.createElement('template');
    template.innerHTML = holder.outerHTML;
    holder.remove();

    const headerText = wrap.querySelector('.comment-box-header span')?.textContent.trim() || 'Comments';
    const button = document.createElement('button');
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
    const adSlots = [];
    $$('.ad-wrap ins.adsbygoogle').forEach((ins) => {
      const host = ins.parentElement;
      if (!host) return;
      const wrapper = safeClosest(host, '.ad-wrap', document) || host;
      const data = {
        host,
        wrapper,
        client: ins.getAttribute('data-ad-client') || '',
        slot: ins.getAttribute('data-ad-slot') || '',
        format: ins.getAttribute('data-ad-format') || '',
        fullWidth: ins.getAttribute('data-full-width-responsive') || '',
        style: ins.getAttribute('style') || 'display:block',
      };

      const script = wrapper.querySelector('script');
      if (script && script.textContent && script.textContent.includes('adsbygoogle')) {
        script.remove();
      }

      wrapper.dataset.lazyAd = 'pending';
      host.dataset.adClient = data.client;
      host.dataset.adSlot = data.slot;
      host.dataset.adFormat = data.format;
      host.dataset.adFullWidth = data.fullWidth;
      host.dataset.adStyle = data.style;
      ins.remove();
      adSlots.push({ host, wrapper });
    });

    if (!adSlots.length) return;

    const renderAd = (slot) => {
      const { host, wrapper } = slot;
      if (!host || host.dataset.adRendered === 'true') return;
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.cssText = host.dataset.adStyle || 'display:block';
      if (host.dataset.adClient) ins.setAttribute('data-ad-client', host.dataset.adClient);
      if (host.dataset.adSlot) ins.setAttribute('data-ad-slot', host.dataset.adSlot);
      if (host.dataset.adFormat) ins.setAttribute('data-ad-format', host.dataset.adFormat);
      if (host.dataset.adFullWidth) ins.setAttribute('data-full-width-responsive', host.dataset.adFullWidth);
      host.appendChild(ins);
      host.dataset.adRendered = 'true';
      if (wrapper) wrapper.dataset.lazyAd = 'loaded';
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.error(err);
      }
    };

    if (!('IntersectionObserver' in window)) {
      adSlots.forEach(renderAd);
      return;
    }

    const map = new WeakMap();
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const slot = map.get(entry.target);
        if (slot) {
          renderAd(slot);
          obs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '200px 0px' });

    adSlots.forEach((slot) => {
      const target = slot.wrapper || slot.host;
      map.set(target, slot);
      observer.observe(target);
    });

    this.lazyAds = adSlots;
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
    delegate(document, '.font-resizer-trigger', 'click', (e) => {
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
    if (window.innerWidth > 1024) {
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
    delegate(document, '.preview-trigger', 'mouseenter', (e, trigger) => {
      const wrap = trigger.querySelector('.preview-video');
      if (!wrap) return;
      if (!wrap.classList.contains('video-added')) {
        const video = document.createElement('video');
        video.preload = 'auto'; video.muted = true; video.loop = true;
        const src = document.createElement('source');
        src.src = wrap.dataset.source || ''; src.type = wrap.dataset.type || '';
        video.appendChild(src);
        wrap.appendChild(video);
        wrap.classList.add('video-added');
      }
      trigger.classList.add('show-preview');
      wrap.style.zIndex = 3;
      const el = wrap.querySelector('video');

        const titleEl = wrapper.querySelector('.play-title');
        if (titleEl) { hide(titleEl); titleEl.textContent = title; show(titleEl); }
        const idxEl = wrapper.querySelector('.video-index'); if (idxEl) idxEl.textContent = meta;
      });
    };
  };
  Module.videoPlayToggle = function () {
    const players = this.YTPlayers;
    delegate(document, '.yt-trigger', 'click', (e, trg) => {
      e.preventDefault(); e.stopPropagation();
      const pl = safeClosest(trg, '.yt-playlist', document);
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
    delegate(document, '.smeta-sec .meta-comment', 'click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const btn = module.lazyComments?.button;
      if (!btn) return;
      module.toggleComments(true);
      smoothScrollTo(btn.getBoundingClientRect().top + window.scrollY);
    });

    delegate(document, '.show-post-comment', 'click', (e) => {
      e.preventDefault(); e.stopPropagation();
      module.toggleComments();
    });
  };

  Module.scrollToComment = function () {
    const h = window.location.hash || '';
    if (h === '#respond' || h.startsWith('#comment')) {
      this.toggleComments(true);
      const target = document.querySelector(h) || this.lazyComments?.button;
      if (target) {
        requestAnimationFrame(() => {
          smoothScrollTo(target.getBoundingClientRect().top + window.scrollY - 200);
        });
      }
    }
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
    window.addEventListener('load', () => module.reserveImageSpace());
    // (Pagination is initialized by pagination.js)
  };

  return Module;
}(window.FOXIZ_MAIN_SCRIPT || {}));

/* Boot */
document.addEventListener('DOMContentLoaded', function () {
  FOXIZ_MAIN_SCRIPT.init();
});
