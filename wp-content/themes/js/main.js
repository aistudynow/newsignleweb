/** FOXIZ_MAIN_SCRIPT — Vanilla (no jQuery) */
var FOXIZ_MAIN_SCRIPT = window.FOXIZ_MAIN_SCRIPT || {};
(function (Module) {
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
      el.style.display = 'none';
      ['height','paddingTop','paddingBottom','marginTop','marginBottom','overflow','transition']
        .forEach(p=>el.style.removeProperty(p));
    }, duration);
  }
  function slideDown(el, duration=200){
    if (!el) return;
    el.style.removeProperty('display');
    const cs = getComputedStyle(el);
    el.style.display = cs.display === 'none' ? 'block' : cs.display;
    const height = el.offsetHeight;
    el.style.overflow = 'hidden';
    el.style.height = 0;
    el.style.paddingTop = 0; el.style.paddingBottom = 0;
    el.style.marginTop = 0;  el.style.marginBottom = 0;
    el.offsetHeight;
    el.style.transition = `height ${duration}ms ease, margin ${duration}ms ease, padding ${duration}ms ease`;
    el.style.height = height + 'px';
    window.setTimeout(() => {
      ['height','overflow','transition','paddingTop','paddingBottom','marginTop','marginBottom']
        .forEach(p=>el.style.removeProperty(p));
    }, duration);
  }
  function slideToggle(el, duration=200){
    if (!el) return;
    if (getComputedStyle(el).display === 'none') slideDown(el, duration);
    else slideUp(el, duration);
  }

  /* ===========================
   * MINIMAL STORAGE
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
    this.themeSettings = typeof window.foxizParams !== 'undefined' ? window.foxizParams : {};
    this.ajaxURL = (window.foxizCoreParams && window.foxizCoreParams.ajaxurl) || '/wp-admin/admin-ajax.php';
    this.ajaxData = {};
    this.readIndicator = $('#reading-progress');
    this.outerHTML = document.documentElement;
    this.YTPlayers = {};
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
      if (el) playPromise = el.play();
    });
    delegate(document, '.preview-trigger', 'mouseleave', (e, trigger) => {
      const el = trigger.querySelector('video');
      const wrap = trigger.querySelector('.preview-video');
      if (wrap) wrap.style.zIndex = 1;
      if (el && playPromise !== undefined) {
        playPromise.then(_ => el.pause()).catch(() => {});
      }
    });
  };

  /* ===========================
   * HEADER DROPDOWNS
   * =========================== */
  Module.headerDropdown = function () {
    const closeAll = () => $$('.dropdown-activated').forEach(el => el.classList.remove('dropdown-activated'));

    delegate(document, '.more-trigger', 'click', (e, btn) => {
      e.preventDefault(); e.stopPropagation();
      this.calcSubMenuPos();
      const holder = safeClosest(btn, '.header-wrap')?.querySelector('.more-section-outer');
      if (!holder) return;
      if (!holder.classList.contains('dropdown-activated')) {
        closeAll(); holder.classList.add('dropdown-activated');
      } else {
        holder.classList.remove('dropdown-activated');
      }
      if (btn.classList.contains('search-btn')) {
        setTimeout(() => holder.querySelector('input[type="text"]')?.focus(), 150);
      }
    });

    delegate(document, '.search-trigger', 'click', (e, btn) => {
      e.preventDefault(); e.stopPropagation();
      const holder = safeClosest(btn, '.header-dropdown-outer');
      if (!holder) return;
      if (!holder.classList.contains('dropdown-activated')) {
        closeAll(); holder.classList.add('dropdown-activated');
        setTimeout(() => holder.querySelector('input[type="text"]')?.focus(), 150);
      } else {
        holder.classList.remove('dropdown-activated');
      }
    });

    delegate(document, '.dropdown-trigger', 'click', (e, btn) => {
      e.preventDefault(); e.stopPropagation();
      const holder = safeClosest(btn, '.header-dropdown-outer');
      if (!holder) return;
      if (!holder.classList.contains('dropdown-activated')) {
        closeAll(); holder.classList.add('dropdown-activated');
      } else {
        holder.classList.remove('dropdown-activated');
      }
    });
  };

  /* ===========================
   * MEGA MENU POSITIONING
   * =========================== */
  Module.initSubMenuPos = function () {
    setTimeout(() => this.calcSubMenuPos(), 1000);
    let triggered = false;
    $$('.menu-has-child-mega').forEach(el => {
      on(el, 'mouseenter', () => {
        if (!triggered) this.calcSubMenuPos();
        triggered = true;
      });
    });
    on(window, 'resize', () => this.calcSubMenuPos());
  };

  Module.calcSubMenuPos = function () {
    if (window.outerWidth < 1025) return false;

    const headerWrapper = $('#site-header');
    const bodyWidth = bodyEl.clientWidth;

    $$('.menu-has-child-mega').forEach(item => {
      const mega = item.querySelector('.mega-dropdown');
      if (!mega) return;
      const rect = item.getBoundingClientRect();
      const left = rect.left + window.scrollX;
      mega.style.width = bodyWidth + 'px';
      mega.style.left = (-left) + 'px';
      item.classList.add('mega-menu-loaded');
    });

    if (!headerWrapper) return;

    const hRect = headerWrapper.getBoundingClientRect();
    const headerLeft = hRect.left + window.scrollX;
    const headerRight = headerLeft + hRect.width;
    const headerWidth = hRect.width;

    $$('ul.sub-menu').forEach(item => {
      const r = item.getBoundingClientRect();
      const left = r.left + window.scrollX;
      const right = left + item.offsetWidth + 100;
      if (right > headerRight) item.classList.add('left-direction');
    });

    $$('.flex-dropdown').forEach(item => {
      const parent = item.parentElement;
      if (!parent || parent.classList.contains('is-child-wide') || item.classList.contains('mega-has-left')) return;

      const itemWidth = item.offsetWidth;
      const iHalf = itemWidth / 2;

      const pRect = parent.getBoundingClientRect();
      const pLeft = pRect.left + window.scrollX;
      const pHalf = parent.offsetWidth / 2;
      const pCenter = pLeft + pHalf;

      const headerLeft2 = $('#site-header').getBoundingClientRect().left + window.scrollX;
      const headerRight2 = headerLeft2 + $('#site-header').getBoundingClientRect().width;
      const headerWidth2 = $('#site-header').getBoundingClientRect().width;

      const rightSpace = headerRight2 - pCenter;
      const leftSpace  = pCenter - headerLeft2;

      if (itemWidth >= headerWidth2) {
        item.style.width = (headerWidth2 - 2) + 'px';
        item.style.left = (-pLeft) + 'px';
        item.style.right = 'auto';
      } else if (iHalf > rightSpace) {
        item.style.right = (-rightSpace + pHalf + 1) + 'px';
        item.style.left  = 'auto';
      } else if (iHalf > leftSpace) {
        item.style.left  = (-leftSpace + pHalf + 1) + 'px';
        item.style.right = 'auto';
      } else {
        item.style.left  = (-iHalf + pHalf) + 'px';
        item.style.right = 'auto';
      }
    });
  };

  /* ===========================
   * OUTSIDE CLICK CLOSES
   * =========================== */
  Module.documentClick = function () {
    document.addEventListener('click', function (e) {
      if (safeClosest(e.target, '.mobile-menu-trigger, .mobile-collapse, .more-section-outer, .header-dropdown-outer, .mfp-wrap', document)) {
        return;
      }
      document.querySelectorAll('.dropdown-activated').forEach(el => el.classList.remove('dropdown-activated'));
      document.documentElement.classList.remove('collapse-activated');
      document.body.classList.remove('collapse-activated');
      document.querySelectorAll('.is-form-layout .live-search-response').forEach(el => { el.style.display = 'none'; });
    });
  };

  /* ===========================
   * MOBILE COLLAPSE
   * =========================== */
  Module.mobileCollapse = function () {
    const root = document.documentElement;
    const rootBody = document.body;

    document.addEventListener('click', function (e) {
      const btn = safeClosest(e.target, '.mobile-menu-trigger', document);
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      const isOpen = root.classList.contains('collapse-activated') || rootBody.classList.contains('collapse-activated');

      root.classList.toggle('collapse-activated', !isOpen);
      rootBody.classList.toggle('collapse-activated', !isOpen);

      btn.setAttribute('aria-expanded', String(!isOpen));

      if (btn.classList.contains('mobile-search-icon')) {
        setTimeout(() => {
          const input = document.querySelector('.mobile-search-form input[type="text"]');
          if (input) input.focus();
        }, 100);
      }
    });

    const panel = document.querySelector('.mobile-collapse') || document.querySelector('#mobile-menu') || document.querySelector('#offcanvas');
    if (panel) {
      panel.addEventListener('click', (e) => e.stopPropagation());
    }
  };

  /* ===========================
   * PRIVACY TRIGGER
   * =========================== */
  Module.privacyTrigger = function () {
    const trigger = $('#privacy-trigger');
    on(trigger, 'click', (e) => {
      e.preventDefault(); e.stopPropagation();
      this.setStorage('RubyPrivacyAllowed', '1');
      const bar = $('#rb-privacy');
      if (!bar) return false;
      bar.style.transition = 'height .2s ease, opacity .2s ease';
      bar.style.overflow = 'hidden';
      bar.style.opacity = '0';
      bar.style.height = '0px';
      setTimeout(() => bar.remove(), 220);
      return false;
    });
  };

  /* ===========================
   * TOC TOGGLE
   * =========================== */
  Module.tocToggle = function () {
    document.addEventListener('click', function (e) {
      const btn = safeClosest(e.target, '.toc-toggle', document);
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      let content = null;
      const targetSel = btn.getAttribute('data-target') || btn.getAttribute('aria-controls');
      if (targetSel) {
        content = document.querySelector(targetSel.startsWith('#') ? targetSel : `#${targetSel}`);
      }
      if (!content) {
        const holder = safeClosest(btn, '.ruby-table-contents', document) || btn.parentElement || document;
        content = holder.querySelector('.toc-content');
      }
      if (!content) return;

      const willOpen = getComputedStyle(content).display === 'none';
      slideToggle(content, 200);
      btn.classList.toggle('activate', willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
    });
  };

  /* ===========================
   * LOGIN POPUP
   * =========================== */
  Module.loginPopup = function () {
    const form = $('#rb-user-popup-form');
    if (!form) return;

    const ensureModal = () => {
      let overlay = $('#rb-login-overlay');
      if (overlay) return overlay;
      overlay = document.createElement('div');
      overlay.id = 'rb-login-overlay';
      overlay.innerHTML = `
        <div class="rb-modal">
          <button class="close-popup-btn" aria-label="Close"><span class="close-icon"></span></button>
          <div class="rb-modal-body"></div>
        </div>`;
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;opacity:0;z-index:99999;';
      const modal = overlay.querySelector('.rb-modal');
      modal.style.cssText = 'position:relative;margin:5vh auto;max-width:520px;background:#fff;border-radius:8px;padding:20px;';
      document.body.appendChild(overlay);
      return overlay;
    };

    const open = () => {
      const overlay = ensureModal();
      const body = overlay.querySelector('.rb-modal-body');
      body.innerHTML = '';
      body.appendChild(form);
      overlay.style.display = 'block';
      requestAnimationFrame(() => overlay.style.opacity = '1');

      try { if (typeof turnstile !== 'undefined') turnstile.reset(); } catch {}
      try { if (typeof grecaptcha !== 'undefined') grecaptcha.reset(); } catch {}
    };
    const close = () => {
      const overlay = $('#rb-login-overlay');
      if (!overlay) return;
      overlay.style.opacity = '0';
      setTimeout(() => overlay.style.display = 'none', 150);
    };

    delegate(document, '.login-toggle', 'click', (e) => { e.preventDefault(); e.stopPropagation(); open(); });
    delegate(document, '#rb-login-overlay .close-popup-btn', 'click', (e) => { e.preventDefault(); close(); });
    on(document, 'keydown', (e) => { if (e.key === 'Escape') close(); });
    delegate(document, '#rb-login-overlay', 'click', (e, ov) => { if (e.target === ov) close(); });
  };

  /* ===========================
   * YOUTUBE IFRAME
   * =========================== */
  Module.loadYoutubeIframe = function () {
    const playlists = $$('.yt-playlist');
    if (!playlists.length) return;

    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.id = 'yt-iframe-api';
      const first = document.getElementsByTagName('script')[0];
      first.parentNode.insertBefore(tag, first);
    }

    window.onYouTubeIframeAPIReady = () => {
      playlists.forEach(pl => {
        const iframe = pl.querySelector('.yt-player');
        const videoID = pl.dataset.id;
        const blockID = pl.dataset.block;
        if (!iframe || !videoID || !blockID) return;
        this.YTPlayers[blockID] = new YT.Player(iframe, {
          height: '540', width: '960', videoId: videoID,
          events: { 'onReady': this.videoPlayToggle.bind(this), 'onStateChange': this.videoPlayToggle.bind(this) }
        });
      });

      delegate(document, '.plist-item', 'click', (e, item) => {
        e.preventDefault(); e.stopPropagation();
        const wrapper = safeClosest(item, '.yt-playlist', document);
        if (!wrapper) return;
        const currentBlockID = wrapper.dataset.block;
        const videoID = item.dataset.id;
        const title = item.querySelector('.plist-item-title')?.textContent || '';
        const meta = item.dataset.index || '';
        Object.values(this.YTPlayers).forEach(p => p.pauseVideo && p.pauseVideo());
        this.YTPlayers[currentBlockID]?.loadVideoById({ videoId: videoID });
        wrapper.querySelector('.yt-trigger')?.classList.add('is-playing');
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
    delegate(document, '.smeta-sec .meta-comment', 'click', (e) => {
      const btn = $('.show-post-comment'); if (!btn) return;
      smoothScrollTo(btn.getBoundingClientRect().top + window.scrollY);
      btn.click();
    });

    delegate(document, '.show-post-comment', 'click', (e, btn) => {
      e.preventDefault(); e.stopPropagation();
      const wrap = btn.parentElement;
      hide(btn); btn.remove();
      wrap.querySelectorAll('.is-invisible').forEach(el => el.classList.remove('is-invisible'));
      const holder = wrap.nextElementSibling?.classList.contains('comment-holder') ? wrap.nextElementSibling : null;
      if (holder) holder.classList.remove('is-hidden');
    });
  };

  Module.scrollToComment = function () {
    const h = window.location.hash || '';
    if (h === '#respond' || h.startsWith('#comment')) {
      const btn = $('.show-post-comment');
      if (!btn) return;
      smoothScrollTo(btn.getBoundingClientRect().top + window.scrollY - 200);
      btn.click();
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
    this.tocToggle();
    this.initParams();
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
    // (Pagination is initialized by pagination.js)
  };

}(FOXIZ_MAIN_SCRIPT));

/* Boot */
document.addEventListener('DOMContentLoaded', function () {
  FOXIZ_MAIN_SCRIPT.init();
});
