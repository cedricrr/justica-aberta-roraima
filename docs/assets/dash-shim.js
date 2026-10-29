/*
 * dash-shim.js — substitui, num site estático, as funções do runtime de dashboard
 * em que a página foi criada: dash.data, dash.calc, dash.onData, dash.params,
 * dash.setParams, dash.resetParams, dash.setLink e dash.colors.
 *
 * - Os conjuntos de dados são CSVs listados em DASH_DATASETS (carregados com d3.csv).
 * - Os cálculos (dash.calc) rodam quando todas as entradas estão prontas.
 * - Os filtros (mes, orgao) ficam na URL (?mes=2026-10&orgao=...), para que um link
 *   ou a TV abram já na seleção certa.
 */
(function () {
  "use strict";

  const DASH_DATASETS = {
    casos: "dados/tjrr_casos.csv",
    comparativo: "dados/tjrr_comparativo.csv",
    carga: "dados/tjrr_carga.csv"
  };
  const DEFAULT_PARAMS = { mes: "2026-09", orgao: null };

  const store = {};      // id -> { status, data, columns, message }
  const calcs = {};      // id -> { inputs, fn, title, description }
  const listeners = [];
  let params = lerParams();

  function lerParams() {
    const q = new URLSearchParams(location.search);
    const p = Object.assign({}, DEFAULT_PARAMS);
    for (const k of Object.keys(DEFAULT_PARAMS)) if (q.has(k)) p[k] = q.get(k) || null;
    return p;
  }

  function gravarParams() {
    const q = new URLSearchParams(location.search);
    for (const [k, v] of Object.entries(params)) {
      if (v === null || v === undefined || v === DEFAULT_PARAMS[k]) q.delete(k); else q.set(k, v);
    }
    const s = q.toString();
    history.replaceState(null, "", location.pathname + (s ? "?" + s : "") + location.hash);
  }

  function estado(id) {
    if (store[id]) return store[id];
    if (calcs[id]) return calcular(id);
    return { status: "missing", data: [], columns: [], message: "Fonte desconhecida: " + id };
  }

  function calcular(id) {
    const c = calcs[id];
    const entradas = c.inputs.map(estado);
    const falha = entradas.find(e => e.status === "error" || e.status === "missing");
    if (falha) return { status: "error", data: [], columns: [], message: falha.message };
    if (entradas.some(e => e.status !== "ok")) return { status: "loading", data: [], columns: [] };
    try {
      const out = c.fn(...entradas.map(e => e.data));
      const data = Array.isArray(out) ? out : [out];
      store[id] = { status: "ok", data, columns: data.length ? Object.keys(data[0]) : [] };
    } catch (e) {
      console.error("Cálculo", id, e);
      store[id] = { status: "error", data: [], columns: [], message: String(e) };
    }
    return store[id];
  }

  let agendado = false;
  function notificar() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => {
      agendado = false;
      for (const fn of listeners) {
        try { fn(); } catch (e) { console.error(e); }
      }
    });
  }

  window.dash = {
    colors: ["#FF7A45", "#7CC4FF", "#F3D27A", "#8E9BB3", "#6ED6A6", "#C59BFF", "#FF9A8A", "#B4BFD0"],
    calc(id, def) { calcs[id] = def; },
    loader() { /* sem uso no site estático */ },
    data(id) {
      const e = estado(id);
      return { status: e.status, data: e.data || [], columns: e.columns || [], message: e.message, refreshing: false, meta: [] };
    },
    onData(fn) { listeners.push(fn); try { fn(); } catch (e) { console.error(e); } },
    params() { return Object.assign({}, params); },
    setParams(p) { params = Object.assign({}, params, p); gravarParams(); notificar(); },
    resetParams() { params = Object.assign({}, DEFAULT_PARAMS); gravarParams(); notificar(); },
    setLink(nome) {
      const url = location.pathname + location.search + (nome && nome !== "indicadores" ? "#" + nome : "");
      history.replaceState(null, "", url);
    },
    refresh() { /* dados estáticos: nada a fazer */ }
  };

  // Carrega os CSVs assim que a página termina de ler os scripts.
  for (const id of Object.keys(DASH_DATASETS)) store[id] = { status: "loading", data: [], columns: [] };
  document.addEventListener("DOMContentLoaded", () => {
    for (const [id, url] of Object.entries(DASH_DATASETS)) {
      d3.csv(url).then(rows => {
        store[id] = { status: "ok", data: rows, columns: rows.columns || [] };
      }).catch(err => {
        store[id] = { status: "error", data: [], columns: [], message: "Não foi possível ler " + url + ": " + err.message };
      }).finally(() => {
        for (const k of Object.keys(calcs)) delete store[k];  // recalcula com a entrada nova
        notificar();
      });
    }
  });

  let largura = window.innerWidth;
  window.addEventListener("resize", () => {
    if (Math.abs(window.innerWidth - largura) < 8) return;
    largura = window.innerWidth;
    notificar();
  });
  window.addEventListener("popstate", () => { params = lerParams(); notificar(); });
})();
