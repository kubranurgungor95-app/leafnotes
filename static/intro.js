// LeafNotes - karşılama (intro) ekranı
// 3 kısa slayt gösterir (Welcome -> What it hears -> Before you record), sonra siteyi açar.
// İlk ziyarette otomatik açılır; sağ alttaki "?" butonuyla tekrar açılabilir.
// Dil: EN / TR (ilk açılışta tarayıcı diline göre, seçim hatırlanır).

(function () {
    'use strict';

    var SEEN_KEY = 'leafnotes_intro_seen';
    var LANG_KEY = 'leafnotes_lang';
    var TOTAL = 3;

    // ---------- Çizimler (sahne renklerine uygun, sabit SVG) ----------
    var ART = [
        // 1) Telefon: mikrofon alt kenarda, altta ses kaynağı
        '<svg viewBox="0 0 220 158" aria-hidden="true" focusable="false">' +
            '<rect x="85" y="4" width="50" height="98" rx="10" fill="rgba(255,255,255,0.45)" stroke="#5c2c16" stroke-width="2.5"/>' +
            '<rect x="91" y="13" width="38" height="76" rx="4" fill="rgba(176,134,47,0.16)"/>' +
            '<circle class="intro-mic-ring" cx="110" cy="102" r="7" fill="none" stroke="#b0862f" stroke-width="2"/>' +
            '<circle cx="110" cy="102" r="3.2" fill="#b0862f"/>' +
            '<path d="M86 118 Q110 107 134 118" fill="none" stroke="#b0862f" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/>' +
            '<path d="M93 126 Q110 118 127 126" fill="none" stroke="#b0862f" stroke-width="2.5" stroke-linecap="round" opacity="0.65"/>' +
            '<path d="M100 134 Q110 129 120 134" fill="none" stroke="#b0862f" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>' +
            '<text x="110" y="152" text-anchor="middle" font-size="22" fill="#b0862f">\u266A</text>' +
        '</svg>',

        // 2) Tek nota (olur) / akor (olmaz)
        '<svg viewBox="0 0 220 104" aria-hidden="true" focusable="false">' +
            '<ellipse cx="40" cy="80" rx="9.5" ry="6.5" transform="rotate(-20 40 80)" fill="#4a220b"/>' +
            '<line x1="48.5" y1="77" x2="48.5" y2="30" stroke="#4a220b" stroke-width="2.6" stroke-linecap="round"/>' +
            '<path d="M68 52 l8 9 l17 -21" fill="none" stroke="#5a7d3a" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<line x1="110" y1="14" x2="110" y2="92" stroke="rgba(139,90,43,0.35)" stroke-width="1.5" stroke-dasharray="3 4"/>' +
            '<ellipse cx="140" cy="84" rx="9.5" ry="6.5" transform="rotate(-20 140 84)" fill="#4a220b"/>' +
            '<ellipse cx="140" cy="70" rx="9.5" ry="6.5" transform="rotate(-20 140 70)" fill="#4a220b"/>' +
            '<ellipse cx="140" cy="56" rx="9.5" ry="6.5" transform="rotate(-20 140 56)" fill="#4a220b"/>' +
            '<line x1="148.5" y1="81" x2="148.5" y2="30" stroke="#4a220b" stroke-width="2.6" stroke-linecap="round"/>' +
            '<path d="M172 44 l18 18 M190 44 l-18 18" fill="none" stroke="#a33a2a" stroke-width="4.5" stroke-linecap="round"/>' +
        '</svg>',

        // 3) 30 saniyelik kronometre
        '<svg viewBox="0 0 220 104" aria-hidden="true" focusable="false">' +
            '<rect x="103" y="4" width="14" height="7" rx="2" fill="#5c2c16"/>' +
            '<circle cx="110" cy="56" r="38" fill="rgba(255,255,255,0.4)" stroke="#5c2c16" stroke-width="3"/>' +
            '<path d="M110 22 A34 34 0 1 1 76 56" fill="none" stroke="#b0862f" stroke-width="4" stroke-linecap="round"/>' +
            '<text x="110" y="65" text-anchor="middle" font-size="26" font-weight="700" fill="#4a220b" font-family="Georgia, serif">30s</text>' +
        '</svg>'
    ];

    // ---------- Metinler ----------
    var TEXT = {
        en: {
            next: 'Next',
            start: 'Start',
            skip: 'Skip',
            help: 'Tips for the best result',
            step: 'Step',
            slides: [
                {
                    title: 'Welcome to LeafNotes',
                    lead: 'Sing, hum or play, and watch your sound turn into sheet music.',
                    tip: 'For the best result, hold the bottom edge of your phone (where the microphone is) close to the sound.',
                    items: ['Pick a quiet spot, with no background music or noise.']
                },
                {
                    title: 'What it can hear',
                    items: [
                        'One note at a time. Melodies work great, but chords (several notes together) can\u2019t be told apart.',
                        'Voice, whistle, flute, clarinet, violin\u2026 and piano or guitar when you play single notes.',
                        'Made for Western tuning (12 semitones). In-between notes, like in Turkish makam music, are rounded to the nearest note.',
                        'Very low or very high sounds (outside about G3\u2013G6) aren\u2019t detected.'
                    ]
                },
                {
                    title: 'Before you record',
                    items: [
                        'Recording stops by itself after 30 seconds.',
                        'Play each note clearly and for a similar length. A steady rhythm gives better results.',
                        'Tap Allow when your browser asks for the microphone. Your recording is only analyzed, never stored.'
                    ],
                    note: 'Results are an approximation, not a perfect transcription.'
                }
            ]
        },
        tr: {
            next: '\u0130leri',
            start: 'Ba\u015fla',
            skip: 'Ge\u00e7',
            help: 'En iyi sonu\u00e7 i\u00e7in ipu\u00e7lar\u0131',
            step: 'Ad\u0131m',
            slides: [
                {
                    title: 'LeafNotes\u2019a ho\u015f geldin',
                    lead: 'S\u00f6yle, m\u0131r\u0131ldan ya da \u00e7al; sesinin notalara d\u00f6n\u00fc\u015fmesini izle.',
                    tip: 'En iyi sonu\u00e7 i\u00e7in telefonunun alt kenar\u0131n\u0131 (mikrofonun oldu\u011fu yer) sese yakla\u015ft\u0131r.',
                    items: ['Sessiz bir yer se\u00e7, arkada m\u00fczik ya da g\u00fcr\u00fclt\u00fc olmas\u0131n.']
                },
                {
                    title: 'Neleri duyabilir?',
                    items: [
                        'Ayn\u0131 anda tek ses. Melodiler \u00e7ok iyi \u00e7al\u0131\u015f\u0131r, ama akorlar (birden fazla ses ayn\u0131 anda) ay\u0131rt edilemez.',
                        'Ses, \u0131s\u0131k, fl\u00fct, klarnet, keman\u2026 ve notalar\u0131 tek tek \u00e7ald\u0131\u011f\u0131nda piyano ile gitar.',
                        'Bat\u0131 ses sistemi (12 yar\u0131m ses) i\u00e7in tasarland\u0131. T\u00fcrk makam m\u00fczi\u011findeki gibi ara sesler en yak\u0131n notaya yuvarlan\u0131r.',
                        '\u00c7ok pes ya da \u00e7ok tiz sesler (yakla\u015f\u0131k G3\u2013G6 d\u0131\u015f\u0131nda) alg\u0131lanmaz.'
                    ]
                },
                {
                    title: 'Kay\u0131ttan \u00f6nce',
                    items: [
                        'Kay\u0131t 30 saniye sonra kendili\u011finden durur.',
                        'Her notay\u0131 net ve benzer uzunlukta \u00e7al. D\u00fczenli bir ritim daha iyi sonu\u00e7 verir.',
                        'Taray\u0131c\u0131 mikrofon izni sorunca \u0130zin ver\u2019e bas. Kayd\u0131n yaln\u0131zca analiz edilir, saklanmaz.'
                    ],
                    note: 'Sonu\u00e7lar yakla\u015f\u0131kt\u0131r, kusursuz bir transkripsiyon de\u011fildir.'
                }
            ]
        }
    };

    // ---------- Yardımcılar ----------
    function load(key) {
        try { return window.localStorage.getItem(key); } catch (e) { return null; }
    }

    function save(key, value) {
        try { window.localStorage.setItem(key, value); } catch (e) { /* depolama kapalı olabilir */ }
    }

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    function pickLang() {
        var stored = load(LANG_KEY);
        if (stored === 'en' || stored === 'tr') return stored;
        var nav = (navigator.language || 'en').toLowerCase();
        return nav.indexOf('tr') === 0 ? 'tr' : 'en';
    }

    var lang = pickLang();
    var index = 0;
    var lastFocus = null;

    // ---------- Yapı ----------
    var overlay = el('div');
    overlay.id = 'introOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'introTitle');

    var card = el('div', 'intro-card');

    var langBox = el('div', 'intro-lang');
    langBox.setAttribute('role', 'group');
    langBox.setAttribute('aria-label', 'Language');
    var langButtons = {};
    ['en', 'tr'].forEach(function (code) {
        var b = el('button', '', code.toUpperCase());
        b.type = 'button';
        b.addEventListener('click', function () {
            lang = code;
            save(LANG_KEY, code);
            render();
        });
        langButtons[code] = b;
        langBox.appendChild(b);
    });

    var body = el('div', 'intro-body');

    var dotsBox = el('div', 'intro-dots');
    var dots = [];
    for (var i = 0; i < TOTAL; i++) {
        (function (n) {
            var d = el('button');
            d.type = 'button';
            d.addEventListener('click', function () {
                index = n;
                render();
            });
            dots.push(d);
            dotsBox.appendChild(d);
        })(i);
    }

    var actions = el('div', 'intro-actions');
    var skipBtn = el('button', 'intro-skip');
    skipBtn.type = 'button';
    var nextBtn = el('button', 'intro-next');
    nextBtn.type = 'button';
    actions.appendChild(skipBtn);
    actions.appendChild(nextBtn);

    card.appendChild(langBox);
    card.appendChild(body);
    card.appendChild(dotsBox);
    card.appendChild(actions);
    overlay.appendChild(card);

    var helpBtn = el('button', '', '?');
    helpBtn.id = 'introHelpBtn';
    helpBtn.type = 'button';

    // ---------- Çizim ----------
    function render() {
        var t = TEXT[lang];
        var s = t.slides[index];

        body.textContent = '';
        var slide = el('div', 'intro-slide');

        var art = el('div', 'intro-art');
        art.innerHTML = ART[index]; // sabit, kendi yazdığımız SVG
        slide.appendChild(art);

        var h = el('h2', '', s.title);
        h.id = 'introTitle';
        slide.appendChild(h);

        if (s.lead) slide.appendChild(el('p', 'intro-lead', s.lead));
        if (s.tip) slide.appendChild(el('div', 'intro-tip', s.tip));

        if (s.items && s.items.length) {
            var ul = el('ul', 'intro-list');
            s.items.forEach(function (text) { ul.appendChild(el('li', '', text)); });
            slide.appendChild(ul);
        }

        if (s.note) slide.appendChild(el('p', 'intro-note', s.note));
        body.appendChild(slide);

        dots.forEach(function (d, n) {
            d.className = n === index ? 'active' : '';
            d.setAttribute('aria-label', t.step + ' ' + (n + 1) + ' / ' + TOTAL);
        });

        var isLast = index === TOTAL - 1;
        nextBtn.textContent = isLast ? t.start : t.next;
        skipBtn.textContent = t.skip;
        skipBtn.className = 'intro-skip' + (isLast ? ' is-hidden' : '');

        Object.keys(langButtons).forEach(function (code) {
            langButtons[code].setAttribute('aria-pressed', code === lang ? 'true' : 'false');
        });

        helpBtn.setAttribute('aria-label', t.help);
        helpBtn.title = t.help;
    }

    // ---------- Aç / kapat ----------
    function openIntro() {
        lastFocus = document.activeElement;
        index = 0;
        render();
        overlay.classList.add('open');
        setTimeout(function () { nextBtn.focus(); }, 60);
    }

    function closeIntro() {
        overlay.classList.remove('open');
        save(SEEN_KEY, '1');
        if (lastFocus && typeof lastFocus.focus === 'function') {
            try { lastFocus.focus(); } catch (e) { /* önemsiz */ }
        }
    }

    nextBtn.addEventListener('click', function () {
        if (index >= TOTAL - 1) {
            closeIntro();
        } else {
            index += 1;
            render();
        }
    });

    skipBtn.addEventListener('click', closeIntro);
    helpBtn.addEventListener('click', openIntro);

    document.addEventListener('keydown', function (e) {
        if (!overlay.classList.contains('open')) return;

        if (e.key === 'Escape') {
            closeIntro();
            return;
        }

        if (e.key === 'Tab') {
            var focusable = card.querySelectorAll('button');
            var visible = [];
            for (var k = 0; k < focusable.length; k++) {
                if (!focusable[k].classList.contains('is-hidden')) visible.push(focusable[k]);
            }
            if (!visible.length) return;
            var first = visible[0];
            var last = visible[visible.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });

    // ---------- Başlat ----------
    document.body.appendChild(overlay);
    document.body.appendChild(helpBtn);
    render();

    // İlk ziyarette otomatik aç
    if (load(SEEN_KEY) !== '1') {
        setTimeout(openIntro, 300);
    }
})();
