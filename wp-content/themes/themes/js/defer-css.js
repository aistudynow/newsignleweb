(function () {
    'use strict';

    var promoteStyles = function () {
        var links = document.querySelectorAll('link[data-defer-style]');
        if (!links.length) {
            return;
        }

        Array.prototype.forEach.call(links, function (link) {
            if (link.dataset.wd4Promoted === '1') {
                return;
            }

            var media = link.getAttribute('data-media');

            link.rel = 'stylesheet';
            link.removeAttribute('as');

            if (media) {
                link.setAttribute('media', media);
            } else {
                link.setAttribute('media', 'all');
            }

            link.removeAttribute('data-defer-style');
            link.removeAttribute('data-media');
            link.dataset.wd4Promoted = '1';
        });
    };

    var runOnce = (function () {
        var executed = false;
        return function () {
            if (executed) {
                return;
            }
            executed = true;
            promoteStyles();
        };
    })();

    var schedule = function () {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(runOnce, { timeout: 1500 });
        } else {
            window.setTimeout(runOnce, 200);
        }
    };

    if (document.readyState === 'complete') {
        schedule();
    } else {
        window.addEventListener('load', runOnce);
        schedule();
    }
})();
