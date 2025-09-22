/* FOXIZ_MAIN_SCRIPT — Pagination (vanilla + jQuery parity for WP admin-ajax) */
(function (Module) {
  'use strict';

  /* =============== tiny DOM helpers =============== */
  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts || false);
  const delegate = (root, sel, ev, fn) =>
    on(root, ev, (e) => {
      let n = e.target;
      if (n && n.nodeType !== 1) n = n.parentElement || n.parentNode;
      while (n && n !== root) {
        if (n.matches && n.matches(sel)) { fn(e, n); return; }
        n = n.parentElement || n.parentNode;
      }
    });

  const hide = (el) => { if (el) el.style.display = 'none'; };
  const show = (el) => { if (el) el.style.display = ''; };

  /* =============== WP utils =============== */

  // jQuery-like nested param serialization: data[a]=1&data[b][c]=2
  function toQuery(prefix, obj, out = []) {
    if (obj == null) return out;
    if (Array.isArray(obj)) {
      obj.forEach((v, i) => {
        const key = `${prefix}[${i}]`;
        if (v && typeof v === 'object') toQuery(key, v, out);
        else out.push(`${key}=${encodeURIComponent(v == null ? '' : v)}`);
      });
      return out;
    }
    if (typeof obj === 'object') {
      Object.keys(obj).forEach((k) => {
        const v = obj[k];
        const key = prefix ? `${prefix}[${k}]` : k;
        if (v && typeof v === 'object') toQuery(key, v, out);
        else out.push(`${key}=${encodeURIComponent(v == null ? '' : v)}`);
      });
      return out;
    }
    out.push(`${prefix}=${encodeURIComponent(obj)}`);
    return out;
  }

  // Parse server output flexibly: JSON or raw HTML or '0'/'-1'
  function parseMaybeJSON(raw) {
    if (raw == null) return { content: '' };
    if (typeof raw === 'object') return raw;
    const txt = String(raw).trim();
    if (!txt) return { content: '' };
    if (txt === '0' || txt === '-1') return { content: '', error: 'WP_AJAX_EMPTY_OR_NONCE' };
    try { return JSON.parse(txt); } catch { return { content: txt }; }
  }

  function looksValidAjax(obj) {
    if (!obj || typeof obj !== 'object') return false;
    if (typeof obj.content === 'string' && obj.content.length) return true;
    if ('paged' in obj) return true;
    if ('notice' in obj) return true;
    return false;
  }

  // --- admin-ajax helper: prefer jQuery.ajax (Foxiz parity), then vanilla fallbacks ---
  async function callAdminAjax(action, dataObj) {
    const ajaxurl =
      (window.foxizCoreParams && window.foxizCoreParams.ajaxurl) ||
      '/wp-admin/admin-ajax.php';

    // 0) jQuery GET (nested) — EXACTLY what Foxiz shipped originally
    if (window.jQuery && window.jQuery.ajax) {
      return await new Promise((resolve, reject) => {
        window.jQuery.ajax({
          type: 'GET',
          url: ajaxurl,
          data: { action: action, data: dataObj },
          success: function (res) {
            try {
              Module.__ajaxDebug = {
                method: 'jQuery.GET(NESTED)',
                url: ajaxurl + '?action=' + action + '&(nested data…)'
              };
            } catch {}
            resolve(res); // can be plain HTML or JSON
          },
          error: function (xhr, status, err) {
            reject(err || status);
          }
        });
      });
    }

    // 1) GET (nested)
    {
      const nonceKV = (window.foxizCoreParams && window.foxizCoreParams.security)
        ? `&security=${encodeURIComponent(window.foxizCoreParams.security)}`
        : '';
      const url = new URL(ajaxurl, window.location.origin);
      const qs = `action=${encodeURIComponent(action)}${nonceKV}` +
                 (dataObj ? '&' + toQuery('data', dataObj, []).join('&') : '') +
                 `&_=${Date.now()}`;
      url.search = qs;

      Module.__ajaxDebug = { method: 'GET(NESTED)', url: url.toString() };
      try {
        const res = await fetch(url.toString(), {
          credentials: 'same-origin',
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const txt = await res.text();
        const parsed = parseMaybeJSON(txt);
        if (looksValidAjax(parsed) || txt.trim()) return txt;
      } catch {}
    }

    // 2) GET (JSON-string)
    {
      const nonceKV = (window.foxizCoreParams && window.foxizCoreParams.security)
        ? `&security=${encodeURIComponent(window.foxizCoreParams.security)}`
        : '';
      const url = new URL(ajaxurl, window.location.origin);
      url.search = `action=${encodeURIComponent(action)}${nonceKV}&data=${encodeURIComponent(JSON.stringify(dataObj || {}))}&_=${Date.now()}`;

      Module.__ajaxDebug = { method: 'GET(JSON)', url: url.toString() };
      try {
        const res = await fetch(url.toString(), {
          credentials: 'same-origin',
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const txt = await res.text();
        const parsed = parseMaybeJSON(txt);
        if (looksValidAjax(parsed) || txt.trim()) return txt;
      } catch {}
    }

    // 3) POST (nested)
    {
      const nonceKV = (window.foxizCoreParams && window.foxizCoreParams.security)
        ? `&security=${encodeURIComponent(window.foxizCoreParams.security)}`
        : '';
      const body = `action=${encodeURIComponent(action)}${nonceKV}&` + toQuery('data', dataObj || {}, []).join('&');
      Module.__ajaxDebug = { method: 'POST(NESTED)', url: ajaxurl, body };
      try {
        const res = await fetch(ajaxurl, {
          method: 'POST',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
          },
          body,
          credentials: 'same-origin'
        });
        const txt = await res.text();
        const parsed = parseMaybeJSON(txt);
        if (looksValidAjax(parsed) || txt.trim()) return txt;
      } catch {}
    }

    // 4) POST (JSON-string)
    {
      const nonceKV = (window.foxizCoreParams && window.foxizCoreParams.security)
        ? `&security=${encodeURIComponent(window.foxizCoreParams.security)}`
        : '';
      const body = `action=${encodeURIComponent(action)}${nonceKV}&data=${encodeURIComponent(JSON.stringify(dataObj || {}))}`;
      Module.__ajaxDebug = { method: 'POST(JSON)', url: ajaxurl, body };
      try {
        const res = await fetch(ajaxurl, {
          method: 'POST',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
          },
          body,
          credentials: 'same-origin'
        });
        const txt = await res.text();
        return txt; // last resort: still return raw
      } catch {
        return '';
      }
    }
  }

  /* =============== shared state =============== */
  if (!Module.ajaxData) Module.ajaxData = {};
  if (!Module.getBlockSettings) {
    Module.getBlockSettings = function (uuid) {
      const src = typeof window[uuid] !== 'undefined' ? window[uuid] : undefined;
      if (!src || typeof src !== 'object') return undefined;
      const out = { ...src };
      Object.keys(out).forEach((k) => { if (out[k] === '' || out[k] === null) delete out[k]; });
      return out;
    };
  }

  /* =============== UI helpers =============== */
  Module.ajaxStartAnimation = function (block, action) {
    const inner = block.querySelector('.block-inner');
    block.querySelectorAll('.pagination-trigger').forEach(el => el.classList.add('is-disable'));
    if (!inner) return;

    inner.style.transition = 'none'; inner.offsetHeight; inner.style.transition = '';

    if (action === 'replace') {
      inner.style.minHeight = inner.offsetHeight + 'px';
      inner.style.opacity = '0.05';
      const loader = document.createElement('i');
      loader.className = 'rb-loader loader-absolute';
      inner.insertAdjacentElement('afterend', loader);
    } else {
      const btn = block.querySelector('.loadmore-trigger');
      if (btn) btn.classList.add('loading');
      const loader = block.querySelector('.rb-loader');
      if (loader) { loader.style.display = 'block'; requestAnimationFrame(() => loader.style.opacity = '1'); }
    }
  };

  Module.ajaxTriggerState = function (block, uuid) {
    block.querySelectorAll('.pagination-trigger').forEach(el => el.classList.remove('is-disable'));
    const data = this.ajaxData[uuid];
    if (!data) return;
    if (parseInt(data.paged, 10) < 2) {
      const prev = block.querySelector('[data-type="prev"]'); if (prev) prev.classList.add('is-disable');
    }
    if (parseInt(data.paged, 10) >= parseInt(data.page_max, 10)) {
      const next = block.querySelector('[data-type="next"]'); if (next) next.classList.add('is-disable');
      const lm = block.querySelector('.loadmore-trigger'); if (lm) { lm.classList.add('is-disable'); hide(lm); }
      const inf = block.querySelector('.pagination-infinite'); if (inf) { inf.classList.add('is-disable'); hide(inf); }
    }
  };

  Module.ajaxRenderHTML = function (block, uuid, response, action) {
    const inner = block.querySelector('.block-inner');
    if (!inner) return;

    const res = parseMaybeJSON(response);
    block.querySelectorAll('.pagination-trigger').forEach(el => el.classList.remove('is-disable'));

    if (!res.content || res.content.trim() === '') {
      console.warn('admin-ajax returned empty content.', { uuid, raw: typeof response === 'string' ? response : '(object)', parsed: res });
    }

    if (action === 'replace') {
      inner.innerHTML = res.content || '';
      const absLoader = block.querySelector('.rb-loader.loader-absolute');
      if (absLoader) absLoader.remove();
      inner.style.minHeight = '';
      inner.style.opacity = '1';
    } else {
      const tmp = document.createElement('div');
      tmp.innerHTML = res.content || '';
      const nodes = Array.from(tmp.childNodes);
      nodes.forEach(n => {
        if (n.nodeType === 1) {
          n.classList.add('is-invisible', 'opacity-animate');
          inner.appendChild(n);
          setTimeout(() => n.classList.remove('is-invisible'), 200);
        }
      });
      const loader = block.querySelector('.rb-loader');
      if (loader) { loader.style.opacity = '0'; setTimeout(() => { loader.style.display = 'none'; }, 200); }
      const btn = block.querySelector('.loadmore-trigger');
      if (btn) btn.classList.remove('loading');
    }

    this.ajaxTriggerState(block, uuid);
    if (this.ajaxData[uuid]) this.ajaxData[uuid].processing = false;

    // Optional theme hook
    if (typeof this.reloadBlockFunc === 'function') {
      try { this.reloadBlockFunc(); } catch {}
    }
  };

  /* =============== Pagination actions =============== */
  Module.paginationNextPrev = function () {
    delegate(document, '.pagination-trigger', 'click', async (e, btn) => {
      e.preventDefault(); e.stopPropagation();
      if (btn.classList.contains('is-disable')) return;

      const block = btn.closest('.block-wrap'); if (!block) return;
      const uuid = block.id; if (!uuid) return;

      if (!this.ajaxData[uuid]) this.ajaxData[uuid] = this.getBlockSettings(uuid);
      if (this.ajaxData[uuid]?.processing) return;
      this.ajaxData[uuid].processing = true;

      const type = btn.dataset.type; // 'next' | 'prev'
      this.ajaxStartAnimation(block, 'replace');

      if (!this.ajaxData[uuid].paged) this.ajaxData[uuid].paged = 1;
      this.ajaxData[uuid].page_next = parseInt(this.ajaxData[uuid].paged, 10) + (type === 'prev' ? -1 : 1);

      try {
        const resText = await callAdminAjax('rblivep', this.ajaxData[uuid]);
        const response = parseMaybeJSON(resText);
        if (typeof response.paged !== 'undefined') this.ajaxData[uuid].paged = response.paged;
        this.ajaxRenderHTML(block, uuid, response, 'replace');
      } catch (err) {
        console.error('paginationNextPrev error:', err);
        this.ajaxData[uuid].processing = false;
        const absLoader = block.querySelector('.rb-loader.loader-absolute'); if (absLoader) absLoader.remove();
      }
    });
  };

  Module.paginationLoadMore = function () {
    delegate(document, '.loadmore-trigger', 'click', async (e, btn) => {
      e.preventDefault(); e.stopPropagation();
      if (btn.classList.contains('is-disable')) return;

      const block = btn.closest('.block-wrap'); if (!block) return;
      const uuid = block.id; if (!uuid) return;

      if (!this.ajaxData[uuid]) this.ajaxData[uuid] = this.getBlockSettings(uuid);
      if (this.ajaxData[uuid]?.processing) return;
      this.ajaxData[uuid].processing = true;

      this.ajaxStartAnimation(block, 'append');

      if (!this.ajaxData[uuid].paged) this.ajaxData[uuid].paged = 1;
      if (parseInt(this.ajaxData[uuid].paged, 10) >= parseInt(this.ajaxData[uuid].page_max, 10)) { this.ajaxData[uuid].processing = false; return; }
      this.ajaxData[uuid].page_next = parseInt(this.ajaxData[uuid].paged, 10) + 1;

      try {
        const resText = await callAdminAjax('rblivep', this.ajaxData[uuid]);
        const response = parseMaybeJSON(resText);
        if (typeof response.paged !== 'undefined') this.ajaxData[uuid].paged = response.paged;
        if (typeof response.notice !== 'undefined') response.content = (response.content || '') + response.notice;
        this.ajaxRenderHTML(block, uuid, response, 'append');
      } catch (err) {
        console.error('paginationLoadMore error:', err);
        this.ajaxData[uuid].processing = false;
        const loader = block.querySelector('.rb-loader'); if (loader) { loader.style.opacity='0'; setTimeout(()=> loader.style.display='none', 200); }
        btn.classList.remove('loading');
      }
    });
  };

  Module.paginationInfinite = function () {
    const triggers = $$('.pagination-infinite');
    if (!triggers.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach(async (entry) => {
        if (!entry.isIntersecting) return;
        const btn = entry.target;
        if (btn.classList.contains('is-disable')) return;

        const block = btn.closest('.block-wrap'); if (!block) return;
        const uuid = block.id; if (!uuid) return;

        if ((block.classList.contains('is-hoz-scroll') ||
             block.classList.contains('is-mhoz-scroll') ||
             block.classList.contains('is-thoz-scroll')) && window.outerWidth < 1025) {
          btn.classList.add('is-disable'); return;
        }

        if (!this.ajaxData[uuid]) this.ajaxData[uuid] = this.getBlockSettings(uuid);
        if (this.ajaxData[uuid]?.processing) return;

        this.ajaxData[uuid].processing = true;
        this.ajaxStartAnimation(block, 'append');

        if (!this.ajaxData[uuid].paged) this.ajaxData[uuid].paged = 1;
        if (parseInt(this.ajaxData[uuid].paged, 10) >= parseInt(this.ajaxData[uuid].page_max, 10)) { this.ajaxData[uuid].processing = false; return; }
        this.ajaxData[uuid].page_next = parseInt(this.ajaxData[uuid].paged, 10) + 1;

        try {
          const resText = await callAdminAjax('rblivep', this.ajaxData[uuid]);
          const response = parseMaybeJSON(resText);
          if (typeof response.paged !== 'undefined') this.ajaxData[uuid].paged = response.paged;
          if (typeof response.notice !== 'undefined') response.content = (response.content || '') + response.notice;
          this.ajaxRenderHTML(block, uuid, response, 'append');
        } catch (err) {
          console.error('paginationInfinite error:', err);
          this.ajaxData[uuid].processing = false;
          const loader = block.querySelector('.rb-loader'); if (loader) { loader.style.opacity='0'; setTimeout(()=> loader.style.display='none', 200); }
        }
      });
    }, { rootMargin: '0px 0px 200px 0px' });

    triggers.forEach(t => io.observe(t));
  };

  /* =============== Single: Infinite Load Next (article) =============== */
  Module.singleInfiniteLoadNext = function () {
    const wrapper = document.querySelector('#single-post-infinite');
    const point   = document.querySelector('#single-infinite-point');
    if (!wrapper || !point) return;

    const loader = point.querySelector('.rb-loader');
    const rootURL = new URL(window.location.href);
    const rootParams = rootURL.searchParams;

    const max = Module.themeSettings?.singleLoadNextLimit ? parseInt(Module.themeSettings.singleLoadNextLimit, 10) : 20;
    let count = 0;
    Module.ajaxData.singleProcessing = false;

    const io = new IntersectionObserver(async (entries) => {
      const ent = entries[0];
      if (!ent.isIntersecting) return;
      if (Module.ajaxData.singleProcessing) return;
      if (count >= max) { io.unobserve(point); return; }

      const baseNext = wrapper.getAttribute('data-nextposturl');
      if (!baseNext) { io.unobserve(point); point.remove(); return; }

      const nextURL = new URL(baseNext, window.location.origin);
      nextURL.searchParams.set('rbsnp','1');
      rootParams.forEach((v,k) => { if (k !== 'rbsnp' && k !== 'p') nextURL.searchParams.set(k, v); });

      Module.ajaxData.singleProcessing = true;
      if (loader) { loader.style.display='block'; requestAnimationFrame(()=> loader.style.opacity='1'); }

      try {
        const html = await (await fetch(nextURL.toString(), { credentials:'same-origin' })).text();
        const tmp  = document.createElement('div');
        tmp.innerHTML = html;
        const nextOuter = tmp.querySelector('.single-post-outer');
        if (!nextOuter) {
          wrapper.removeAttribute('id');
          if (point) point.remove();
          io.disconnect();
          return;
        }

        const nextPostURL = nextOuter.getAttribute('data-nextposturl');
        if (nextPostURL) {
          wrapper.setAttribute('data-nextposturl', nextPostURL);
        } else {
          wrapper.removeAttribute('id');
          if (point) point.remove();
          io.disconnect();
        }

        if (loader) { loader.style.opacity='0'; setTimeout(()=> loader.style.display='none', 200); }

        wrapper.appendChild(nextOuter);
        Module.ajaxData.singleProcessing = false;
        count++;

        setTimeout(() => {
          if (typeof Module.reInitAll === 'function') Module.reInitAll();
          if (typeof window.FOXIZ_CORE_SCRIPT !== 'undefined' && window.FOXIZ_CORE_SCRIPT) {
            try { FOXIZ_CORE_SCRIPT.loadGoogleAds(nextOuter); } catch(e){}
            try { FOXIZ_CORE_SCRIPT.loadInstagram(nextOuter); } catch(e){}
            try { FOXIZ_CORE_SCRIPT.loadTwttr(); } catch(e){}
          }
        }, 1);

      } catch (err) {
        console.error('singleInfiniteLoadNext error:', err);
        if (loader) { loader.style.opacity='0'; setTimeout(()=> loader.style.display='none', 200); }
        Module.ajaxData.singleProcessing = false;
      }
    }, { rootMargin: '0px 0px 200px 0px' });

    io.observe(point);
  };

  /* =============== Public init =============== */
  Module.initPagination = function () {
    this.paginationNextPrev();
    this.paginationLoadMore();
    this.paginationInfinite();
    this.singleInfiniteLoadNext();
  };

  // Auto-init after DOM ready (safe if loaded anywhere)
  document.addEventListener('DOMContentLoaded', function () {
    if (window.FOXIZ_MAIN_SCRIPT && window.FOXIZ_MAIN_SCRIPT.initPagination) {
      window.FOXIZ_MAIN_SCRIPT.initPagination();
    }
  });

})(window.FOXIZ_MAIN_SCRIPT = window.FOXIZ_MAIN_SCRIPT || {});
