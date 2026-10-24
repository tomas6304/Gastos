// Bienvenida de Gastos: 4 pantallas que se muestran una sola vez (marca "gastos.intro.v1").
// Si el archivo falta, la app funciona igual y simplemente no hay bienvenida.
(() => {
  const KEY = "gastos.intro.v1";
  const get = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const data = () => { try { return JSON.parse(get("gastos.v1")) || {}; } catch { return {}; } };

  const ic = p => `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const PAGES = [
    {icon:ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M9.5 10c0-1 1-1.7 2.5-1.7s2.5.7 2.5 1.7-1 1.5-2.5 1.8-2.5.8-2.5 1.8 1 1.7 2.5 1.7 2.5-.7 2.5-1.7"/>'),
      title:"Tu plata, clara", text:"Gastos te muestra en qué se va tu plata, cuánto te queda del mes y cómo vas contra tu presupuesto. Todo en un solo lugar y sin vueltas."},
    {icon:ic('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h3"/>'),
      title:"Anota con un toque", text:"Toca Añadir para cargar un gasto en segundos, o crea gastos rápidos como el café. Si pagas con Apple Pay, el pago puede anotarse solo con un atajo."},
    {icon:ic('<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4"/>'),
      title:"Pagos y vencimientos", text:"Carga tus fijos, cuotas y tarjetas una vez. La app te avisa antes de cada pago y te muestra cuánto tienes comprometido en los próximos meses."},
    {icon:ic('<rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 15v2"/>'),
      title:"Tus datos son tuyos", text:"Todo se guarda en este iPhone. Puedes bloquear la app con código o Face ID y guardar una copia de seguridad, también cifrada en la nube, para no perder nada."},
  ];

  let box = null, step = 0, startX = null;

  function css() {
    if (document.getElementById("intro-css")) return;
    const s = document.createElement("style"); s.id = "intro-css";
    s.textContent = `
.intro{position:fixed;inset:0;z-index:9990;background:var(--bg,#070b09);color:var(--ink,#e8efeb);display:flex;flex-direction:column;
  padding:calc(24px + env(safe-area-inset-top,0px)) 24px calc(24px + env(safe-area-inset-bottom,0px));font-family:var(--f-body,system-ui,sans-serif);animation:intro-in .35s ease both}
.intro-skip{align-self:flex-end;color:var(--muted,#8a9b93);font-weight:600;padding:8px 4px;background:none;border:0;font:inherit;cursor:pointer}
.intro-stage{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:18px;max-width:420px;width:100%;margin:0 auto;touch-action:pan-y}
.intro-ic{width:96px;height:96px;border-radius:30px;display:grid;place-items:center;color:var(--accent,#34e3a3);background:var(--accent-soft,#0f2b20);box-shadow:0 0 0 1px var(--line,#1b2620),0 18px 50px color-mix(in srgb,var(--accent,#34e3a3) 22%,transparent)}
.intro h1{font-family:var(--f-display,system-ui);font-size:clamp(1.9rem,8vw,2.4rem);line-height:1.1;letter-spacing:-.025em;margin:6px 0 0}
.intro p{margin:0;color:var(--muted,#8a9b93);font-size:1.05rem;line-height:1.5}
.intro-page{display:flex;flex-direction:column;align-items:center;gap:18px;animation:intro-page .4s cubic-bezier(.2,.8,.2,1) both}
.intro-dots{display:flex;gap:8px;justify-content:center;margin:0 0 18px}
.intro-dots i{width:8px;height:8px;border-radius:99px;background:var(--line,#1b2620);transition:width .25s ease,background .25s ease}
.intro-dots i.on{width:26px;background:var(--accent,#34e3a3)}
.intro-go{width:100%;max-width:420px;margin:0 auto;display:block;background:var(--accent,#34e3a3);color:var(--accent-ink,#06120d);border:0;border-radius:16px;padding:16px;font:inherit;font-weight:700;font-size:1.05rem;cursor:pointer;
  box-shadow:0 8px 22px color-mix(in srgb,var(--accent,#34e3a3) 28%,transparent)}
.intro-go:active{transform:scale(.97)}
@keyframes intro-in{from{opacity:0}to{opacity:1}}
@keyframes intro-page{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.intro,.intro-page{animation:none}}`;
    document.head.append(s);
  }

  function draw() {
    const p = PAGES[step], last = step === PAGES.length - 1;
    box.innerHTML = `<button class="intro-skip" type="button" ${last ? "hidden" : ""}>Saltar</button>
      <div class="intro-stage"><div class="intro-page" key="${step}"><div class="intro-ic">${p.icon}</div><h1></h1><p></p></div></div>
      <div class="intro-dots" aria-hidden="true">${PAGES.map((_, i) => `<i class="${i === step ? "on" : ""}"></i>`).join("")}</div>
      <button class="intro-go" type="button">${last ? "Empezar" : "Siguiente"}</button>`;
    box.querySelector("h1").textContent = p.title;
    box.querySelector("p").textContent = p.text;
    box.querySelector(".intro-go").onclick = next;
    box.querySelector(".intro-skip").onclick = close;
  }
  function next() { if (step >= PAGES.length - 1) return close(); step++; draw(); }
  function back() { if (step > 0) { step--; draw(); } }
  function close() {
    put(KEY, "1");
    if (!box) return;
    box.style.transition = "opacity .25s ease"; box.style.opacity = "0";
    const b = box; box = null;
    setTimeout(() => { b.remove(); document.body.style.overflow = ""; }, 260);
  }

  function show() {
    if (box) return;
    css(); step = 0;
    box = document.createElement("div"); box.className = "intro"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Bienvenida");
    box.addEventListener("touchstart", e => { startX = e.touches[0].clientX; }, {passive:true});
    box.addEventListener("touchend", e => {
      if (startX == null) return;
      const dx = e.changedTouches[0].clientX - startX; startX = null;
      if (dx < -50) next(); else if (dx > 50) back();
    }, {passive:true});
    draw(); document.body.append(box); document.body.style.overflow = "hidden";
  }

  // Desde Ajustes → "Ver la bienvenida otra vez"
  window.mostrarBienvenida = show;

  function auto() {
    if (get(KEY)) return;
    const d = data();
    if (d.settings?.lock?.on) return;                       // con el bloqueo activo no se tapa la pantalla de código
    if (Array.isArray(d.expenses) && d.expenses.length) { put(KEY, "1"); return; }   // quien ya usa la app no la necesita
    show();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", auto); else auto();
})();
