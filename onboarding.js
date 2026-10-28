/* Bienvenida: se muestra una sola vez, la primera vez que se abre la app sin bloqueo.
   Se carga como archivo aparte para no tener que cambiar los hashes de la CSP. */
(function () {
  var FLAG = "gastos.intro.v1";
  var seen = false;
  try { seen = localStorage.getItem(FLAG) === "1"; } catch (e) {}
  var locked = false;
  try { var d = JSON.parse(localStorage.getItem("gastos.v1")); locked = !!(d && d.settings && d.settings.lock && d.settings.lock.on); } catch (e) {}
  if (seen || locked) return;

  var SLIDES = [
    { t: "Bienvenido a Gastos", b: "Anotá tus gastos e ingresos en segundos y mirá cómo viene tu mes." },
    { t: "Anotá con un toque", b: "Guardá como favoritos los gastos que hacés seguido. También podés pedirle a Siri que anote un gasto con el atajo." },
    { t: "Pagos y vencimientos", b: "Cargá tus gastos fijos y tarjetas, y te avisamos antes de que venzan." },
    { t: "Tus datos, tuyos", b: "Todo queda en este dispositivo. Si activás la copia en la nube, se cifra con una clave que elegís vos: el servidor no puede leerla. Guardá una copia de vez en cuando." }
  ];

  var css = [
    "#intro{position:fixed;inset:0;z-index:80;background:var(--bg,#f6f4ef);display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}",
    "#intro .in{width:100%;max-width:360px;display:flex;flex-direction:column;gap:18px;text-align:center}",
    "#intro h2{font-size:1.5rem;margin:0}",
    "#intro p{margin:0;font-size:1rem;line-height:1.45;color:var(--muted,#5b6b63);min-height:5.5em}",
    "#intro .dots{display:flex;gap:8px;justify-content:center}",
    "#intro .dots i{width:8px;height:8px;border-radius:50%;background:var(--line,#cfd6d1)}",
    "#intro .dots i.on{background:var(--accent,#1f5a45)}",
    "#intro .row{display:flex;gap:10px;justify-content:space-between;align-items:center}",
    "#intro button{font:inherit;border-radius:12px;padding:12px 18px;cursor:pointer;border:0}",
    "#intro .next{background:var(--accent,#1f5a45);color:#fff;font-weight:600;flex:1}",
    "#intro .skip{background:none;color:var(--muted,#5b6b63);padding:12px 6px}"
  ].join("");
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var wrap = document.createElement("div");
  wrap.id = "intro"; wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-modal", "true"); wrap.setAttribute("aria-labelledby", "intro-t");
  wrap.innerHTML = '<div class="in"><h2 id="intro-t"></h2><p id="intro-b"></p><div class="dots" id="intro-dots"></div><div class="row"><button class="skip" type="button" id="intro-skip">Omitir</button><button class="next" type="button" id="intro-next"></button></div></div>';
  document.body.appendChild(wrap);

  var i = 0, dots = wrap.querySelector("#intro-dots");
  SLIDES.forEach(function () { dots.appendChild(document.createElement("i")); });

  function show() {
    wrap.querySelector("#intro-t").textContent = SLIDES[i].t;
    wrap.querySelector("#intro-b").textContent = SLIDES[i].b;
    wrap.querySelector("#intro-next").textContent = i === SLIDES.length - 1 ? "Empezar" : "Siguiente";
    Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle("on", k === i); });
    wrap.querySelector("#intro-skip").hidden = i === SLIDES.length - 1;
    wrap.querySelector("#intro-next").focus();
  }
  function close() {
    try { localStorage.setItem(FLAG, "1"); } catch (e) {}
    wrap.remove();
  }
  wrap.querySelector("#intro-next").onclick = function () { if (i < SLIDES.length - 1) { i++; show(); } else close(); };
  wrap.querySelector("#intro-skip").onclick = close;
  show();
})();
