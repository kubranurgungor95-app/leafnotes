// LeafNotes - karşılama (intro) ekranı
// 3 kısa slayt gösterir (Welcome -> What it can hear -> Before you record), sonra siteyi açar.
// İlk ziyarette otomatik açılır; sağ alttaki "?" butonuyla tekrar açılabilir.
// Dil: EN / TR (ilk açılışta tarayıcı diline göre, seçim hatırlanır).

(function () {
    'use strict';

    var SEEN_KEY = 'leafnotes_intro_seen';
    var LANG_KEY = 'leafnotes_lang';
    var TOTAL = 3;

    // ---------- Çizimler (sahne renklerine uygun, sabit SVG) ----------
    // Birinci çizim dile göre etiket (Mic / Mikrofon) yazdığı için fonksiyon.
    var ART = [
        // 1) Ses insandan telefonun alt kenarına (mikrofona) gidiyor
        function () {
            return '<svg viewBox="0 0 300 190" style="width:270px;max-width:92%" aria-hidden="true" focusable="false">' +
                '<circle cx="46" cy="84" r="17" fill="none" stroke="#5c2c16" stroke-width="2.5"/>' +
                '<path d="M12 160 Q12 116 46 116 Q80 116 80 160" fill="none" stroke="#5c2c16" stroke-width="2.5"/>' +
                '<ellipse cx="62" cy="90" rx="3" ry="4" fill="#b0862f"/>' +
                '<path d="M92 76 Q102 90 92 104" fill="none" stroke="#b0862f" stroke-width="3" stroke-linecap="round"/>' +
                '<path d="M108 66 Q122 90 108 114" fill="none" stroke="#b0862f" stroke-width="3" stroke-linecap="round" opacity="0.8"/>' +
                '<path d="M124 56 Q142 90 124 124" fill="none" stroke="#b0862f" stroke-width="3" stroke-linecap="round" opacity="0.6"/>' +
                '<path d="M140 92 L172 106" fill="none" stroke="#b0862f" stroke-width="3" stroke-dasharray="5 5" stroke-linecap="round"/>' +
                '<path d="M164 96 L176 108 L160 112" fill="none" stroke="#b0862f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
                '<text x="100" y="52" font-size="24" fill="#b0862f">\u266A</text>' +
                '<g transform="translate(232 92) rotate(60)">' +
                    '<rect x="-24" y="-48" width="48" height="96" rx="9" fill="rgba(255,255,255,0.45)" stroke="#5c2c16" stroke-width="3"/>' +
                    '<rect x="-18" y="-38" width="36" height="66" rx="3" fill="rgba(176,134,47,0.16)"/>' +
                    '<rect x="-24" y="38" width="48" height="10" rx="5" fill="#b0862f" stroke="#5c2c16" stroke-width="3"/>' +
                    '<circle cx="-10" cy="43" r="1.6" fill="#5c2c16"/>' +
                    '<circle cx="-4" cy="43" r="1.6" fill="#5c2c16"/>' +
                    '<rect x="2" y="41.5" width="8" height="3" rx="1.5" fill="#5c2c16"/>' +
                    '<circle cx="14" cy="43" r="1.6" fill="#5c2c16"/>' +
                '</g>' +
                '<circle class="intro-mic-ring" cx="195" cy="113.5" r="9" fill="none" stroke="#b0862f" stroke-width="2"/>' +
                '<path d="M192 122 L170 158" fill="none" stroke="#5c2c16" stroke-width="1.5"/>' +
                '<text x="130" y="176" font-size="20" font-style="italic" font-weight="700" fill="#4a220b">' + TEXT[lang].mic + '</text>' +
            '</svg>';
        },

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
            mic: 'Mic',
            slides: [
                {
                    title: 'Welcome to LeafNotes',
                    lead: 'Play your instrument or sing. Aim the sound at the bottom of your phone, clear and loud.',
                    note: 'Pick a quiet spot.'
                },
                {
                    title: 'What it can hear',
                    items: [
                        'Single notes only. Melodies work great, chords don\u2019t.',
                        'Piano, guitar, flute, clarinet, violin, whistle, and voice, played one note at a time.',
                        'Made for Western tuning. Makam\u2019s in-between notes are rounded to the nearest note.',
                        'Very low or very high sounds aren\u2019t detected.'
                    ]
                },
                {
                    title: 'Before you record',
                    items: [
                        'Recording stops by itself after 30 seconds.',
                        'Tap Allow when your browser asks for the microphone. Your recording is only analyzed, never stored.'
                    ]
                }
            ]
        },
        tr: {
            next: '\u0130leri',
            start: 'Ba\u015fla',
            skip: 'Ge\u00e7',
            help: 'En iyi sonu\u00e7 i\u00e7in ipu\u00e7lar\u0131',
            step: 'Ad\u0131m',
            mic: 'Mikrofon',
            slides: [
                {
                    title: 'LeafNotes\u2019a ho\u015f geldin',
                    lead: 'Enstr\u00fcman\u0131n\u0131 \u00e7al ya da s\u00f6yle. Sesi telefonun alt kenar\u0131na do\u011fru, net ve y\u00fcksek ver.',
                    note: 'Sessiz bir yer se\u00e7.'
                },
                {
                    title: 'Ne duyabilir?',
                    items: [
                        'Sadece tek tek notalar. Ezgiler harika \u00e7al\u0131\u015f\u0131r, akorlar \u00e7al\u0131\u015fmaz.',
                        'Piyano, gitar, fl\u00fct, klarnet, keman, \u0131s\u0131k ve ses, tek tek notalarla.',
                        'Bat\u0131 m\u00fczi\u011fi ses d\u00fczeni i\u00e7in yap\u0131ld\u0131. Makamdaki koma sesleri en yak\u0131n notaya yuvarlan\u0131r.',
                        '\u00c7ok pes veya \u00e7ok tiz sesler alg\u0131lanmaz.'
                    ]
                },
                {
                    title: 'Kay\u0131ttan \u00f6nce',
                    items: [
                        '30 saniyede kendili\u011finden durur.',
                        'Taray\u0131c\u0131 mikrofon izni isteyince \u201c\u0130zin ver\u201de bas. Kay\u0131t saklanmaz, sadece analiz edilir.'
                    ]
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
        var drawing = ART[index];
        art.innerHTML = typeof drawing === 'function' ? drawing() : drawing; // sabit, kendi yazdığımız SVG
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
