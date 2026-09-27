/* =========================================================
   LOOK CLOSER — script.js
   Three quiet jobs:
     1. Rotate the background pages of the notebook.
     2. Reveal text gently as the visitor scrolls.
     3. Drift the background a few pixels, and no more.
   ========================================================= */

(function () {
    'use strict';

    /* -------------------------------------------------------
       CONFIG
       ------------------------------------------------------- */
    var CONFIG = {
        interval: 10000,  // ms between background crossfades
        threshold: 0.14,   // how much of an element must be visible to reveal
        parallax: 14      // max px of background drift (0 disables it)
    };

    var reduceMotion =
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;


    /* =======================================================
       1. BACKGROUND ROTATION
       Reads the image list from the HTML, so adding or removing
       a .background__layer is all it takes to change the set.
       ======================================================= */

    var layers = Array.prototype.slice.call(
        document.querySelectorAll('.background__layer')
    );

    function initBackgrounds() {
        if (!layers.length) return;

        var sources = layers.map(function (layer) {
            return layer.getAttribute('data-src');
        });

        var loaded = 0;
        var ready = false;
        var current = 0;
        var timer = null;

        /* --- Preload every image before showing anything ---------- */
        sources.forEach(function (src, i) {
            if (!src) { loaded++; return; }

            var img = new Image();

            img.onload = img.onerror = function () {
                // Apply the image once it is safely in the cache.
                layers[i].style.backgroundImage = 'url("' + src + '")';
                loaded++;
                if (loaded === sources.length) start();
            };

            img.src = src;
        });

        // Covers the edge case of zero usable sources.
        if (loaded === sources.length) start();

        /* --- Crossfade -------------------------------------------- */
        function show(index) {
            layers.forEach(function (layer, i) {
                layer.classList.toggle('is-active', i === index);
            });
        }

        function next() {
            current = (current + 1) % layers.length;
            show(current);
        }

        function start() {
            if (ready) return;
            ready = true;

            show(0);
            timer = window.setInterval(next, CONFIG.interval);
        }

        /* --- Pause while the tab is hidden ------------------------- */
        document.addEventListener('visibilitychange', function () {
            if (!ready) return;

            if (document.hidden) {
                window.clearInterval(timer);
                timer = null;
            } else if (!timer) {
                timer = window.setInterval(next, CONFIG.interval);
            }
        });
    }


    /* =======================================================
       2. REVEAL ON SCROLL
       A single gentle fade per element, then it is left alone.
       ======================================================= */

    function initReveal() {
        var items = Array.prototype.slice.call(
            document.querySelectorAll('[data-reveal]')
        );

        if (!items.length) return;

        // Graceful fallback for browsers without IntersectionObserver.
        if (!('IntersectionObserver' in window)) {
            items.forEach(function (el) { el.classList.add('is-visible'); });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);   // reveal once, then forget
            });
        }, {
            threshold: CONFIG.threshold,
            rootMargin: '0px 0px -6% 0px'
        });

        items.forEach(function (el) { observer.observe(el); });
    }


    /* =======================================================
       3. VERY SUBTLE PARALLAX
       The background is fixed, so this is a whisper of depth —
       a handful of pixels, tied to scroll, nothing more.
       ======================================================= */

    function initParallax() {
        if (reduceMotion || !CONFIG.parallax || !layers.length) return;

        var ticking = false;

        function update() {
            ticking = false;

            // Ramp over the first 400px of scroll, then hold.
            var progress = Math.min(window.scrollY, 400) / 400;
            var offset = progress * CONFIG.parallax;

            layers.forEach(function (layer) {
                // scale(1.08) keeps the edges covered while the layer drifts.
                layer.style.transform =
                    'translate3d(0,' + offset.toFixed(2) + 'px,0) scale(1.08)';
            });
        }

        function onScroll() {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(update);
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        update();
    }


    /* =======================================================
       4. BOOT
       ======================================================= */

    function init() {
        initBackgrounds();
        initReveal();
        initParallax();
        initYouTubeAudio();
        document.documentElement.classList.add('is-ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    /* =======================================================
         5. YOUTUBE BACKGROUND AUDIO + BUTTON
         Muted on load. The button is the only control.
         ======================================================= */

    var YT_VIDEO_ID = '0rZ-SRGfeWg';
    var YT_VOLUME = 30;                 // 0–100

    var ytPlayer = null;
    var ytReady = false;
    var ytWantsSound = false;             // user's intent


    function loadYouTubeAPI() {
        if (window.YT && window.YT.Player) {
            onYouTubeIframeAPIReady();
            return;
        }
        var tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        var first = document.getElementsByTagName('script')[0];
        first.parentNode.insertBefore(tag, first);
        window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
    }


    function onYouTubeIframeAPIReady() {
        ytPlayer = new YT.Player('yt-audio', {
            height: '1',
            width: '1',
            videoId: YT_VIDEO_ID,
            playerVars: {
                autoplay: 1,
                mute: 1,
                loop: 1,
                playlist: YT_VIDEO_ID,
                controls: 0,
                disablekb: 1,
                modestbranding: 1,
                rel: 0,
                playsinline: 1
            },
            events: {
                onReady: onYTReady,
                onStateChange: onYTStateChange
            }
        });
    }


    function onYTReady(event) {
        ytReady = true;
        event.target.mute();
        event.target.playVideo();
        syncSoundButton();
    }


    function onYTStateChange(event) {
        // Safety loop in case YouTube ignores the loop parameter
        if (event.data === 0) {            // 0 = ENDED
            event.target.playVideo();
        }
    }


    function setSound(on) {
        ytWantsSound = on;

        if (ytReady && ytPlayer) {
            if (on) {
                ytPlayer.unMute();
                ytPlayer.setVolume(YT_VOLUME);
                ytPlayer.playVideo();
            } else {
                ytPlayer.mute();
            }
        }
        syncSoundButton();
    }


    function syncSoundButton() {
        var btn = document.getElementById('sound-toggle');
        if (!btn) return;

        var on = ytWantsSound && ytReady;
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.setAttribute('aria-label',
            on ? 'Mute background music' : 'Play background music');
    }


    function initYouTubeAudio() {
        loadYouTubeAPI();

        var btn = document.getElementById('sound-toggle');
        if (!btn) return;

        btn.addEventListener('click', function () {
            var currentlyOn = btn.getAttribute('aria-pressed') === 'true';
            setSound(!currentlyOn);
        });
    }

})();