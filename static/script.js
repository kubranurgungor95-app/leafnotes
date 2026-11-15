// Sayfa Flask'tan (yayında ya da http://127.0.0.1:5000 üzerinden) açıldıysa göreli adres,
// Live Server (örn. :5500) ya da dosya olarak (file://) açıldıysa yerel Flask adresi kullanılır.
const IS_LOCAL_HOST = ['127.0.0.1', 'localhost'].includes(location.hostname);
const IS_FLASK_PORT = location.port === '5000';
const USE_LOCAL_BACKEND = location.protocol === 'file:' || (IS_LOCAL_HOST && !IS_FLASK_PORT);
const API_URL = USE_LOCAL_BACKEND ? 'http://127.0.0.1:5000/analyze-audio' : '/analyze-audio';
const RAW_MIC = false;
const MAX_RECORD_SECONDS = 30;   // kayıt bu süreyi geçerse otomatik durur

let mediaRecorder;
let audioChunks = [];
let audioContext;
let currentNotesData = [];
let autoStopTimer;

const recordBtn = document.getElementById('recordBtn');
const nightLayer = document.getElementById('nightLayer');
const aydinlikLayer = document.getElementById('aydinlikLayer');
const resultPanel = document.getElementById('resultPanel');
const staffOutput = document.getElementById('staffOutput');
const leavesContainer = document.getElementById('leavesContainer');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const solfegeOutput = document.getElementById('solfegeOutput');
const downloadBtn = document.getElementById('downloadBtn');
const downloadStaffBtn = document.getElementById('downloadStaffBtn');

// VexFlow süre kodu -> vuruş sayısı
const DUR_BEATS = { 'w': 4, 'h': 2, 'q': 1, '8': 0.5 };
const BEATS_PER_MEASURE = 4;

function startLeaves() {
    leavesContainer.innerHTML = "";
    for (let i = 0; i < 25; i++) {
        const leaf = document.createElement('div');
        leaf.classList.add('leaf');
        leaf.style.left = Math.random() * window.innerWidth + 'px';
        leaf.style.top = -20 + 'px';

        leaf.style.animationDuration = (Math.random() * 6 + 6) + 's';
        leaf.style.animationDelay = (Math.random() * 4) + 's';

        const colors = ['#ff7700', '#d4af37', '#b8380b', '#e6c229'];
        leaf.style.background = colors[Math.floor(Math.random() * colors.length)];

        leavesContainer.appendChild(leaf);
    }
}

// Notaları 4/4'lük ölçülere böler. Sığmayan nota, ölçüye sığacak kısa değere indirilir.
function splitIntoMeasures(notesArray) {
    const measures = [];
    let current = [];
    let used = 0;

    notesArray.forEach(item => {
        let noteObj = typeof item === 'object' ? item : { vexflow: item };
        let dur = DUR_BEATS[noteObj.duration] ? noteObj.duration : 'q';
        let beats = DUR_BEATS[dur];

        while (beats > BEATS_PER_MEASURE - used + 1e-9) {
            if (dur === 'w') dur = 'h';
            else if (dur === 'h') dur = 'q';
            else if (dur === 'q') dur = '8';
            else break;
            beats = DUR_BEATS[dur];
        }

        current.push({ note: noteObj, duration: dur });
        used += beats;

        if (used >= BEATS_PER_MEASURE - 1e-9) {
            measures.push(current);
            current = [];
            used = 0;
        }
    });

    if (current.length > 0) measures.push(current);
    return measures;
}

// Nota adından ("bb/3" gibi) MIDI numarası bulur
const LETTER_PC = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
function vexToMidi(vex) {
    const clean = String(vex).replace('♯', '#').replace('♭', 'b');
    const parts = clean.split('/');
    const name = parts[0];
    let pc = LETTER_PC[name.charAt(0)];
    if (name.length > 1 && name.charAt(1) === 'b') pc -= 1;
    else if (name.includes('#')) pc += 1;
    return (parseInt(parts[1] || '4', 10) + 1) * 12 + pc;
}

// Ölçüdeki notaların ortalaması C4'ün (MIDI 60) altındaysa fa anahtarı kullanılır
function pickClef(measure) {
    const midis = measure.map(m => vexToMidi(m.note.vexflow));
    const avg = midis.reduce((a, b) => a + b, 0) / midis.length;
    return avg < 60 ? 'bass' : 'treble';
}

// Hata / bilgi mesajını panelde gösterir ve butonları gizler
function showMessage(text, color) {
    staffOutput.innerHTML = "";
    const p = document.createElement('p');
    p.style.cssText = "font-size:15px; text-align:center; color:" + (color || '#555') + ";";
    p.textContent = text;
    staffOutput.appendChild(p);

    staffOutput.style.display = 'block';
    solfegeOutput.style.display = 'none';
    nextBtn.style.display = 'none';
    prevBtn.style.display = 'none';
    downloadBtn.style.display = 'none';
    downloadStaffBtn.style.display = 'none';
}

// Notaları scale(0.82) ile küçültüp ölçü ölçü portelere yerleştiren fonksiyon
function renderNotesOnStaff(notesArray) {
    staffOutput.innerHTML = "";
    solfegeOutput.style.display = 'none';
    prevBtn.style.display = 'none';
    downloadBtn.style.display = 'none';
    staffOutput.style.display = 'block';
    nextBtn.style.display = 'block';
    downloadStaffBtn.style.display = 'block';

    staffOutput.style.maxHeight = '240px';
    staffOutput.style.overflowY = 'auto';
    staffOutput.style.overflowX = 'hidden';

    if (!notesArray || notesArray.length === 0) {
        staffOutput.innerHTML = "<p style='font-size:15px; color:#555; text-align:center;'>Note not detected.</p>";
        downloadStaffBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        return;
    }

    try {
        const VF = Vex.Flow;

        const measures = splitIntoMeasures(notesArray);
        const totalStaves = measures.length;

        const ROW_PITCH = 120;  // porteler arası dikey mesafe
        const TOP_PAD = 50;     // üstteki ek çizgiler için boşluk
        let svgWidth = 340;
        let svgHeight = totalStaves * ROW_PITCH + TOP_PAD;

        const renderer = new VF.Renderer(staffOutput, VF.Renderer.Backends.SVG);
        renderer.resize(svgWidth, svgHeight);

        const context = renderer.getContext();
        context.scale(0.82, 0.82);

        let svgElement = staffOutput.querySelector('svg');
        if (svgElement) {
            svgElement.style.width = '100%';
            svgElement.style.height = 'auto';
            svgElement.style.display = 'block';
            svgElement.style.margin = '0 auto';
        }

        for (let s = 0; s < totalStaves; s++) {
            let yPos = TOP_PAD + (s * ROW_PITCH);
            const stave = new VF.Stave(10, yPos / 0.82, 320);

            const clef = pickClef(measures[s]);
            stave.addClef(clef);
            if (s === 0) {
                stave.addTimeSignature("4/4");
            }
            stave.setContext(context).draw();

            const staveNotes = measures[s].map(({ note, duration }) => {
                let rawNote = note.vexflow;

                let cleanRaw = rawNote.replace('♯', '#').replace('♭', 'b');
                let parts = cleanRaw.split('/');
                let noteName = parts[0];
                let octave = parts[1] || "4";

                let baseLetter = noteName.charAt(0);
                let accidentalSymbol = "";

                if (noteName.length > 1 && noteName.charAt(1) === 'b') {
                    accidentalSymbol = "b";
                } else if (noteName.includes('#')) {
                    accidentalSymbol = "#";
                }

                let cleanKey = `${baseLetter}/${octave}`;

                let staveNote = new VF.StaveNote({
                    clef: clef,
                    keys: [cleanKey],
                    duration: duration,
                    auto_stem: true
                });

                if (accidentalSymbol) {
                    staveNote.addModifier(new VF.Accidental(accidentalSymbol), 0);
                }

                return staveNote;
            });

            VF.Formatter.FormatAndDraw(context, stave, staveNotes);
        }

    } catch (e) {
        console.error("VexFlow Rendering Error:", e);
        let textFallback = notesArray.map(n => typeof n === 'object' ? n.vexflow.toUpperCase() : n).join(' - ');
        staffOutput.innerHTML = "<p style='font-size:15px; color:#5c2c16; font-weight:bold; text-align:center;'>Notes: " + textFallback + "</p>";
    }
}

function formatSolfegeText(item) {
    if (!item) return "";
    let solfegeStr = typeof item === 'object' ? (item.solfege || "") : String(item);
    return solfegeStr.replace('#', '♯').replace(/(?<=[a-zA-Z])b$/, '♭');
}

function formatSolfegeHtml(item) {
    const text = formatSolfegeText(item);
    if (!text) return "";
    let octave = "";
    if (item && typeof item === 'object' && item.vexflow) {
        const parts = String(item.vexflow).split('/');
        if (parts[1]) octave = '<sub style="font-size:0.7em; font-weight:normal;">' + parts[1] + '</sub>';
    }
    return text + octave;
}

function downloadStaffAsPDF() {
    if (!currentNotesData || currentNotesData.length === 0) return;

    let svgElement = staffOutput.querySelector('svg');
    let svgContent = svgElement ? svgElement.outerHTML : "<p>Staff data not found.</p>";

    let printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>OrkestraApp - Staff Report</title>
                <style>
                    body { font-family: 'Georgia', serif; padding: 40px; color: #3b220c; background: #fffdf0; text-align: center; }
                    h2 { color: #5c2c16; border-bottom: 2px solid #8b5a2b; padding-bottom: 10px; margin-bottom: 30px; }
                    .staff-container { display: inline-block; padding: 20px; border: 1px solid #d4af37; border-radius: 8px; background: rgba(255, 248, 220, 0.6); }
                    svg { max-width: 100%; height: auto; }
                </style>
            </head>
            <body>
                <h2>🎵 OrkestraApp - Staff Report</h2>
                <div class="staff-container">
                    ${svgContent}
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
}

function downloadSolfegeAsPDF() {
    if (!currentNotesData || currentNotesData.length === 0) return;

    let solfegeList = currentNotesData.map(n => formatSolfegeHtml(n)).join(' - ');

    let printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>OrkestraApp - Solfege Report</title>
                <style>
                    body { font-family: 'Georgia', serif; padding: 40px; color: #3b220c; background: #fffdf0; }
                    h2 { text-align: center; color: #5c2c16; border-bottom: 2px solid #8b5a2b; padding-bottom: 10px; }
                    .section { margin-top: 25px; padding: 15px; border: 1px solid #d4af37; border-radius: 8px; background: rgba(255, 248, 220, 0.5); }
                    .title { font-weight: bold; font-size: 16px; margin-bottom: 10px; color: #4a220b; }
                    .content { font-size: 15px; line-height: 1.6; word-break: break-word; }
                </style>
            </head>
            <body>
                <h2>🎵 OrkestraApp - Solfege Report</h2>
                <div class="section">
                    <div class="title">Solfege Sequence:</div>
                    <div class="content">${solfegeList}</div>
                </div>
                <div class="section" style="margin-top: 15px;">
                    <div class="title">Technical Note Data (VexFlow):</div>
                    <div class="content">${currentNotesData.map(n => n.vexflow + ' (' + (n.duration || 'q') + ')').join(', ')}</div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
}

downloadStaffBtn.addEventListener('click', downloadStaffAsPDF);
downloadBtn.addEventListener('click', downloadSolfegeAsPDF);

nextBtn.addEventListener('click', () => {
    if (currentNotesData && currentNotesData.length > 0) {
        let solfegeBadges = currentNotesData.map(n => {
            let formattedSolfege = formatSolfegeHtml(n);
            // Solfej kutucukları style.css içindeki .solfege-badge sınıfından geliyor
            return '<span class="solfege-badge">' + formattedSolfege + '</span>';
        }).join('');

        staffOutput.style.display = 'none';
        nextBtn.style.display = 'none';
        downloadStaffBtn.style.display = 'none';

        solfegeOutput.innerHTML = '<div class="solfege-title">🎵 Solfege Notes:</div><div class="solfege-grid">' + solfegeBadges + '</div>';
        solfegeOutput.style.display = 'block';
        downloadBtn.style.display = 'block';
        prevBtn.style.display = 'block';
    }
});

prevBtn.addEventListener('click', () => {
    solfegeOutput.style.display = 'none';
    downloadBtn.style.display = 'none';
    prevBtn.style.display = 'none';

    staffOutput.style.display = 'block';
    nextBtn.style.display = 'block';
    downloadStaffBtn.style.display = 'block';
});

// Kaydı durdurur (hem butondan hem otomatik süre dolunca kullanılır)
function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state !== "recording") return;

    clearTimeout(autoStopTimer);
    mediaRecorder.stop();
    recordBtn.classList.remove('recording');
    recordBtn.disabled = true;

    nightLayer.classList.add('daylight');
}

recordBtn.addEventListener('click', async () => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        audioChunks = [];
        solfegeOutput.style.display = 'none';
        downloadBtn.style.display = 'none';
        downloadStaffBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        prevBtn.style.display = 'none';

        aydinlikLayer.classList.remove('active');
        nightLayer.classList.remove('daylight');
        leavesContainer.innerHTML = "";

        try {
            const stream = await navigator.mediaDevices.getUserMedia(
                RAW_MIC
                    ? { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } }
                    : { audio: true }
            );
            audioContext = new (window.AudioContext || window.webkitAudioContext)();

            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

            mediaRecorder.onstop = async () => {
                recordBtn.innerText = "Analyzing...";

                stream.getTracks().forEach(t => t.stop());

                try {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const arrayBuffer = await audioBlob.arrayBuffer();
                    const decodedAudio = await audioContext.decodeAudioData(arrayBuffer);
                    const channelData = decodedAudio.getChannelData(0);

                    const formData = new FormData();
                    formData.append('audio_data', new Blob([channelData.buffer]));
                    formData.append('sample_rate', decodedAudio.sampleRate);

                    const response = await fetch(API_URL, {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();

                    if (!response.ok || data.error) {
                        // Sunucudan gelen hata mesajını göster
                        currentNotesData = [];
                        showMessage(data.error || "Analysis failed. Please try again.", '#a33');
                    } else {
                        currentNotesData = data.notes || [];
                        if (data.debug) console.log('Analysis summary:', data.debug);
                        renderNotesOnStaff(currentNotesData);

                        aydinlikLayer.classList.add('active');
                        startLeaves();
                    }

                } catch (err) {
                    console.error(err);
                    currentNotesData = [];
                    showMessage("Server connection error!", 'red');
                } finally {
                    // Her kayıtta yeni AudioContext açıldığı için işi bitince kapatıyoruz
                    try { audioContext.close(); } catch (e) { /* zaten kapalı */ }
                }

                resultPanel.classList.add('visible');
                recordBtn.innerText = "Click For Record";
                recordBtn.disabled = false;
            };

            mediaRecorder.start();
            recordBtn.classList.add('recording');
            recordBtn.innerText = "Stop Record";
            resultPanel.classList.remove('visible');

            // Süre dolunca otomatik durdur
            autoStopTimer = setTimeout(stopRecording, MAX_RECORD_SECONDS * 1000);

        } catch (err) {
            console.error(err);
            alert("Microphone permission denied!");
        }

    } else {
        stopRecording();
    }
});
