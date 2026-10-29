/* Desenho do painel, filtros, tabela, letreiro e modo TV. */
(() => {
const F = window.tjFmt;
const PA = { accent: "#FF7A45", blue: "#7CC4FF", gold: "#F3D27A", slate: "#8E9BB3" };
const grauCor = { "1º grau": PA.accent, "Juizado Especial": PA.blue, "2º grau": PA.gold, "Turma Recursal": PA.slate };
const FERIADOS = new Set(["2026-09-07", "2026-10-05", "2026-10-12"]);
const NOME_MES = ["", "janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const ORDEM_GRUPOS = ["Gabinetes do 2º grau", "Turma Recursal", "Varas e unidades de Boa Vista", "Juizados de Boa Vista"];
const $ = s => document.querySelector("#dash-root " + s);
const $$ = s => Array.from(document.querySelectorAll("#dash-root " + s));
const tip = $("#tip");
const enc = v => String(v).replace(/%/g, "%25").replace(/&/g, "%26").replace(/=/g, "%3D");
const where = o => Object.entries(o).map(([k, v]) => k + "=" + enc(v)).join("&");
const dataBR = v => { const t = String(v || "").slice(0, 10).split("-"); return t.length === 3 ? t[2] + "/" + t[1] + "/" + t[0] : "—"; };

const sel = () => {
  const p = dash.params();
  return { mes: p.mes || "2026-09", orgao: p.orgao || "Todos" };
};
function cargaDe(mes) { const k = dash.data("carga"); return k.status === "ok" ? k.data.find(r => r.mes === mes) : null; }
function rotuloMes(mes) { const [a, m] = mes.split("-"); return NOME_MES[Number(m)] + " de " + a; }
function recorte(c) {
  if (!c) return "—";
  const [a, m] = c.mes.split("-");
  return "01–" + String(c.ate).padStart(2, "0") + "/" + m + "/" + a + (c.completo === "sim" ? "" : " (parcial)");
}

function estado(el, st) {
  el.classList.toggle("dash-skeleton", st === "loading");
  if (st === "error" || st === "connect" || st === "declined") { el.innerHTML = ""; const f = document.createElement("div"); f.className = "tj-fail"; f.textContent = "Falha ao carregar"; el.appendChild(f); return false; }
  if (st !== "ok") { if (!el.querySelector(".tj-fail")) el.textContent = ""; return false; }
  return true;
}
function vazio(el, txt) { el.innerHTML = ""; const d = document.createElement("div"); d.className = "tj-empty"; d.textContent = txt; el.appendChild(d); }

function barras(el, rows, key, color, opt = {}) {
  el.innerHTML = "";
  if (!rows.length) { vazio(el, "Sem processos no período."); return; }
  const max = d3.max(rows, r => r.casos) || 1;
  rows.forEach(r => {
    const row = document.createElement(opt.onPick ? "button" : "div");
    row.className = "tj-row" + (opt.destaque && r[key] === opt.destaque ? " sel" : "");
    if (opt.onPick) { row.type = "button"; row.addEventListener("click", () => opt.onPick(r[key])); row.setAttribute("aria-label", "Filtrar por " + r[key] + " (" + F.n(r.casos) + " casos)"); }
    const top = document.createElement("div"); top.className = "tj-row-top";
    const a = document.createElement("span"); a.textContent = r[key]; a.title = r[key];
    const b = document.createElement("span"); b.textContent = F.n(r.casos);
    top.append(a, b);
    const tr = document.createElement("div"); tr.className = "tj-track";
    const fl = document.createElement("div"); fl.className = "tj-fill"; fl.style.width = (r.casos / max * 100) + "%"; fl.style.background = color;
    tr.appendChild(fl); row.append(top, tr); el.appendChild(row);
  });
}

function diario(el, rows, o = {}) {
  el.innerHTML = "";
  if (!rows.length) { vazio(el, "Sem processos no período."); return; }
  const fs = o.fs || 13;
  const W = o.W || el.clientWidth || 360, H = o.H || 240, m = {t: fs, r: 8, b: fs * 2.2, l: 8};
  const svg = d3.select(el).append("svg").attr("width", "100%").attr("viewBox", `0 0 ${W} ${H}`);
  const yMax = d3.max(rows, r => r.casos) || 1;
  const y = d3.scaleLinear([0, yMax * 1.1], [H - m.b, m.t]).nice();
  const ticks = y.ticks(4).filter(Number.isInteger);
  const yt = svg.append("g");
  const tmp = yt.selectAll("text").data(ticks).join("text").text(d => F.n(d)).style("font-size", fs + "px").style("font-family", "var(--pa-mono)");
  let lw = 0; tmp.each(function () { lw = Math.max(lw, this.getComputedTextLength()); });
  m.l = lw + 10;
  const x = d3.scaleBand(rows.map(r => r.data), [m.l, W - m.r]).padding(0.25);
  tmp.attr("x", m.l - 6).attr("y", d => y(d)).attr("dy", "0.32em").attr("text-anchor", "end").style("fill", "#9AA6BA");
  svg.append("g").selectAll("line").data(ticks).join("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", d => y(d)).attr("y2", d => y(d)).style("stroke", "#1F2A40");
  const folga = d => { const wd = new Date(d + "T12:00:00Z").getUTCDay(); return wd === 0 || wd === 6 || FERIADOS.has(d); };
  const bw = Math.min(o.bwMax || 32, x.bandwidth());
  svg.append("g").selectAll("rect").data(rows).join("rect")
    .attr("x", d => x(d.data) + (x.bandwidth() - bw) / 2).attr("width", bw)
    .attr("y", d => y(d.casos)).attr("height", d => Math.max(0, y(0) - y(d.casos))).attr("rx", 2)
    .style("fill", d => folga(d.data) ? "#3A4762" : PA.accent)
    .on("mousemove", function (ev, d) {
      if (o.tip === false) return;
      const box = $(".tj").getBoundingClientRect();
      const dt = new Date(d.data + "T12:00:00Z");
      tip.innerHTML = ""; const a = document.createElement("div"); a.className = "d";
      a.textContent = dt.toLocaleDateString("pt-BR", {weekday: "long", day: "2-digit", month: "2-digit", timeZone: "UTC"}) + (FERIADOS.has(d.data) ? " · feriado" : "");
      const b = document.createElement("div"); const bb = document.createElement("b"); bb.textContent = F.n(d.casos); b.append(bb, document.createTextNode(" casos novos")); tip.append(a, b);
      let lx = ev.clientX - box.left + 12; const tw = tip.offsetWidth || 140;
      if (lx + tw > box.width) lx = ev.clientX - box.left - tw - 12;
      tip.style.left = lx + "px"; tip.style.top = (ev.clientY - box.top - 10) + "px"; tip.style.opacity = 1;
      d3.select(this).style("opacity", .8);
    })
    .on("mouseleave", function () { tip.style.opacity = 0; d3.select(this).style("opacity", 1); });
  const lblW = fs * 1.6;
  const every = Math.max(1, Math.ceil(lblW / x.step()));
  svg.append("g").selectAll("text").data(rows.filter((r, i) => i % every === 0)).join("text")
    .attr("x", d => x(d.data) + x.bandwidth() / 2).attr("y", H - fs * 0.6).attr("text-anchor", "middle")
    .style("font-size", fs + "px").style("font-family", "var(--pa-mono)").style("fill", "#9AA6BA").text(d => d.data.slice(8, 10));
  svg.append("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(0)).attr("y2", y(0)).style("stroke", "#3A4762");
}

function grau(el, rows) {
  el.innerHTML = "";
  if (!rows.length) { vazio(el, "Sem processos no período."); return; }
  const st = document.createElement("div"); st.className = "tj-stack";
  const lg = document.createElement("div"); lg.className = "tj-legend";
  rows.forEach((r) => {
    const cor = grauCor[r.grau] || PA.slate;
    const s = document.createElement("div"); s.style.flex = r.casos; s.style.background = cor; st.appendChild(s);
    const l = document.createElement("div");
    const sw = document.createElement("i"); sw.style.background = cor;
    const tx = document.createElement("div");
    const nm = document.createElement("div"); nm.className = "n"; nm.textContent = r.grau;
    const v = document.createElement("div"); v.className = "v"; v.textContent = F.n(r.casos) + " · " + F.pct(r.share);
    tx.append(nm, v); l.append(sw, tx); lg.appendChild(l);
  });
  el.append(st, lg);
}

/* ---------- filtros ---------- */
const pick = (orgao) => dash.setParams({ orgao: orgao && orgao !== "Todos" ? orgao : null });
function grupoDe(orgao) {
  const o = dash.data("orgaos");
  if (o.status !== "ok") return null;
  const r = o.data.find(x => x.orgao === orgao);
  return r ? r.grupo : null;
}
function desenhaMeses() {
  const box = $("#meses"), k = dash.data("carga"), s = sel();
  box.innerHTML = "";
  if (k.status !== "ok") return;
  k.data.slice().sort((a, b) => a.mes.localeCompare(b.mes)).forEach(c => {
    const b = document.createElement("button"); b.type = "button";
    b.setAttribute("aria-pressed", c.mes === s.mes ? "true" : "false");
    const m = NOME_MES[Number(c.mes.slice(5))];
    b.append(document.createTextNode(m[0].toUpperCase() + m.slice(1)));
    const sm = document.createElement("small"); sm.textContent = (c.completo === "sim" ? "completo" : "parcial") + " · 01–" + String(c.ate).padStart(2, "0");
    b.appendChild(sm);
    b.addEventListener("click", () => dash.setParams({ mes: c.mes }));
    box.appendChild(b);
  });
}
function desenhaOrgaos() {
  const s = sel(), o = dash.data("orgaos"), selEl = $("#orgao-sel");
  const termo = $("#orgao-busca").value.trim().toLowerCase();
  selEl.innerHTML = "";
  const todos = new Option("Todos os órgãos do TJRR", "Todos"); selEl.appendChild(todos);
  if (o.status === "ok") {
    const porOrg = new Map();
    for (const r of o.data) {
      if (!porOrg.has(r.orgao)) porOrg.set(r.orgao, { grupo: r.grupo, orgao: r.orgao, casos: 0 });
      if (r.mes === s.mes) porOrg.get(r.orgao).casos = r.casos;
    }
    const grupos = d3.group(Array.from(porOrg.values()).filter(r => !termo || r.orgao.toLowerCase().includes(termo) || r.grupo.toLowerCase().includes(termo) || r.orgao === s.orgao), r => r.grupo);
    const nomes = Array.from(grupos.keys()).sort((a, b) => {
      const ia = ORDEM_GRUPOS.indexOf(a), ib = ORDEM_GRUPOS.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, "pt-BR");
    });
    for (const g of nomes) {
      const og = document.createElement("optgroup"); og.label = g;
      grupos.get(g).sort((a, b) => a.orgao.localeCompare(b.orgao, "pt-BR", {numeric: true})).forEach(r => {
        const op = new Option(r.orgao + " (" + F.n(r.casos) + ")", r.orgao); og.appendChild(op);
      });
      selEl.appendChild(og);
    }
  }
  selEl.value = s.orgao;
  if (selEl.value !== s.orgao) selEl.value = "Todos";
  $("#orgao-limpar").hidden = s.orgao === "Todos";
}
$("#orgao-sel").addEventListener("change", e => pick(e.target.value));
$("#orgao-busca").addEventListener("input", desenhaOrgaos);
$("#orgao-limpar").addEventListener("click", () => { $("#orgao-busca").value = ""; pick(null); });

/* ---------- tabela ---------- */
let tabRows = [], sortK = "data", sortDir = 1;
function tabela() {
  const q = $("#busca").value.trim().toLowerCase();
  const rows = tabRows.filter(r => !q || [r.numero, r.classe, r.assunto, r.orgao, r.comarca, r.grau].join(" ").toLowerCase().includes(q))
    .sort((a, b) => sortDir * String(a[sortK]).localeCompare(String(b[sortK]), "pt-BR", {numeric: true}));
  const tb = $("#tabela tbody"); tb.innerHTML = "";
  const frag = document.createDocumentFragment();
  rows.forEach(r => {
    const tr = document.createElement("tr"); tr.dataset.key = r.id;
    [["numero"], ["data"], ["grau"], ["classe"], ["assunto", "opt"], ["orgao", "opt"], ["comarca"]].forEach(([k, c]) => {
      const td = document.createElement("td"); if (c) td.className = c;
      td.textContent = k === "data" ? dataBR(r.data) : r[k]; tr.appendChild(td);
    });
    frag.appendChild(tr);
  });
  tb.appendChild(frag);
  $("#contagem").textContent = F.n(rows.length) + " de " + F.n(tabRows.length) + " processos";
  $$("#tabela th").forEach(th => th.setAttribute("aria-sort", th.dataset.field === sortK ? (sortDir > 0 ? "ascending" : "descending") : "none"));
}
$("#busca").addEventListener("input", tabela);
$$("#tabela th button").forEach(b => b.addEventListener("click", () => {
  const k = b.dataset.k; if (sortK === k) sortDir = -sortDir; else { sortK = k; sortDir = 1; } tabela();
}));

/* ---------- modo TV ---------- */
const TV_DUR = 20000;
const tvRoot = $(".tj"), tvStage = $("#tv-stage"), tvProg = $("#tv-prog");
const tvScreens = $$(".tv-scr"), tvPills = $$(".tv-pill");
let tvOn = false, tvScr = 0, tvPaused = false, tvTimer = null;
tvStage.style.setProperty("--tv-dur", TV_DUR / 1000 + "s");
function tvSchedule() {
  clearTimeout(tvTimer);
  tvProg.classList.remove("run"); void tvProg.offsetWidth;
  if (!tvOn) return;
  if (tvPaused) { tvProg.style.width = "100%"; return; }
  tvProg.style.width = ""; tvProg.classList.add("run");
  tvTimer = setTimeout(() => tvShow((tvScr + 1) % tvScreens.length), TV_DUR);
}
function tvShow(i) {
  tvScr = i;
  tvScreens.forEach((s, k) => s.classList.toggle("on", k === i));
  tvPills.forEach((p, k) => p.setAttribute("aria-current", k === i ? "true" : "false"));
  drawTV(); tvSchedule();
}
function tvEnter() { tvOn = true; tvRoot.classList.add("is-tv"); tvShow(0); try { dash.setLink("tv"); } catch (e) {} }
function tvExit() {
  tvOn = false; tvRoot.classList.remove("is-tv"); clearTimeout(tvTimer);
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
  try { dash.setLink("indicadores"); } catch (e) {}
  drawAll();
}
$("#tj-tv").addEventListener("click", tvEnter);
$("#tv-exit").addEventListener("click", tvExit);
$("#tv-pause").addEventListener("click", (ev) => { tvPaused = !tvPaused; ev.currentTarget.textContent = tvPaused ? "Retomar rotação" : "Pausar rotação"; tvSchedule(); });
$("#tv-full").addEventListener("click", (ev) => {
  const b = ev.currentTarget;
  try {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    if (!tvStage.requestFullscreen) { b.textContent = "Tela cheia indisponível aqui"; return; }
    const p = tvStage.requestFullscreen(); if (p && p.catch) p.catch(() => { b.textContent = "Tela cheia indisponível aqui"; });
  } catch (e) { b.textContent = "Tela cheia indisponível aqui"; }
});
document.addEventListener("fullscreenchange", () => { $("#tv-full").textContent = document.fullscreenElement ? "Sair da tela cheia" : "Tela cheia"; });
tvPills.forEach((p, k) => p.addEventListener("click", () => tvShow(k)));
try { new ResizeObserver(() => { if (tvOn) drawTV(); }).observe(tvStage); } catch (e) {}

/* ---------- leitura da seleção ---------- */
function linhas(id, filtro) { const d = dash.data(id); return d.status === "ok" ? d.data.filter(filtro) : []; }
function pares(s) { return r => r.mes === s.mes && r.orgao === s.orgao; }
function pares_unidades(s) {
  const g = s.orgao === "Todos" ? "Todos" : grupoDe(s.orgao);
  return { grupo: g, rows: linhas("top_orgaos", r => r.mes === s.mes && r.grupo === g) };
}

function fmtCampo(f, v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  if (f === "total" || f === "casos") return F.n(v);
  if (f.startsWith("share")) return F.pct(v);
  return F.sgn(v);
}
function marca(el, src, w) { el.dataset.source = src; el.dataset.where = where(w); el.removeAttribute("data-row"); }

function drawResumo(s) {
  const res = dash.data("resumo"), cmp = dash.data("comparativo");
  const r = res.status === "ok" ? res.data.find(pares(s)) : null;
  const c1 = cmp.status === "ok" ? cmp.data.find(x => x.mes === s.mes && x.orgao === s.orgao && String(x.ordem) === "1") : null;
  const c2 = cmp.status === "ok" ? cmp.data.find(x => x.mes === s.mes && x.orgao === s.orgao && String(x.ordem) === "2") : null;
  const c1t = cmp.status === "ok" ? cmp.data.find(x => x.mes === s.mes && x.orgao === "Todos" && String(x.ordem) === "1") : null;
  const c2t = cmp.status === "ok" ? cmp.data.find(x => x.mes === s.mes && x.orgao === "Todos" && String(x.ordem) === "2") : null;
  const per1 = (c1 || c1t || {}).periodo || "ano anterior", per2 = (c2 || c2t || {}).periodo || "mês anterior";
  const filtrado = s.orgao !== "Todos";

  // KPI 3 alterna entre Boa Vista e participação no TJRR
  const k3v = $("#k3 .tj-big");
  k3v.dataset.field = filtrado ? "share_tj" : "share_bv";
  $("#k3-t").textContent = filtrado ? "Participação no TJRR" : "Comarca de Boa Vista";
  $("#k3-s").textContent = filtrado ? "dos casos novos do tribunal no período" : "dos casos novos do período";
  $$('[data-source="resumo"]').forEach(el => {
    if (el.closest("#resumo-texto")) return;
    if (el.closest("#tv-bv") && filtrado) el.dataset.field = "share_tj";
    else if (el.closest("#tv-bv")) el.dataset.field = "share_bv";
    marca(el, "resumo", { mes: s.mes, orgao: s.orgao });
    el.classList.toggle("dash-skeleton", res.status === "loading");
    const f = el.dataset.field, v = r ? r[f] : null;
    el.textContent = res.status === "ok" ? (r ? fmtCampo(f, v) : (f === "total" ? "0" : "—")) : "—";
    el.classList.toggle("up", f.startsWith("var") && v > 0);
    el.classList.toggle("down", f.startsWith("var") && v < 0);
  });
  // KPIs de comparação
  const kp = $$(".tj-kpis .tj-card");
  [[kp[0], c2, "2", "vs. " + per2.replace(/ \(.*| inteiro/, "")], [kp[1], c1, "1", "vs. " + per1.replace(/ \(.*| inteiro/, "")]].forEach(([card, c, ordem, tit]) => {
    card.querySelector(".tj-eye").textContent = tit;
    const per = card.querySelector(".per"), cas = card.querySelector(".cas");
    marca(per, "comparativo", { mes: s.mes, orgao: s.orgao, ordem }); marca(cas, "comparativo", { mes: s.mes, orgao: s.orgao, ordem });
    per.textContent = c ? c.periodo : (ordem === "1" ? per1 : per2);
    cas.textContent = c ? F.n(Number(c.casos)) : "0";
  });
  $("#tv-k1").textContent = "vs. " + per2.replace(/ \(.*| inteiro/, ""); $("#tv-k1s").textContent = per2.includes("inteiro") ? "mês inteiro" : per2.replace(/^.*\(/, "").replace(")", "");
  $("#tv-k2").textContent = "vs. " + per1.replace(/ \(.*| inteiro/, ""); $("#tv-k2s").textContent = per1.includes("inteiro") ? "mês inteiro" : per1.replace(/^.*\(/, "").replace(")", "");
  $("#tv-s2-eye").textContent = "Contra " + per1.replace(/ \(.*| inteiro/, "");
  $("#tv-s2-mid").innerHTML = ""; $("#tv-s2-mid").append("sobre", document.createElement("br"), per2.replace(/ \(.*| inteiro/, ""));

  // frase-resumo
  const take = $("#resumo-texto"); take.innerHTML = "";
  if (res.status !== "ok" || cmp.status !== "ok") { take.textContent = res.status === "loading" ? "" : "Não foi possível carregar os totais."; return; }
  const span = (txt, f) => { const e = document.createElement("span"); e.dataset.source = "resumo"; e.dataset.field = f; e.dataset.where = where({ mes: s.mes, orgao: s.orgao }); e.textContent = txt; return e; };
  const k = cargaDe(s.mes);
  const quando = k && k.completo === "sim" ? "em " + rotuloMes(s.mes) : "de 01 a " + String(k ? k.ate : "").padStart(2, "0") + " de " + rotuloMes(s.mes);
  take.append("casos novos " + quando + (filtrado ? " em " + s.orgao : "") + ": ");
  if (r && r.var_mes !== null) take.append(span(F.sgn(r.var_mes), "var_mes"), " sobre " + per2 + " e ");
  else take.append("sem base em " + per2 + " e ");
  if (r && r.var_ano !== null) take.append(span(F.sgn(r.var_ano), "var_ano"), " ante " + per1 + ".");
  else take.append("sem base em " + per1 + ".");
  if (!filtrado && r) take.append(" Boa Vista responde por ", span(F.pct(r.share_bv), "share_bv"), " das entradas.");
  if (filtrado && r && r.share_tj !== null) take.append(" Isso é ", span(F.pct(r.share_tj), "share_tj"), " do tribunal.");
}

function drawCabecalho(s) {
  const k = cargaDe(s.mes), filtrado = s.orgao !== "Todos";
  $$('[data-source="carga"]').forEach(el => {
    if (el.id === "meses" || el.dataset.field === "ate") return;
    el.dataset.where = where({ mes: s.mes });
    el.textContent = k ? dataBR(k[el.dataset.field]) : "—";
  });
  [$("#recorte"), $("#tv-recorte")].forEach(el => {
    el.innerHTML = "";
    if (!k) { el.textContent = "—"; return; }
    const d = document.createElement("span"); d.dataset.source = "carga"; d.dataset.field = "ate"; d.dataset.where = where({ mes: s.mes }); d.textContent = String(k.ate);
    const [a, m] = s.mes.split("-");
    el.append("01–", d, "/" + m + "/" + a + (k.completo === "sim" ? "" : " (parcial)"));
  });
  const nome = NOME_MES[Number(s.mes.slice(5))];
  $("#titulo").textContent = "Casos novos · " + nome;
  $("#tv-titulo").textContent = "Casos novos · " + nome;
  $("#tv-filtro").textContent = filtrado ? s.orgao : "Justiça Aberta Roraima · dados do TJRR";
  $("#hero-eye").textContent = filtrado ? (grupoDe(s.orgao) || "Órgão julgador") : "Processos ajuizados no TJRR";
  $("#chip").hidden = !filtrado; $("#chip-nome").textContent = filtrado ? s.orgao : "";
  $("#tv-lead1").textContent = k && k.completo === "sim" ? "processos ajuizados em " + rotuloMes(s.mes) + "." : "processos ajuizados de 01 a " + (k ? String(k.ate).padStart(2, "0") : "—") + " de " + rotuloMes(s.mes) + ".";
  $("#tv-s2-lead").textContent = "casos novos em relação ao mesmo período do ano passado.";
  // nota
  const cT = dash.data("comparativo"), base = cT.status === "ok" ? cT.data.filter(x => x.mes === s.mes && x.orgao === "Todos") : [];
  const p1 = (base.find(x => String(x.ordem) === "1") || {}).periodo, p2 = (base.find(x => String(x.ordem) === "2") || {}).periodo;
  const nt = $("#nota-t"), nx = $("#nota-x");
  if (!k) { nt.textContent = "—"; nx.textContent = ""; }
  else {
    const cg = document.createElement("span"); cg.dataset.source = "carga"; cg.dataset.field = "carga"; cg.dataset.where = where({ mes: s.mes }); cg.textContent = dataBR(k.carga);
    nx.innerHTML = "";
    if (k.completo === "sim") {
      nt.textContent = nome[0].toUpperCase() + nome.slice(1) + " completo";
      nx.append("Remessa do TJRR carregada em ", cg, " na API Pública do DataJud (índice api_publica_tjrr). As comparações usam " + (p2 || "o mês anterior") + " e " + (p1 || "o mesmo mês do ano anterior") + ".");
    } else {
      nt.textContent = nome[0].toUpperCase() + nome.slice(1) + " ainda parcial";
      nx.append("A última remessa do TJRR, carregada em ", cg, ", traz processos até " + String(k.ate).padStart(2, "0") + "/" + s.mes.slice(5) + ". As comparações usam os mesmos dias: " + (p2 || "mês anterior") + " e " + (p1 || "ano anterior") + ".");
    }
  }
  const feri = s.mes === "2026-09" ? "e o feriado de 7/09" : s.mes === "2026-10" ? "e os feriados de 5/10 (estadual) e 12/10" : "e feriados";
  $("#dia-sub").textContent = recorte(k) + " · barras cinzas: fins de semana " + feri;
}

function drawCards(s) {
  const filtrado = s.orgao !== "Todos";
  const d = dash.data("por_dia"), elD = $("#chart-dia"); if (estado(elD, d.status)) diario(elD, d.data.filter(pares(s)));
  const g = dash.data("por_grau"), elG = $("#chart-grau"); if (estado(elG, g.status)) grau(elG, g.data.filter(pares(s)));
  const c = dash.data("top_classes"), elC = $("#chart-classes"); if (estado(elC, c.status)) barras(elC, c.data.filter(pares(s)), "classe", PA.accent);
  const a = dash.data("top_assuntos"), elA = $("#chart-assuntos"); if (estado(elA, a.status)) barras(elA, a.data.filter(pares(s)), "assunto", PA.accent);
  $("#comarcas").hidden = filtrado;
  const m = dash.data("por_comarca"), elM = $("#chart-comarcas"); if (!filtrado && estado(elM, m.status)) barras(elM, m.data.filter(r => r.mes === s.mes), "comarca", PA.blue);
  const o = dash.data("top_orgaos"), elO = $("#chart-orgaos");
  const un = pares_unidades(s);
  $("#org-eye").textContent = filtrado ? (un.grupo || "Órgãos julgadores") : "Órgãos julgadores";
  $("#org-h").textContent = filtrado ? "Unidades do mesmo grupo." : "Os dez órgãos com mais entradas.";
  $("#org-sub").textContent = filtrado ? "Em laranja, o órgão filtrado · clique noutro para trocar" : "Clique num órgão para filtrar o dashboard";
  if (estado(elO, o.status)) barras(elO, un.rows, "unidade", PA.gold, { onPick: pick, destaque: s.orgao });
}

function drawTV() {
  if (!tvOn) return;
  const s = sel(), filtrado = s.orgao !== "Todos";
  const u = tvStage.clientWidth / 1920;
  const g = dash.data("por_grau"), eG = $(".tv-grau"); if (estado(eG, g.status)) grau(eG, g.data.filter(pares(s)));
  const c = dash.data("top_classes"), eC = $("#tv-classes"); if (estado(eC, c.status)) barras(eC, c.data.filter(pares(s)).slice(0, 5), "classe", PA.accent);
  const eM = $("#tv-comarcas");
  $("#tv-c3-eye").textContent = filtrado ? "Participação" : "Comarcas";
  $("#tv-bv .t").innerHTML = ""; $("#tv-bv .t").append(...(filtrado ? ["dos casos novos", document.createElement("br"), "do TJRR"] : ["dos casos novos", document.createElement("br"), "são de Boa Vista"]));
  $("#tv-c3-sub").textContent = filtrado ? "Assuntos mais frequentes:" : "Fora da capital:";
  if (filtrado) { const a = dash.data("top_assuntos"); eM.dataset.source = "top_assuntos"; if (estado(eM, a.status)) barras(eM, a.data.filter(pares(s)).slice(0, 7), "assunto", PA.blue); }
  else { const m = dash.data("por_comarca"); eM.dataset.source = "por_comarca"; if (estado(eM, m.status)) barras(eM, m.data.filter(r => r.mes === s.mes && r.comarca !== "Boa Vista").slice(0, 7), "comarca", PA.blue); }
  const un = pares_unidades(s), o = dash.data("top_orgaos"), eO = $("#tv-orgaos");
  $("#tv-org-eye").textContent = filtrado ? (un.grupo || "Órgãos julgadores") : "Órgãos julgadores";
  $("#tv-org-h").textContent = filtrado ? "Unidades do mesmo grupo." : "Onde mais chegaram processos.";
  if (estado(eO, o.status)) barras(eO, un.rows.slice(0, 8), "unidade", PA.gold, { destaque: s.orgao });
  const a = dash.data("top_assuntos"), eA = $("#tv-assuntos"); if (estado(eA, a.status)) barras(eA, a.data.filter(pares(s)), "assunto", PA.accent);
  const top = a.status === "ok" ? a.data.find(r => pares(s)(r) && r.pos === 1) : null;
  [$("#tv-top-assunto"), $("#tv-top-casos")].forEach(el => { marca(el, "top_assuntos", { mes: s.mes, orgao: s.orgao, pos: 1 }); el.textContent = top ? (el.dataset.field === "casos" ? F.n(top.casos) : top.assunto) : "—"; });
  const d = dash.data("por_dia"), eD = $("#tv-dia");
  if (estado(eD, d.status) && eD.clientHeight > 0) diario(eD, d.data.filter(pares(s)), { H: eD.clientHeight, fs: 20 * u, bwMax: 64 * u, tip: false, W: eD.clientWidth });
}

function tickers(s) {
  const t = dash.data("destaques");
  $$(".tj-ticker .trk").forEach(trk => {
    trk.innerHTML = ""; trk.classList.remove("run");
    if (t.status !== "ok") return;
    const rows = t.data.filter(pares(s));
    rows.concat(rows).forEach(r => {
      const sp = document.createElement("span"); sp.className = "it";
      const b = document.createElement("b"); b.textContent = F.n(r.casos);
      sp.append(b, document.createTextNode(r.texto)); trk.appendChild(sp);
    });
    if (rows.length) trk.classList.add("run");
  });
}

function drawAll() {
  const s = sel();
  desenhaMeses(); desenhaOrgaos(); drawCabecalho(s); drawResumo(s); drawCards(s);
  const c = dash.data("casos");
  if (c.status === "ok") { tabRows = c.data.filter(r => r.mes === s.mes && (s.orgao === "Todos" || r.orgao === s.orgao)); tabela(); }
  else { tabRows = []; $("#tabela tbody").innerHTML = ""; $("#contagem").textContent = c.status === "loading" ? "" : "Falha ao carregar"; }
  tickers(s); drawTV();
}
dash.onData(drawAll);
if (location.hash === "#tv") tvEnter();
})();
