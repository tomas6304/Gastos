// Pruebas de los cálculos de Gastos. Se ejecutan abriendo la app con ?pruebas=1 y no guardan nada.
(() => {
  const G = window.__gastos;
  const results = [];
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const near = (a, b, tol = 1e-6) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= tol;
  let current = "";
  const eq = (actual, expected, label = "") => { if (!same(actual, expected)) throw new Error(`${label ? label + ": " : ""}esperaba ${JSON.stringify(expected)} y salió ${JSON.stringify(actual)}`); };
  const close = (actual, expected, label = "") => { if (!near(actual, expected)) throw new Error(`${label ? label + ": " : ""}esperaba ${expected} y salió ${actual}`); };
  const truthy = (v, label) => { if (!v) throw new Error(label || "tenía que ser verdadero"); };
  const tests = [];
  const test = (name, fn) => tests.push([name, fn]);
  const tx = (o) => ({id:Math.random().toString(36).slice(2), type:"gasto", amount:100, cat:"comida", note:"", date:"2026-10-10", method:"debito", card:"", acc:"", created:1, ...o});

  /* ----- números y fechas ----- */
  test("parseAmount: formatos argentinos y de EE. UU.", () => {
    eq(G.parseAmount("1.234,56"), 1234.56); eq(G.parseAmount("1,234.56"), 1234.56); eq(G.parseAmount("1234"), 1234);
    eq(G.parseAmount("$ 4.200,00"), 4200); eq(G.parseAmount("1.500"), 1500); eq(G.parseAmount("2,5"), 2.5);
    eq(G.parseAmount("-1.234,56"), -1234.56); truthy(Number.isNaN(G.parseAmount("")), "vacío debe ser NaN"); truthy(Number.isNaN(G.parseAmount("abc")), "texto debe ser NaN");
  });
  test("parseBankAmount: signos de los bancos", () => {
    eq(G.parseBankAmount("(1.234,56)"), -1234.56); eq(G.parseBankAmount("1.234,56-"), -1234.56); eq(G.parseBankAmount("−500"), -500);
    eq(G.parseBankAmount("$ 1,234.56"), 1234.56); eq(G.parseBankAmount("-$ 300,00"), -300); truthy(Number.isNaN(G.parseBankAmount("abc")));
  });
  test("parseBankDate: día primero, ISO y fechas imposibles", () => {
    eq(G.parseBankDate("15/10/2026"), "2026-10-15"); eq(G.parseBankDate("5-3-26"), "2026-03-05"); eq(G.parseBankDate("2026-10-15 14:30"), "2026-10-15");
    eq(G.parseBankDate("2026/1/5"), "2026-01-05"); eq(G.parseBankDate("31/02/2026"), null); eq(G.parseBankDate("13/13/2026"), null); eq(G.parseBankDate("hola"), null);
    eq(G.parseBankDate("29/02/2028"), "2028-02-29"); eq(G.parseBankDate("29/02/2027"), null);
  });
  test("monthDay: el día 31 se acomoda a meses cortos", () => {
    eq(G.monthDay("2026-01-31", 1, 31), "2026-02-28"); eq(G.monthDay("2026-01-31", 3, 31), "2026-04-30"); eq(G.monthDay("2028-01-31", 1, 31), "2028-02-29");
    eq(G.monthDay("2026-11-15", 2, 15), "2027-01-15");
  });

  /* ----- cuotas y fijos ----- */
  test("splitInstallments: las cuotas suman exacto", () => {
    eq(G.splitInstallments(100, 3), [33.33, 33.33, 33.34]); eq(G.splitInstallments(10, 1), [10]); eq(G.splitInstallments(0.05, 3), [0.02, 0.02, 0.01]);
    for (const [t, n] of [[1000, 12], [99999.99, 7], [1234.56, 18], [1, 24]]) close(G.splitInstallments(t, n).reduce((a, b) => a + b, 0), t, `${t} en ${n}`);
  });
  test("occurrences: mensual, semanal y anual", () => {
    eq(G.occurrences({start:"2026-01-31", freq:"mensual"}, "2026-01-01", "2026-05-31"), ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"]);
    eq(G.occurrences({start:"2026-10-01", freq:"semanal"}, "2026-10-01", "2026-10-22"), ["2026-10-01", "2026-10-08", "2026-10-15", "2026-10-22"]);
    eq(G.occurrences({start:"2024-02-29", freq:"anual"}, "2024-01-01", "2026-12-31"), ["2024-02-29", "2025-02-28", "2026-02-28"]);
    eq(G.occurrences({start:"2026-10-15", freq:"mensual"}, "2026-11-01", "2026-10-01"), []);
  });
  test("nextDue: el próximo pago es después de hoy y de lo ya anotado", () => {
    G.setToday("2026-10-20");
    eq(G.nextDue({start:"2026-01-15", freq:"mensual", lastGen:"2026-10-15"}), "2026-11-15");
    eq(G.nextDue({start:"2026-12-01", freq:"mensual", lastGen:null}), "2026-12-01");
    G.setToday(null);
  });

  /* ----- tarjeta ----- */
  const card = {id:"c1", name:"Visa", closeDay:25, dueDay:5};
  const withCard = (today, list, c = card, fn) => { const s = G.snapshot(); G.setState({txs:list}); G.setToday(today); try { return fn(G.cardCycles(c)); } finally { G.setToday(null); G.setState(s); } };
  test("cardCycles: cierre y vencimiento antes del cierre", () => {
    withCard("2026-10-20", [], card, c => { eq(c.current.close, "2026-10-25"); eq(c.current.due, "2026-11-05"); eq(c.last.close, "2026-09-25"); eq(c.last.due, "2026-10-05"); });
  });
  test("cardCycles: pasado el cierre se corre al mes siguiente", () => {
    withCard("2026-10-26", [], card, c => { eq(c.current.close, "2026-11-25"); eq(c.last.close, "2026-10-25"); eq(c.last.due, "2026-11-05"); });
    withCard("2026-10-25", [], card, c => eq(c.current.close, "2026-10-25", "el mismo día del cierre todavía cuenta"));
  });
  test("cardCycles: el gasto del día del cierre entra, el del día siguiente no", () => {
    const L = [tx({card:"c1", method:"credito", date:"2026-09-25", amount:1}), tx({card:"c1", method:"credito", date:"2026-09-26", amount:10}),
      tx({card:"c1", method:"credito", date:"2026-10-25", amount:100}), tx({card:"c1", method:"credito", date:"2026-10-26", amount:1000}),
      tx({card:"c1", method:"credito", date:"2026-09-10", amount:10000}), tx({card:"c2", method:"credito", date:"2026-10-01", amount:5}), tx({card:"c1", method:"debito", date:"2026-10-01", amount:7})];
    withCard("2026-10-20", L, card, c => { eq(c.current.amount, 110, "resumen abierto"); eq(c.last.amount, 10001, "resumen anterior"); });
  });
  test("cardCycles: cierre el 31 en febrero y vencimiento en el año siguiente", () => {
    withCard("2026-02-10", [], {id:"c", closeDay:31, dueDay:10}, c => eq(c.current.close, "2026-02-28"));
    withCard("2026-12-15", [], {id:"c", closeDay:28, dueDay:10}, c => { eq(c.current.close, "2026-12-28"); eq(c.current.due, "2027-01-10"); });
  });

  /* ----- dólares e inflación ----- */
  test("fxRate: la cotización manual gana a la automática", () => {
    const s = G.snapshot();
    try {
      G.setState({settings:{...s.settings, fxManual:1300, fx:{mep:1200}, fxSource:"mep"}}); eq(G.fxRate(), 1300);
      G.setState({settings:{...s.settings, fxManual:0, fx:{mep:1200, blue:1250}, fxSource:"blue"}}); eq(G.fxRate(), 1250);
      G.setState({settings:{...s.settings, fxManual:0, fx:null}}); eq(G.fxRate(), 0);
    } finally { G.setState(s); }
  });
  test("accBalance: pesos, transferencias y cuenta en dólares", () => {
    const s = G.snapshot();
    try {
      const ars = {id:"a1", name:"Banco", kind:"banco", initial:1000}, usd = {id:"a2", name:"Dólares", kind:"usd", initial:100};
      G.setState({accounts:[ars, usd], txs:[tx({type:"ingreso", amount:500, acc:"a1", date:"2026-10-01"}), tx({amount:200, acc:"a1", date:"2026-10-02"}), tx({amount:50, acc:"a1", date:"2026-11-01"}),
        tx({amount:2400, acc:"a2", usd:2, rate:1200, date:"2026-10-03"}), tx({amount:1200, acc:"a2", date:"2026-10-04", rate:1200})],
        transfers:[{id:"t1", from:"a1", to:"a2", amount:100, toAmount:0.1, date:"2026-10-05"}, {id:"t2", from:"a2", to:"a1", amount:1, toAmount:1200, date:"2026-10-06"}],
        settings:{...s.settings, fxManual:1200}});
      close(G.accBalance(ars, "2026-10-31"), 1000 + 500 - 200 - 100 + 1200, "pesos");
      close(G.accBalance(ars, "2026-11-30"), 1000 + 500 - 200 - 50 - 100 + 1200, "pesos con el gasto de noviembre");
      close(G.accBalance(usd, "2026-10-31"), 100 - 2 - 1 + 0.1 - 1, "dólares");
    } finally { G.setState(s); }
  });
  test("inflFactors: lleva todo a pesos del último mes cargado", () => {
    const s = G.snapshot();
    try {
      G.setState({settings:{...s.settings, infl:{"2026-08":2, "2026-09":4, "2026-10":3}}});
      const f = G.inflFactors().f;
      eq(G.inflFactors().last, "2026-10"); close(f("2026-10-15"), 1); close(f("2026-11-01"), 1); close(f("2026-09-10"), 1.03); close(f("2026-08-01"), 1.03 * 1.04);
      close(f("2026-07-15"), 1.03 * 1.04 * 1.02);
      G.setState({settings:{...s.settings, infl:{}}}); close(G.inflFactors().f("2020-01-01"), 1);
    } finally { G.setState(s); }
  });
  test("plazo fijo: capital más interés simple por los días", () => {
    close(G.pfFinal({amount:100000, tna:36, days:30}), 102958.9); eq(G.pfEnd({start:"2026-10-01", days:30}), "2026-10-31"); close(G.pfFinal({amount:5000, tna:0, days:30}), 5000);
  });

  /* ----- pronóstico ----- */
  test("monthForecast: gastado + agendado + ritmo del día a día", () => {
    const s = G.snapshot(), now = new Date(), pad = n => String(n).padStart(2, "0"), key = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    try {
      G.setState({txs:[tx({amount:1000, date:`${key}-01`}), tx({amount:500, date:`${key}-01`, recId:"r"})], recs:[]});
      const f = G.monthForecast();
      close(f.spent, 1500); close(f.everyday, 1000); close(f.pace, 1000 / f.day * (f.dim - f.day)); close(f.total, f.spent + f.pace + f.booked + f.fixed);
      truthy(f.total >= f.spent, "el pronóstico no puede ser menor a lo ya gastado");
    } finally { G.setState(s); }
  });

  /* ----- Apple Pay: categoría que aprende ----- */
  test("merchKey: variantes del mismo comercio", () => {
    eq(G.merchKey("CARREFOUR 0123 SA"), "carrefour"); eq(G.merchKey("Café Martínez"), "cafe martinez"); eq(G.merchKey("  Kiosco   24hs "), "kiosco hs"); eq(G.merchKey("1234"), "");
  });
  test("learnedCat: la categoría más usada, y la más reciente si empatan", () => {
    const s = G.snapshot();
    try {
      G.setState({txs:[tx({note:"Farmacity", cat:"salud", date:"2026-09-01"}), tx({note:"FARMACITY 0123 SA", cat:"salud", date:"2026-09-10"}), tx({note:"Farmacity", cat:"compras", date:"2026-10-01"}),
        tx({note:"Dia", cat:"super", date:"2026-09-01"}), tx({note:"Dia", cat:"comida", date:"2026-10-01"}), tx({note:"Netflix", cat:"ocio", recId:"r"}), tx({note:"Zapatos", cat:"compras", inst:{g:"g", n:1, of:3, total:3}}),
        tx({note:"Otra nota", merch:"kiosco", cat:"comida"}), tx({note:"Plata", type:"ingreso", cat:"sueldo"}), tx({note:"Carrefour", cat:"super"}), tx({note:"Diaz", cat:"compras"})]});
      eq(G.learnedCat("COMPRA CARREFOUR 0123").id, "super", "el banco agrega palabras al nombre"); eq(G.learnedCat("Carre"), null, "un pedazo corto no cuenta");
      eq(G.learnedCat("Diaz y Hnos").id, "compras", "una palabra de más igual calza"); eq(G.learnedCat("Dia").id, "comida", "Dia no se confunde con Diaz");
      eq(G.learnedCat("farmacity").id, "salud"); eq(G.learnedCat("Dia").id, "comida", "empate → la más reciente"); eq(G.learnedCat("KIOSCO").id, "comida", "por el campo merch");
      eq(G.learnedCat("Netflix"), null, "los fijos no enseñan"); eq(G.learnedCat("Zapatos"), null, "las cuotas no enseñan"); eq(G.learnedCat("Plata"), null, "los ingresos no enseñan"); eq(G.learnedCat("Nunca visto"), null);
    } finally { G.setState(s); }
  });
  test("txFromInbox: importe, categoría y fecha", () => {
    const s = G.snapshot();
    try {
      G.setState({txs:[tx({note:"Farmacity", cat:"salud"})], settings:{...s.settings, payMap:{}, paySeen:[]}});
      let t = G.txFromInbox({id:"1", monto:"$ 4.200,00", comercio:"FARMACITY 0123 SA", tarjeta:"Visa", cat:"Otros", fecha:"2026-10-15T12:00:00-03:00"});
      eq(t.amount, 4200); eq(t.cat, "salud", "Otros del atajo cede ante lo aprendido"); eq(t.date, "2026-10-15"); eq(t.src, "applepay"); eq(t.inboxId, "1");
      t = G.txFromInbox({id:"2", monto:"900", comercio:"Farmacity", cat:"Ocio"}); eq(t.cat, "ocio", "una categoría elegida en el atajo se respeta");
      t = G.txFromInbox({id:"3", monto:"900", comercio:"Kiosco nuevo", cat:""}); eq(t.cat, "otros", "sin datos previos queda en Otros");
      eq(G.txFromInbox({id:"4", monto:"0", comercio:"X"}), null, "importe cero"); eq(G.txFromInbox({id:"5", monto:"abc"}), null, "importe inválido");
      truthy(/^\d{4}-\d{2}-\d{2}$/.test(G.txFromInbox({id:"6", monto:"5", fecha:"basura"}).date), "fecha inválida → hoy");
    } finally { G.setState(s); }
  });

  /* ----- buscador ----- */
  const S = [tx({note:"Café", amount:1500, date:"2026-10-05", cat:"comida"}), tx({note:"Alquiler", amount:350000, date:"2026-10-01", cat:"casa", recId:"r"}), tx({note:"Zapatillas", amount:90000, date:"2026-09-12", cat:"compras", inst:{g:"g", n:1, of:3, total:270000}}),
    tx({note:"Sueldo", type:"ingreso", amount:900000, date:"2026-10-02", cat:"sueldo"}), tx({note:"Super", amount:15000.5, date:"2025-10-20", cat:"super", src:"applepay"}), tx({note:"Cine", amount:5000, date:"2026-10-30", cat:"ocio", photo:"p"})];
  const found = q => { const sq = G.parseSearch(q); return S.filter(t => G.matchSearch(t, sq)).map(t => t.note).sort(); };
  test("buscador: palabras, categoría y todas las palabras a la vez", () => {
    eq(found("cafe"), ["Café"]); eq(found("comida"), ["Café"]); eq(found("cafe alquiler"), []); eq(found("  "), S.map(t => t.note).sort());
  });
  test("buscador: importes (>, <, rango) y números sueltos", () => {
    eq(found(">100000"), ["Alquiler", "Sueldo"]); eq(found("> 100000"), ["Alquiler", "Sueldo"]); eq(found("<=1500"), ["Café"]); eq(found("<1500"), []);
    eq(found("5000-20000"), ["Cine", "Super"]); eq(found("20000-5000"), ["Cine", "Super"], "rango al revés"); eq(found("1500"), ["Café", "Super"], "un número también calza dentro de otro importe"); eq(found(">10000 <100000"), ["Super", "Zapatillas"]);
  });
  test("buscador: meses, años y fechas", () => {
    eq(found("octubre"), ["Alquiler", "Café", "Cine", "Sueldo", "Super"]); eq(found("octubre 2026"), ["Alquiler", "Café", "Cine", "Sueldo"]); eq(found("2025"), ["Super"]);
    eq(found("2026-09"), ["Zapatillas"]); eq(found("2026-10-05"), ["Café"]); eq(found("sept"), ["Zapatillas"]);
  });
  test("buscador: etiquetas fijo, cuota, applepay, foto, ingreso", () => {
    eq(found("fijo"), ["Alquiler"]); eq(found("cuotas"), ["Zapatillas"]); eq(found("applepay"), ["Super"]); eq(found("foto"), ["Cine"]); eq(found("ingresos"), ["Sueldo"]); eq(found("gastos octubre >4000"), ["Alquiler", "Cine", "Super"]);
  });

  /* ----- importación del banco ----- */
  test("parseCSV: separadores, comillas, BOM y saltos de línea", () => {
    eq(G.parseCSV('a;b;c\n1;"x;y";3\n'), [["a", "b", "c"], ["1", "x;y", "3"]]);
    eq(G.parseCSV('﻿Fecha,Detalle\r\n"1/1/2026","dijo ""hola"""\r\n'), [["Fecha", "Detalle"], ["1/1/2026", 'dijo "hola"']]);
    eq(G.parseCSV('a,b\n"línea 1\nlínea 2",x'), [["a", "b"], ["línea 1\nlínea 2", "x"]]); eq(G.parseCSV("a\tb\n1\t2"), [["a", "b"], ["1", "2"]]); eq(G.parseCSV("a;b\n\n\n1;2\n"), [["a", "b"], ["1", "2"]]);
  });
  test("guessBankColumns: con encabezado, con texto antes y sin encabezado", () => {
    let g = G.guessBankColumns([["Fecha", "Descripción", "Débito", "Crédito", "Saldo"], ["15/10/2026", "Super", "1500", "", "9000"]]);
    eq([g.header, g.date, g.desc, g.debit, g.credit, g.amount ?? null], [0, 1 - 1, 1, 2, 3, null]);
    g = G.guessBankColumns([["Cuenta", "123-4"], ["Fecha", "Concepto", "Importe", "Saldo"], ["15/10/2026", "Super", "-1500,00", "9000"]]);
    eq([g.header, g.date, g.desc, g.amount], [1, 0, 1, 2]);
    g = G.guessBankColumns([["15/10/2026", "Compra super", "-1.500,00"], ["16/10/2026", "Sueldo octubre", "900.000,00"], ["17/10/2026", "Café", "-2.000,00"]]);
    eq([g.header, g.date, g.desc, g.amount], [-1, 0, 1, 2]);
  });
  test("extractBankItems: signo, débito y crédito, invertir y líneas repetidas", () => {
    const rows = [["Fecha", "Detalle", "Importe"], ["15/10/2026", "Café", "-1.500,00"], ["15/10/2026", "Café", "-1.500,00"], ["16/10/2026", "Sueldo", "900.000,00"], ["xx", "roto", "1"], ["17/10/2026", "Cero", "0"]];
    let it = G.extractBankItems(rows, {header:0, date:0, desc:1, amount:2}, false);
    eq(it.map(i => [i.date, i.type, i.amount]), [["2026-10-15", "gasto", 1500], ["2026-10-15", "gasto", 1500], ["2026-10-16", "ingreso", 900000]]);
    truthy(it[0].bankId !== it[1].bankId, "dos líneas iguales deben tener ids distintos"); truthy(it[0].bankId.endsWith("#1") && it[1].bankId.endsWith("#2"));
    it = G.extractBankItems(rows, {header:0, date:0, desc:1, amount:2}, true); eq(it.map(i => i.type), ["ingreso", "ingreso", "gasto"]);
    it = G.extractBankItems([["Fecha", "Detalle", "Débito", "Crédito"], ["15/10/2026", "Super", "1.500,00", ""], ["16/10/2026", "Sueldo", "", "900.000,00"], ["17/10/2026", "Neto", "100", "100"]], {header:0, date:0, desc:1, debit:2, credit:3}, false);
    eq(it.map(i => [i.type, i.amount]), [["gasto", 1500], ["ingreso", 900000]]);
  });
  test("markBankDuplicates: lo que ya tienes no se importa dos veces", () => {
    const existing = [tx({id:"e1", amount:1500, date:"2026-10-15", note:"Apple Pay"}), tx({id:"e2", amount:7000, date:"2026-10-10", bankId:"2026-10-10|700000|g|luz#1"})];
    const mk = (date, amount, type, bankId) => ({date, amount, type, bankId});
    const items = G.markBankDuplicates([mk("2026-10-16", 1500, "gasto", "a"), mk("2026-10-15", 1500, "gasto", "b"), mk("2026-10-18", 1500, "gasto", "c"), mk("2026-10-15", 1500, "ingreso", "d"),
      mk("2026-10-10", 7000, "gasto", "2026-10-10|700000|g|luz#1")], existing);
    eq(items.map(i => i.dup), ["posible", "", "", "", "ya"], "cada gasto existente se cruza una sola vez");
    eq(items[0].match.id, "e1");
    const solo = (d, a) => G.markBankDuplicates([mk(d, 1500, "gasto", "z")], [tx({amount:1500, date:"2026-10-15"})])[0].dup;
    eq([solo("2026-10-13"), solo("2026-10-17"), solo("2026-10-12"), solo("2026-10-18")], ["posible", "posible", "", ""], "la ventana es de dos días");
  });

  /* ----- ejecución ----- */
  function run() {
    for (const [name, fn] of tests) {
      current = name;
      try { fn(); results.push({name, ok:true}); } catch (e) { G.setToday(null); results.push({name, ok:false, error:e.message}); }
    }
    const bad = results.filter(r => !r.ok);
    window.__resultados = {total:results.length, ok:results.length - bad.length, fallos:bad};
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;inset:0;z-index:99999;background:#07100c;color:#e8efeb;font:14px/1.4 -apple-system,system-ui,sans-serif;overflow:auto;padding:20px 16px 60px";
    box.innerHTML = `<h2 style="margin:0 0 4px">Pruebas de cálculos</h2><p style="margin:0 0 16px;color:${bad.length ? "#ec7a64" : "#34e3a3"}">${bad.length ? `${bad.length} con fallos de ${results.length}` : `Todas pasan (${results.length})`}</p>`
      + results.map(r => `<div style="padding:8px 0;border-top:1px solid #1b2620"><b style="color:${r.ok ? "#34e3a3" : "#ec7a64"}">${r.ok ? "✓" : "✗"}</b> ${r.name}${r.ok ? "" : `<div style="color:#ec7a64;margin-top:4px;font-size:13px">${r.error.replace(/</g, "&lt;")}</div>`}</div>`).join("")
      + `<button style="margin-top:20px;padding:12px 18px;border-radius:12px;border:0;background:#34e3a3;color:#06120d;font-weight:600" onclick="location.href=location.pathname">Volver a la app</button>`;
    document.body.append(box);
    console.log(`[pruebas] ${results.length - bad.length}/${results.length} OK`, bad);
  }
  run();
})();
