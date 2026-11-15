import os

import numpy as np
import librosa
from flask import Flask, request, jsonify
from flask_cors import CORS

# Sayfayı (index.html, script.js, style.css, görseller) da Flask sunar.
# Yayında frontend ve API aynı adreste çalıştığı için CORS gerekmez.
app = Flask(__name__, static_folder='static', static_url_path='')

# Sadece yerel geliştirme için: sayfayı Live Server (örn. 127.0.0.1:5500) ya da
# dosya olarak açarsan da API'ye ulaşabil. Yayındaki alan adların bu listede değil.
CORS(app, origins=[r"http://127\.0\.0\.1(:\d+)?", r"http://localhost(:\d+)?", "null"])

# Çok büyük yüklemeleri reddet (20 MB)
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024

# ---------------------------------------------------------------
# Ayarlar
# Perde algılama mantığı SENİN ORİJİNAL kodunla aynıdır:
#   pyin -> güvenilir kareler -> 3'lü gruplar -> medyan frekans -> en yakın nota
# Yalnızca nota adı üretimi (bemol) ve süre hesabı eklendi.
# ---------------------------------------------------------------
LOW_NOTE = 'G3'          # algılama alt sınırı (orijinal: G3)
HIGH_NOTE = 'G6'         # algılama üst sınırı (orijinal: G6)
MIDI_MIN = 55            # G3
MIDI_MAX = 91            # G6

FRAME_LENGTH = 2048      # pyin varsayılanı
HOP_LENGTH = 512         # pyin varsayılanı (frame_length // 4)
VOICED_PROB_MIN = 0.65   # orijinal eşik
CHUNK = 3                # orijinal: 3 kare bir grup
MAX_NOTES = 128

MAX_SECONDS = 35         # herkese açık sitede sunucuyu korumak için kayıt süresi sınırı
SR_MIN, SR_MAX = 8000, 96000  # makul örnekleme hızı aralığı

USE_DURATIONS = True     # False yaparsan tüm notalar çeyrek nota çizilir

SOLFEGE_FLAT = ['Do', 'Re♭', 'Re', 'Mi♭', 'Mi', 'Fa', 'Sol♭', 'Sol', 'La♭', 'La', 'Si♭', 'Si']
VEX_FLAT = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b']

# Süre değerleri (vuruş -> VexFlow süresi)
BEAT_VALUES = [(0.5, '8'), (1.0, 'q'), (2.0, 'h'), (4.0, 'w')]


def hz_to_midi_int(hz):
    """librosa.hz_to_midi ile aynı formül, en yakın tam sayıya yuvarlanır."""
    return int(round(69.0 + 12.0 * np.log2(hz / 440.0)))


def midi_to_note(midi):
    """MIDI numarasını bemol tabanlı nota adına çevirir (librosa sürümünden bağımsız)."""
    if midi < MIDI_MIN or midi > MIDI_MAX:
        return None
    pc = midi % 12
    octave = midi // 12 - 1
    return {
        "vexflow": f"{VEX_FLAT[pc]}/{octave}",
        "solfege": SOLFEGE_FLAT[pc],
    }


def detect_notes(f0, voiced_flag, voiced_probs, sr):
    """Orijinal algılama: güvenilir kareleri 3'lü gruplayıp medyan frekanstan nota bulur.
    Her nota için başlangıç/bitiş zamanı (saniye) da tutulur."""
    notes = []
    frame_dt = HOP_LENGTH / float(sr)

    valid_indices = np.where(
        (voiced_flag == True) &
        (voiced_probs > VOICED_PROB_MIN) &
        np.isfinite(f0)
    )[0]

    for i in range(0, len(valid_indices), CHUNK):
        indices = valid_indices[i:i + CHUNK]
        chunk = f0[indices]

        if len(chunk) == 0:
            continue

        stable_hz = np.nanmedian(chunk)
        if not np.isfinite(stable_hz) or stable_hz <= 0:
            continue

        note = midi_to_note(hz_to_midi_int(stable_hz))
        if note is None:
            continue

        start = indices[0] * frame_dt
        end = (indices[-1] + 1) * frame_dt

        if not notes or note["vexflow"] != notes[-1]["vexflow"]:
            note["start"] = round(float(start), 3)
            note["end"] = round(float(end), 3)
            notes.append(note)
        else:
            # Aynı nota devam ediyor: sadece bitiş zamanını uzat
            notes[-1]["end"] = round(float(end), 3)

    return notes


def add_durations(notes):
    """Sadece nota sürelerini ekler; hangi notaların algılandığını DEĞİŞTİRMEZ.
    Notalar arası sürenin medyanı 'bir vuruş' (çeyrek nota) kabul edilir."""
    if not notes:
        return notes

    if not USE_DURATIONS:
        for n in notes:
            n["duration"], n["beats"] = 'q', 1.0
        return notes

    starts = np.array([n["start"] for n in notes], dtype=float)
    ends = np.array([n["end"] for n in notes], dtype=float)

    iois = np.empty(len(notes))
    iois[:-1] = starts[1:] - starts[:-1]
    iois[-1] = ends[-1] - starts[-1]

    unit = float(np.median(iois)) if len(iois) >= 2 else float(iois[0])
    unit = max(unit, 1e-3)  # sıfıra bölmeyi önler; hızlı çalınan eşit notalar da çeyrek sayılır

    for n, ioi in zip(notes, iois):
        beats, dur = min(BEAT_VALUES, key=lambda bv: abs(bv[0] - ioi / unit))
        n["duration"] = dur
        n["beats"] = beats

    return notes


@app.route('/')
def home():
    return app.send_static_file('index.html')


@app.errorhandler(413)
def too_large(_e):
    return jsonify({"notes": [], "error": "Ses dosyası çok büyük."}), 413


@app.route('/analyze-audio', methods=['POST'])
def analyze_audio():
    try:
        if 'audio_data' not in request.files:
            return jsonify({"notes": [], "error": "Ses dosyası gönderilmedi."}), 400

        raw_bytes = request.files['audio_data'].read()

        if not raw_bytes:
            return jsonify({"notes": [], "error": "Ses dosyası boş."}), 400

        try:
            sr = int(float(request.form.get('sample_rate', 44100)))
        except (TypeError, ValueError):
            return jsonify({"notes": [], "error": "Örnekleme hızı geçersiz."}), 400

        if sr < SR_MIN or sr > SR_MAX:
            return jsonify({"notes": [], "error": "Örnekleme hızı geçersiz."}), 400

        # float32 için bayt sayısı 4'ün katı olmalı
        raw_bytes = raw_bytes[: len(raw_bytes) - (len(raw_bytes) % 4)]
        y = np.frombuffer(raw_bytes, dtype=np.float32)

        if len(y) == 0 or not np.all(np.isfinite(y)):
            return jsonify({"notes": [], "error": "Ses verisi geçersiz."}), 400

        # Süre sınırı: uzun kayıtlar pyin'i çok yavaşlatır
        duration_sec = len(y) / float(sr)
        if duration_sec > MAX_SECONDS:
            return jsonify({
                "notes": [],
                "error": f"Kayıt en fazla {MAX_SECONDS} saniye olabilir."
            }), 400

        y = librosa.util.normalize(y)

        f0, voiced_flag, voiced_probs = librosa.pyin(
            y,
            fmin=librosa.note_to_hz(LOW_NOTE),
            fmax=librosa.note_to_hz(HIGH_NOTE),
            sr=sr,
            frame_length=FRAME_LENGTH,
            hop_length=HOP_LENGTH
        )

        notes = []
        if f0 is not None and voiced_probs is not None:
            notes = detect_notes(f0, voiced_flag, voiced_probs, sr)

        notes = add_durations(notes[:MAX_NOTES])

        debug = {
            "frames": int(len(f0)) if f0 is not None else 0,
            "notes_found": len(notes),
            "sample_rate": sr,
            "seconds": round(duration_sec, 2),
        }
        app.logger.info("Analiz: %s", debug)

        return jsonify({"notes": notes, "debug": debug})

    except Exception:
        app.logger.exception("Ses analizi hatası")
        # İç hata ayrıntısını kullanıcıya göstermiyoruz, sadece loga yazıyoruz
        return jsonify({"notes": [], "error": "Analiz sırasında bir hata oluştu."}), 500


if __name__ == '__main__':
    print("AI Orkestra Backend Aktif (Port: 5000)")
    # Yayında gunicorn kullan:  gunicorn app:app --workers 1 --timeout 120
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)
