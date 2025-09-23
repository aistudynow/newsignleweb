(function (global) {
    'use strict';

    var doc = global.document;
    if (!doc) {
        return;
    }

    var Lazy = global.FOXIZ_LAZY || {};
    var config = global.wd4LazyLoader || {};

    var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
    var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };
    var on = function (el, type, fn, opts) { if (el) { el.addEventListener(type, fn, opts || false); } };
    var off = function (el, type, fn) { if (el) { el.removeEventListener(type, fn); } };

    function guessVideoMime(url) {
        if (!url) return '';
        var clean = url.split('#')[0].split('?')[0];
        var dot = clean.lastIndexOf('.');
        if (dot === -1) return '';
        var ext = clean.slice(dot + 1).toLowerCase();
        var map = {
            mp4: 'video/mp4',
            m4v: 'video/mp4',
            webm: 'video/webm',
            ogv: 'video/ogg',
            ogg: 'video/ogg',
            mov: 'video/quicktime'
        };
        return map[ext] || '';
    }

    var ytFacadeData = new WeakMap();
    var ytPreconnected = false;

    function ensureYoutubePreconnect() {
        if (ytPreconnected) return;
        var head = doc.head || doc.getElementsByTagName('head')[0];
        if (!head) return;
        var origins = [
            'https://www.youtube.com',
            'https://www.google.com',
            'https://i.ytimg.com',
            'https://s.ytimg.com'
        ];
        origins.forEach(function (href) {
            if (!head.querySelector('link[rel="preconnect"][href="' + href + '"]')) {
                var link = doc.createElement('link');
                link.rel = 'preconnect';
                link.href = href;
                link.crossOrigin = 'anonymous';
                head.appendChild(link);
            }
        });
        ytPreconnected = true;
    }

    function extractYoutubeId(url) {
        if (!url) return '';
        try {
            var base = global.location && global.location.href ? global.location.href : undefined;
            var parsed = new URL(url, base);
            var host = (parsed.hostname || '').replace(/^www\./, '');
            if (host === 'youtu.be') {
                var parts = parsed.pathname.split('/').filter(Boolean);
                return parts[0] || '';
            }
            if (parsed.searchParams && parsed.searchParams.get('v')) {
                return parsed.searchParams.get('v');
            }
            var pathMatch = parsed.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/);
            if (pathMatch && pathMatch[1]) return pathMatch[1];
        } catch (err) {
            /* noop */
        }
        var fallback = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:embed|shorts)\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
        if (fallback && fallback[1]) return fallback[1];
        var idFromQuery = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
        return idFromQuery ? idFromQuery[1] : '';
    }

    function buildYoutubeThumb(id) {
        return id ? 'https://i.ytimg.com/vi/' + id + '/maxresdefault.jpg' : '';
    }

    function buildYoutubeFallbackThumb(id) {
        return id ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : '';
    }

    function addAutoplayParam(url) {
        if (!url) return '';
        if (/[?&]autoplay=1/i.test(url)) return url;
        var hashIndex = url.indexOf('#');
        var hash = hashIndex > -1 ? url.slice(hashIndex) : '';
        var base = hashIndex > -1 ? url.slice(0, hashIndex) : url;
        var joiner = base.indexOf('?') > -1 ? '&' : '?';
        return base + joiner + 'autoplay=1' + hash;
    }

    function loadIconFont() {
        var fontUrl = typeof config.iconFontUrl === 'string' ? config.iconFontUrl : '';
        if (!fontUrl) {
            return;
        }

        var fontFamily = typeof config.iconFontFamily === 'string' && config.iconFontFamily ? config.iconFontFamily : 'ruby-icon';
        var styleId = typeof config.styleId === 'string' && config.styleId ? config.styleId : 'wd4-icon-font-face';
        var timeout = typeof config.timeout === 'number' && config.timeout >= 0 ? config.timeout : 1200;
        var fallbackDelay = typeof config.fallbackDelay === 'number' && config.fallbackDelay >= 0 ? config.fallbackDelay : 120;

        var hasFont = function () {
            if (!doc.fonts || !doc.fonts.check) {
                return false;
            }
            try {
                return doc.fonts.check('1em ' + fontFamily);
            } catch (err) {
                return false;
            }
        };

        if (hasFont()) {
            return;
        }

        var buildFontFace = function (url) {
            return "@font-face{" +
                "font-family:'" + fontFamily + "';" +
                "font-style:normal;" +
                "font-weight:400;" +
                "font-display:swap;" +
                "src:url('" + url + "') format('woff2');" +
                "}";
        };

        var inject = function () {
            if (doc.getElementById(styleId)) {
                return;
            }

            var style = doc.createElement('style');
            style.id = styleId;
            style.textContent = buildFontFace(fontUrl);

            var target = doc.head || doc.documentElement;
            if (!target) {
                return;
            }

            target.appendChild(style);

            if (doc.fonts && doc.fonts.load) {
                doc.fonts.load('1em ' + fontFamily).catch(function () { /* ignore */ });
            }
        };

        var schedule = global.requestIdleCallback ?
            function (cb) {
                global.requestIdleCallback(cb, { timeout: timeout });
            } :
            function (cb) {
                global.setTimeout(cb, fallbackDelay);
            };

        var kickoff = function () {
            schedule(inject);
        };

        if (doc.readyState === 'loading') {
            doc.addEventListener('DOMContentLoaded', kickoff, { once: true });
        } else {
            kickoff();
        }
    }

    Lazy.loadIconFont = loadIconFont;

    Lazy.prepareInlineVideos = function () {
        var figures = $$('.wp-block-video');
        if (!figures.length) return;

        figures.forEach(function (figure) {
            var video = figure.querySelector('video');
            if (!video || video.classList.contains('js-lazy-video') || video.dataset.lazyPrepared === 'true') {
                return;
            }

            var fallbackVideo = video.cloneNode(true);
            fallbackVideo.classList.remove('js-lazy-video');
            fallbackVideo.removeAttribute('data-preload');
            fallbackVideo.removeAttribute('data-loaded');
            fallbackVideo.removeAttribute('data-lazy-prepared');
            fallbackVideo.removeAttribute('data-src');
            fallbackVideo.setAttribute('preload', 'metadata');
            fallbackVideo.setAttribute('playsinline', '');
            if (!fallbackVideo.hasAttribute('controls')) {
                fallbackVideo.setAttribute('controls', '');
            }
            fallbackVideo.querySelectorAll('source').forEach(function (sourceEl) {
                var origSrc = sourceEl.getAttribute('src') || sourceEl.getAttribute('data-src');
                if (origSrc) sourceEl.setAttribute('src', origSrc);
                sourceEl.removeAttribute('data-src');
            });
            if (!fallbackVideo.getAttribute('src')) {
                var firstFallbackSource = fallbackVideo.querySelector('source');
                if (firstFallbackSource && firstFallbackSource.getAttribute('src')) {
                    fallbackVideo.setAttribute('src', firstFallbackSource.getAttribute('src'));
                }
            }

            var originalSources = $$('source', video);
            var directSrc = video.getAttribute('src');
            var preloadPref = video.getAttribute('data-preload') || video.getAttribute('preload') || 'metadata';

            if (originalSources.length) {
                originalSources.forEach(function (sourceEl) {
                    var srcVal = sourceEl.getAttribute('src') || sourceEl.getAttribute('data-src');
                    if (!srcVal) return;
                    sourceEl.setAttribute('data-src', srcVal);
                    sourceEl.removeAttribute('src');
                    if (!sourceEl.getAttribute('type')) {
                        var guessed = guessVideoMime(srcVal);
                        if (guessed) sourceEl.setAttribute('type', guessed);
                    }
                });
            } else if (directSrc) {
                while (video.firstChild) video.removeChild(video.firstChild);
                var sourceEl = doc.createElement('source');
                sourceEl.setAttribute('data-src', directSrc);
                var guessed = guessVideoMime(directSrc);
                if (guessed) sourceEl.setAttribute('type', guessed);
                video.appendChild(sourceEl);
            }

            video.removeAttribute('src');
            video.setAttribute('data-preload', preloadPref || 'metadata');
            video.setAttribute('preload', 'none');
            video.setAttribute('playsinline', '');
            if (!video.hasAttribute('controls')) video.setAttribute('controls', '');
            video.classList.add('js-lazy-video');
            video.dataset.lazyPrepared = 'true';
            video.dataset.lazyBound = 'false';

            var noscript = figure.querySelector('noscript');
            if (!noscript) {
                noscript = doc.createElement('noscript');
                figure.appendChild(noscript);
            }
            noscript.innerHTML = fallbackVideo.outerHTML;
        });
    };

    Lazy.prepareYoutubeEmbeds = function () {
        var figures = $$('.wp-block-embed.wp-block-embed-youtube');
        if (!figures.length) return;

        figures.forEach(function (figure) {
            if (!figure || figure.dataset.ytPrepared === 'true') return;
            var wrapper = figure.querySelector('.wp-block-embed__wrapper');
            var iframe = wrapper && wrapper.querySelector('iframe');
            if (!wrapper || !iframe) return;

            var src = iframe.getAttribute('src') || iframe.dataset.src || '';
            var videoId = extractYoutubeId(src);
            if (!videoId) {
                iframe.setAttribute('loading', 'lazy');
                return;
            }

            var title = iframe.getAttribute('title') || figure.getAttribute('data-title') || '';
            var iframeClone = iframe.cloneNode(true);
            var originalAllow = iframeClone.getAttribute('allow') || '';
            if (originalAllow) {
                if (!/autoplay/i.test(originalAllow)) {
                    iframeClone.setAttribute('allow', originalAllow + '; autoplay');
                }
            } else {
                iframeClone.setAttribute(
                    'allow',
                    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                );
            }
            iframeClone.setAttribute('loading', 'lazy');
            if (!iframeClone.getAttribute('referrerpolicy')) {
                iframeClone.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
            }
            if (!iframeClone.hasAttribute('allowfullscreen')) {
                iframeClone.setAttribute('allowfullscreen', '');
            }
            if (title && !iframeClone.getAttribute('title')) {
                iframeClone.setAttribute('title', title);
            }
            iframeClone.removeAttribute('src');
            iframeClone.removeAttribute('width');
            iframeClone.removeAttribute('height');

            var embedData = { iframe: iframeClone, src: src, title: title, id: videoId };

            try {
                iframe.src = 'about:blank';
            } catch (err) {
                /* ignore */
            }
            iframe.removeAttribute('src');
            iframe.remove();

            var facade = doc.createElement('button');
            facade.type = 'button';
            facade.className = 'yt-facade';
            facade.dataset.videoId = videoId;
            if (title) {
                facade.setAttribute('aria-label', 'Play video: ' + title);
            } else {
                facade.setAttribute('aria-label', 'Play video');
            }

             


              var thumbWrap = doc.createElement('span');
            thumbWrap.className = 'yt-facade__thumb';
            var thumbImg = doc.createElement('img');
            thumbImg.src = buildYoutubeThumb(videoId);
            thumbImg.loading = 'lazy';
            thumbImg.decoding = 'async';
            thumbImg.alt = '';
            thumbImg.setAttribute('aria-hidden', 'true');
            thumbImg.draggable = false;
            var fallbackThumb = buildYoutubeFallbackThumb(videoId);
            if (fallbackThumb && fallbackThumb !== thumbImg.src) {
                var handleThumbError;
                var handleThumbLoad;
                var switchToFallback = function () {
                    if (thumbImg.dataset.ytFallback === '1') {
                        return;
                    }
                    thumbImg.dataset.ytFallback = '1';
                    thumbImg.src = fallbackThumb;
                    thumbImg.removeEventListener('error', handleThumbError);
                    thumbImg.removeEventListener('load', handleThumbLoad);
                };
                handleThumbError = function () {
                    switchToFallback();
                };
                handleThumbLoad = function () {
                    if (thumbImg.dataset.ytFallback === '1') {
                        thumbImg.removeEventListener('load', handleThumbLoad);
                        return;
                    }
                    if ((thumbImg.naturalHeight && thumbImg.naturalHeight <= 90) ||
                        (thumbImg.naturalWidth && thumbImg.naturalWidth <= 160)) {
                        switchToFallback();
                    }
                };
                thumbImg.addEventListener('error', handleThumbError);
                thumbImg.addEventListener('load', handleThumbLoad);
            }





            thumbWrap.appendChild(thumbImg);




            var playIcon = doc.createElement('span');
            playIcon.className = 'yt-facade__icon';
            playIcon.setAttribute('aria-hidden', 'true');

            facade.appendChild(thumbWrap);
            facade.appendChild(playIcon);

            wrapper.innerHTML = '';
            wrapper.classList.add('has-yt-facade');
            wrapper.appendChild(facade);
            figure.classList.add('has-yt-facade');
            figure.dataset.ytPrepared = 'true';

            ytFacadeData.set(facade, embedData);
        });
    };

    Lazy.lazyLoadVideos = function () {
        var videos = $$('.js-lazy-video');
        if (!videos.length) return;

        var loadVideo = function (video) {
            if (!video || video.dataset.loaded === 'true') return;
            var dataPoster = video.dataset.poster;
            if (dataPoster && !video.poster) video.poster = dataPoster;
            var sources = $$('source[data-src]', video);
            if (sources.length) {
                sources.forEach(function (source) {
                    source.src = source.dataset.src || '';
                    source.removeAttribute('data-src');
                });
            } else {
                var dataSrc = video.dataset.src;
                if (dataSrc) {
                    video.src = dataSrc;
                    video.removeAttribute('data-src');
                }
            }
            var preloadPref = video.dataset.preload || 'metadata';
            video.preload = preloadPref;
            video.setAttribute('preload', preloadPref);
            if (typeof video.load === 'function') {
                video.load();
            }
            video.dataset.loaded = 'true';
        };

        var watchVideo = function (video) {
            if (video.dataset.lazyBound === 'true') return;
            video.dataset.lazyBound = 'true';
            var intentHandler = function () { loadVideo(video); };
            ['play', 'pointerenter', 'touchstart', 'focus', 'click', 'mouseover'].forEach(function (evt) {
                on(video, evt, intentHandler, { once: true });
            });
        };

        videos.forEach(function (video) { watchVideo(video); });

        if ('IntersectionObserver' in global) {
            var observer = new IntersectionObserver(function (entries, obs) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting || entry.intersectionRatio > 0) {
                        loadVideo(entry.target);
                        obs.unobserve(entry.target);
                    }
                });
            }, { rootMargin: '200px 0px' });

            videos.forEach(function (video) { observer.observe(video); });
        } else {
            videos.forEach(function (video) { loadVideo(video); });
        }
    };

    Lazy.lazyLoadYoutubeEmbeds = function () {
        var facades = $$('.yt-facade');
        if (!facades.length) return;

        var preconnect = function (facade) {
            if (!facade || facade.dataset.preconnected === 'true') return;
            ensureYoutubePreconnect();
            facade.dataset.preconnected = 'true';
        };

        var loadIframe = function (facade, autoplay) {
            if (!facade || facade.dataset.loaded === 'true') return;
            var data = ytFacadeData.get(facade);
            if (!data || !data.iframe) return;
            var wrapper = facade.parentElement;
            if (!wrapper) return;

            preconnect(facade);

            var iframe = data.iframe;
            var src = autoplay ? addAutoplayParam(data.src) : data.src;
            if (src) {
                iframe.setAttribute('src', src);
            }

            wrapper.classList.remove('has-yt-facade');
            wrapper.innerHTML = '';
            wrapper.appendChild(iframe);
            wrapper.classList.add('yt-embed-loaded');
            facade.dataset.loaded = 'true';
            ytFacadeData.delete(facade);

            global.setTimeout(function () {
                try {
                    iframe.focus();
                } catch (err) {
                    /* ignore */
                }
            }, 30);
        };

        var observer = 'IntersectionObserver' in global
            ? new IntersectionObserver(function (entries, obs) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting || entry.intersectionRatio > 0) {
                        preconnect(entry.target);
                        obs.unobserve(entry.target);
                    }
                });
            }, { rootMargin: '400px 0px' })
            : null;

        facades.forEach(function (facade) {
            if (facade.dataset.ytBound === 'true') return;
            facade.dataset.ytBound = 'true';

            on(facade, 'click', function (e) {
                e.preventDefault();
                loadIframe(facade, true);
            });

            on(facade, 'keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    loadIframe(facade, true);
                }
            });

            ['pointerenter', 'touchstart', 'focus'].forEach(function (evt) {
                on(facade, evt, function () { preconnect(facade); }, { once: true });
            });

            if (observer) {
                observer.observe(facade);
            } else {
                preconnect(facade);
            }
        });
    };

    Lazy.lazyLoadScripts = function () {
        var selectors = '[data-lazy-script-src]';
        var placeholders = $$(selectors);
        if (!placeholders.length) return;

        var loadedAttr = 'lazyScriptLoaded';
        var boundAttr = 'lazyScriptBound';
        var observer = null;

        function insertBeforeScript(scriptEl, html) {
            if (!scriptEl || !html) return;
            var parent = scriptEl.parentNode;
            if (!parent) return;

            var container = doc.createElement('div');
            container.innerHTML = html;

            while (container.firstChild) {
                var node = container.firstChild;
                container.removeChild(node);

                if (node.nodeType === 1 && node.tagName && node.tagName.toLowerCase() === 'script') {
                    var replacement = doc.createElement('script');
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
            var localDoc = doc;
            if (!localDoc || typeof localDoc.write !== 'function') return null;

            var originalWrite = localDoc.write;
            var originalWriteln = localDoc.writeln;
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

            localDoc.write = function (content) {
                handleWrite(String(content));
            };

            localDoc.writeln = function (content) {
                handleWrite(String(content) + '\n');
            };

            return {
                flush: flushQueue,
                release: function () {
                    flushQueue();
                    localDoc.write = originalWrite;
                    localDoc.writeln = originalWriteln;
                }
            };
        }

        function loadScript(el) {
            if (!el || el.dataset[loadedAttr] === '1') return;

            var src = el.getAttribute('data-lazy-script-src');
            if (!src) return;

            el.dataset[loadedAttr] = '1';

            var script = doc.createElement('script');
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
            if (scriptId && !doc.getElementById(scriptId)) script.id = scriptId;

            var targetSelector = el.getAttribute('data-lazy-script-target');
            var anchor = null;
            if (targetSelector) {
                try { anchor = doc.querySelector(targetSelector); }
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
            } else if (insertMode === 'body' && doc.body) {
                doc.body.appendChild(script);
                inserted = true;
            } else if (insertMode === 'head' && doc.head) {
                doc.head.appendChild(script);
                inserted = true;
            }

            if (!inserted) {
                var parent = doc.body || doc.head || doc.documentElement;
                parent.appendChild(script);
                inserted = true;
            }

            if (docWriteProxy && typeof docWriteProxy.flush === 'function' && inserted) {
                global.setTimeout(docWriteProxy.flush, 0);
            }

            global.setTimeout(releaseDocWrite, 15000);
        }

        function scheduleFallback(el) {
            var fallbackAttr = el.getAttribute('data-lazy-script-timeout');
            var fallbackDelay = parseInt(fallbackAttr, 10);
            if (isNaN(fallbackDelay) || fallbackDelay < 0) fallbackDelay = 10000;

            global.setTimeout(function () { loadScript(el); }, fallbackDelay);
        }

        function queue(el) {
            if (!el || el.dataset[boundAttr] === '1') return;
            el.dataset[boundAttr] = '1';

            if (observer) {
                observer.observe(el);
            } else {
                var onReady = function () {
                    off(global, 'load', onReady);
                    var delayAttr = el.getAttribute('data-lazy-script-delay');
                    var delay = parseInt(delayAttr, 10);
                    var runner = function () { loadScript(el); };

                    if (!isNaN(delay) && delay > 0) {
                        global.setTimeout(runner, delay);
                    } else if ('requestIdleCallback' in global) {
                        global.requestIdleCallback(function () { loadScript(el); }, { timeout: 2000 });
                    } else {
                        global.setTimeout(runner, 400);
                    }
                };

                if (doc.readyState === 'complete') onReady();
                else on(global, 'load', onReady);
            }

            scheduleFallback(el);
        }

        if ('IntersectionObserver' in global) {
            observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;

                    var target = entry.target;
                    observer.unobserve(target);

                    var delayAttr = target.getAttribute('data-lazy-script-delay');
                    var delay = parseInt(delayAttr, 10);
                    var execute = function () { loadScript(target); };

                    if (!isNaN(delay) && delay > 0) {
                        global.setTimeout(execute, delay);
                    } else if ('requestIdleCallback' in global) {
                        global.requestIdleCallback(function () { loadScript(target); }, { timeout: 2000 });
                    } else {
                        global.setTimeout(execute, 100);
                    }
                });
            }, { rootMargin: '200px 0px', threshold: 0 });
        }

        placeholders.forEach(queue);

        if ('MutationObserver' in global) {
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

            mo.observe(doc.body || doc.documentElement, { childList: true, subtree: true });
        }
    };

    Lazy.refreshMedia = function () {
        Lazy.prepareInlineVideos();
        Lazy.prepareYoutubeEmbeds();
        Lazy.lazyLoadVideos();
        Lazy.lazyLoadYoutubeEmbeds();
    };

    Lazy.init = function () {
        Lazy.refreshMedia();
        Lazy.lazyLoadScripts();
    };

    var bootstrapLazy = function () {
        Lazy.init();
    };

    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', bootstrapLazy, { once: true });
    } else {
        bootstrapLazy();
    }

    if (doc.addEventListener) {
        doc.addEventListener('foxiz:lazy-refresh', function () {
            Lazy.refreshMedia();
        });
        doc.addEventListener('foxiz:lazy-scripts', function () {
            Lazy.lazyLoadScripts();
        });
    }

    loadIconFont();

    global.FOXIZ_LAZY = Lazy;

}(typeof window !== 'undefined' ? window : this));