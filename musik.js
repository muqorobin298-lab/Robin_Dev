/* ============================================================
   MUSIK BLEACH - pemutar musik untuk semua halaman Robin
   Pasang di halaman mana pun dengan satu baris sebelum </body>:

   <script src="https://muqorobin298-lab.github.io/Robin_Dev/musik.js"></script>

   Pilihan (opsional, tulis di tag script yang sama):
     data-posisi="atas"   -> kotak di pojok kanan ATAS (default: kanan bawah)
     data-masuk="tidak"   -> tanpa layar "Klik untuk masuk"
     data-base="https://..../"  -> alamat folder tempat file lagu berada
                                    (default: folder tempat musik.js ini berada)

   Lagu: taruh file di folder yang sama dengan musik.js, lalu isi daftar LAGU di bawah.
   Posisi lagu, jeda/putar, bisu, dan kotak tersembunyi diingat saat pindah halaman
   (selama halamannya di alamat github.io yang sama).
   ============================================================ */
(function () {
  "use strict";
  if (window.__musikBleach) return;
  window.__musikBleach = true;

  var skrip = document.currentScript;
  function attr(n, d) { var v = skrip && skrip.getAttribute("data-" + n); return v == null || v === "" ? d : v; }
  var BASE = attr("base", skrip && skrip.src ? skrip.src.replace(/[^\/]*$/, "") : "");
  var DI_ATAS = attr("posisi", "bawah") === "atas";
  var LAYAR_MASUK = attr("masuk", "ya") !== "tidak";

  // ===== DAFTAR LAGU (nama file relatif terhadap BASE) =====
  var LAGU = [
    { judul: "Tokyo Revengers", file: "tokyo-revengers.mp3.mpeg" },
    { judul: "AOT Opening 1",   file: "aot-opening-1.mp3" },
    { judul: "AOT Season 2",    file: "aot-season-2.mp3" }
  ];

  var KUNCI = "musikBleach";
  var EKS = ["mp3", "m4a", "mp4", "webm", "ogg", "wav", "aac", "mp3.mpeg", "mpeg"];

  function mulaiSemua() {
    // ---------- tampilan ----------
    var css =
      "#mb-musik{position:fixed;right:14px;" + (DI_ATAS ? "top:14px;" : "bottom:14px;") + "z-index:9000;display:flex;align-items:center;gap:6px;" +
      "max-width:calc(100vw - 28px);background:rgba(8,8,18,0.88);border:2px solid var(--accent,#ff6a00);padding:6px 8px;" +
      "transition:transform .35s ease,border-color 1s;font-family:'Anton',Impact,sans-serif}" +
      "#mb-musik.mb-sembunyi{transform:translateX(calc(100% - 38px))}" +
      "#mb-musik button{font-family:'Anton',Impact,sans-serif;font-size:16px;line-height:1;cursor:pointer;width:34px;height:34px;" +
      "background:rgba(0,0,0,0.4);color:#f5f5f5;border:2px solid #f5f5f5;transition:all .2s;padding:0;margin:0}" +
      "#mb-musik button:hover{background:var(--accent,#ff6a00);border-color:var(--accent,#ff6a00);color:#000}" +
      "#mb-musik .mb-tutup{width:26px;background:transparent;border-color:transparent;color:var(--accent,#ff6a00)}" +
      "#mb-musik .mb-judul{font-size:13px;letter-spacing:2px;text-transform:uppercase;color:var(--accent,#ff6a00);width:150px;overflow:hidden;white-space:nowrap;transition:color 1s}" +
      "#mb-musik .mb-judul span{display:inline-block;padding-left:100%;animation:mb-geser 12s linear infinite}" +
      "#mb-musik.mb-diam .mb-judul span{animation:none;padding-left:0}" +
      "@keyframes mb-geser{to{transform:translateX(-100%)}}" +
      "#mb-masuk{position:fixed;top:0;left:0;right:0;bottom:0;z-index:9001;cursor:pointer;display:flex;flex-direction:column;align-items:center;" +
      "justify-content:center;gap:14px;text-align:center;background:rgba(8,8,18,0.88);transition:opacity .4s ease;padding:20px}" +
      "#mb-masuk .mb-m1{font-family:'Anton',Impact,sans-serif;font-size:clamp(34px,9vw,72px);letter-spacing:4px;text-transform:uppercase;color:#f5f5f5;" +
      "border-bottom:4px solid var(--accent,#ff6a00);padding-bottom:8px;animation:mb-denyut 1.4s ease-in-out infinite}" +
      "#mb-masuk .mb-m2{font-family:Arial,sans-serif;font-size:14px;letter-spacing:3px;text-transform:uppercase;color:var(--accent,#ff6a00)}" +
      "@keyframes mb-denyut{50%{opacity:.55}}" +
      "@media (max-width:520px){#mb-musik .mb-judul{width:90px}}" +
      "@media (prefers-reduced-motion:reduce){#mb-musik .mb-judul span,#mb-masuk .mb-m1{animation:none}}";
    var gaya = document.createElement("style"); gaya.textContent = css; document.head.appendChild(gaya);

    var box = document.createElement("div");
    box.id = "mb-musik"; box.className = "mb-diam";
    box.innerHTML =
      '<button class="mb-tutup" title="Sembunyikan / tampilkan" aria-label="Sembunyikan atau tampilkan pemutar">&#9654;</button>' +
      '<div class="mb-judul"><span>Musik</span></div>' +
      '<button class="mb-prev" title="Sebelumnya" aria-label="Sebelumnya">&#9198;</button>' +
      '<button class="mb-play" title="Putar / Jeda" aria-label="Putar atau jeda">&#9654;</button>' +
      '<button class="mb-next" title="Berikutnya" aria-label="Berikutnya">&#9197;</button>' +
      '<button class="mb-mute" title="Bisukan" aria-label="Bisukan">&#128266;</button>';
    document.body.appendChild(box);
    var q = function (c) { return box.querySelector(c); };
    var bTutup = q(".mb-tutup"), elJudul = q(".mb-judul span"), bPrev = q(".mb-prev"), bPlay = q(".mb-play"), bNext = q(".mb-next"), bMute = q(".mb-mute");

    // ---------- status ----------
    var audio = new Audio(); audio.preload = "auto"; audio.volume = 0.6;
    var idx = 0, main = false, ingin = true, menunggu = false, sembunyi = false, bisu = false, mulaiBaru = true;
    var pernahSembunyi = false, seek = 0, gagalBeruntun = 0, catat = [], sudahSingkir = false, timerSingkir = null, masuk = null, terakhirSimpan = 0;

    function baca() { try { return JSON.parse(localStorage.getItem(KUNCI) || "null"); } catch (e) { return null; } }
    function simpan(paksa) {
      var n = Date.now();
      if (!paksa && n - terakhirSimpan < 1000) return;
      terakhirSimpan = n;
      try { localStorage.setItem(KUNCI, JSON.stringify({ i: idx, t: audio.currentTime || 0, on: ingin, m: bisu, h: sembunyi, ts: n })); } catch (e) { /* abaikan */ }
    }
    var s0 = baca();
    if (s0 && typeof s0.i === "number" && s0.i >= 0 && s0.i < LAGU.length) {
      mulaiBaru = false; idx = s0.i; bisu = !!s0.m; sembunyi = !!s0.h; ingin = s0.on !== false;
      seek = (s0.t || 0) + (ingin && s0.ts ? Math.min(5, (Date.now() - s0.ts) / 1000) : 0);
      sudahSingkir = true;   // pakai pengaturan kotak dari halaman sebelumnya
    }

    function tampil() {
      box.classList.toggle("mb-diam", !main);
      bPlay.innerHTML = main ? "&#9208;" : "&#9654;";
      bMute.innerHTML = bisu ? "&#128263;" : "&#128266;";
    }
    function geser(tutup) {
      sembunyi = tutup;
      box.classList.toggle("mb-sembunyi", tutup);
      bTutup.innerHTML = tutup ? "&#9664;" : "&#9654;";
    }

    // ---------- file lagu ----------
    function kandidat(l) {
      var dasar = l.file.replace(/(\.(mp3|m4a|mp4|webm|ogg|wav|aac|mpeg|mpg))+$/i, ""), c = [l.file];
      EKS.forEach(function (e) { var f = dasar + "." + e; if (c.indexOf(f) < 0) c.push(f); });
      c.slice().forEach(function (f) { if (f.indexOf("musik/") !== 0) c.push("musik/" + f); });
      return c.map(function (f) { return BASE + f; });
    }
    function mainkan() {
      var p = audio.play();
      if (p && p.catch) p.catch(function (e) { if (e && e.name === "NotAllowedError") ditahan(); });
    }
    function muat(i, dari) {
      idx = (i + LAGU.length) % LAGU.length;
      var l = LAGU[idx];
      l._k = 0; seek = dari || 0;
      elJudul.textContent = l.judul;
      audio.src = kandidat(l)[0]; audio.muted = bisu;
      mainkan();
    }
    function gagal() {
      gagalBeruntun++;
      if (gagalBeruntun >= LAGU.length) {
        main = false; ingin = false; tampil(); tutupMasuk(); geser(false);
        elJudul.textContent = "Gagal memuat: " + catat.join(", ") + ". Cek nama file lagu di repo Robin_Dev.";
        box.classList.remove("mb-diam");
        return;
      }
      muat(idx + 1, 0);
    }

    // ---------- layar "Klik untuk masuk" ----------
    function tutupMasuk() {
      if (!masuk) return;
      var m = masuk; masuk = null; m.style.opacity = "0";
      setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, 400);
    }
    function ditahan() {          // browser menahan suara otomatis -> tunggu interaksi pertama
      main = false; menunggu = true; tampil();
      if (mulaiBaru && LAYAR_MASUK) {
        if (!masuk) {
          masuk = document.createElement("div"); masuk.id = "mb-masuk";
          masuk.innerHTML = '<div class="mb-m1">Klik untuk masuk</div><div class="mb-m2">&#127925; Musik akan menyala otomatis</div>';
          document.body.appendChild(masuk);
        }
      } else {
        if (sembunyi) pernahSembunyi = true;     // ingat: sebelumnya kotak disembunyikan
        geser(false); box.classList.remove("mb-diam");
        elJudul.textContent = "Klik di mana saja untuk lanjut musik";
      }
    }

    // ---------- event audio ----------
    audio.addEventListener("loadedmetadata", function () {
      if (seek > 0 && isFinite(audio.duration) && seek < audio.duration - 1) { try { audio.currentTime = seek; } catch (e) { /* abaikan */ } }
      seek = 0;
    });
    audio.addEventListener("playing", function () {
      gagalBeruntun = 0; main = true; menunggu = false;
      elJudul.textContent = LAGU[idx].judul;
      tutupMasuk(); tampil(); simpan(true);
      ["pointerdown", "click", "keydown", "touchend"].forEach(function (n) { document.removeEventListener(n, pertama, true); });
      if (pernahSembunyi) { pernahSembunyi = false; timerSingkir = setTimeout(function () { geser(true); simpan(true); }, 2500); }
      if (!sudahSingkir) { sudahSingkir = true; timerSingkir = setTimeout(function () { geser(true); simpan(true); }, 4000); }
    });
    audio.addEventListener("pause", function () { if (!audio.ended) { main = false; tampil(); } });
    audio.addEventListener("ended", function () { muat(idx + 1, 0); });   // habis -> otomatis ganti lagu
    audio.addEventListener("timeupdate", function () { simpan(false); });
    audio.addEventListener("error", function () {
      var l = LAGU[idx], c = kandidat(l);
      l._k = (l._k || 0) + 1;
      if (l._k < c.length) { audio.src = c[l._k]; mainkan(); return; }   // coba nama/format lain
      catat.push(l.file);
      gagal();
    });
    window.addEventListener("pagehide", function () { simpan(true); });

    // ---------- tombol ----------
    bTutup.onclick = function () { clearTimeout(timerSingkir); sudahSingkir = true; geser(!sembunyi); simpan(true); };
    bPlay.onclick = function () {
      if (main) { ingin = false; audio.pause(); simpan(true); return; }
      ingin = true; menunggu = false; tutupMasuk();
      if (audio.getAttribute("src")) mainkan(); else muat(idx, seek);
      simpan(true);
    };
    bNext.onclick = function () { ingin = true; menunggu = false; tutupMasuk(); muat(idx + 1, 0); };
    bPrev.onclick = function () { ingin = true; menunggu = false; tutupMasuk(); muat(idx - 1, 0); };
    bMute.onclick = function () { bisu = !bisu; audio.muted = bisu; tampil(); simpan(true); };

    // interaksi pertama (klik/sentuh/tombol) -> lanjutkan musik yang ditahan browser
    function pertama(e) {
      if (!menunggu) return;
      if (e && e.target && box.contains(e.target)) return;   // klik di kotak musik ditangani tombolnya
      menunggu = false; tutupMasuk();
      if (audio.getAttribute("src")) mainkan(); else muat(idx, seek);
    }

    // ---------- mulai ----------
    elJudul.textContent = LAGU[idx].judul;
    geser(sembunyi); tampil();
    if (ingin) {
      ["pointerdown", "click", "keydown", "touchend"].forEach(function (n) { document.addEventListener(n, pertama, true); });
      muat(idx, seek);            // coba putar langsung (berhasil kalau browser mengizinkan)
    }
  }

  if (document.body) mulaiSemua(); else document.addEventListener("DOMContentLoaded", mulaiSemua);
})();
