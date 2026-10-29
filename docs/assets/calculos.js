/* Cálculos do painel: agregações por mês e por órgão a partir dos CSVs. */
(() => {
const ptBR = d3.formatLocale({decimal: ",", thousands: ".", grouping: [3], currency: ["R$", ""]});
window.tjFmt = { n: ptBR.format(",d"), pct: ptBR.format(".1%"), sgn: ptBR.format("+.1%") };

dash.calc("resumo", {
  title: "Totais e variações",
  description: "Por mês e por órgão (ou todos): casos novos, variação sobre o mês anterior e o mesmo mês do ano anterior (mesmos dias quando o mês está incompleto), participação de Boa Vista e participação no total do TJRR.",
  inputs: ["casos", "comparativo"],
  fn: (casos, comparativo) => {
    const meses = Array.from(new Set(casos.map(r => r.mes))).sort();
    const orgaos = Array.from(new Set(casos.map(r => r.orgao)));
    const tot = new Map(), bv = new Map();
    for (const r of casos) for (const o of ["Todos", r.orgao]) {
      const k = r.mes + "|" + o;
      tot.set(k, (tot.get(k) || 0) + 1);
      if (r.comarca === "Boa Vista") bv.set(k, (bv.get(k) || 0) + 1);
    }
    const base = new Map(comparativo.map(c => [c.mes + "|" + c.orgao + "|" + c.ordem, Number(c.casos)]));
    const out = [];
    for (const mes of meses) for (const orgao of ["Todos", ...orgaos]) {
      const k = mes + "|" + orgao, total = tot.get(k) || 0;
      const b1 = base.get(k + "|1"), b2 = base.get(k + "|2");
      out.push({ mes, orgao, total,
        var_ano: b1 ? total / b1 - 1 : null,
        var_mes: b2 ? total / b2 - 1 : null,
        share_bv: total ? (bv.get(k) || 0) / total : null,
        share_tj: (tot.get(mes + "|Todos") || 0) ? total / tot.get(mes + "|Todos") : null });
    }
    return out;
  }
});

dash.calc("por_dia", {
  title: "Casos novos por dia",
  description: "Contagem por data de ajuizamento, por mês e por órgão, do dia 1 ao último dia com dados do mês (dias sem processos contam zero).",
  inputs: ["casos", "carga"],
  fn: (casos, carga) => {
    const cont = new Map();
    for (const r of casos) for (const o of ["Todos", r.orgao]) {
      const k = r.mes + "|" + o + "|" + r.data;
      cont.set(k, (cont.get(k) || 0) + 1);
    }
    const orgaos = Array.from(new Set(casos.map(r => r.orgao)));
    const out = [];
    for (const c of carga) {
      const ate = Number(c.ate);
      for (const orgao of ["Todos", ...orgaos]) for (let d = 1; d <= ate; d++) {
        const data = c.mes + "-" + String(d).padStart(2, "0");
        out.push({ mes: c.mes, orgao, data, casos: cont.get(c.mes + "|" + orgao + "|" + data) || 0 });
      }
    }
    return out;
  }
});

dash.calc("por_grau", {
  title: "Casos novos por grau",
  description: "Contagem e participação por grau de jurisdição, por mês e por órgão.",
  inputs: ["casos"],
  fn: (casos) => {
    const cont = new Map(), tot = new Map();
    for (const r of casos) for (const o of ["Todos", r.orgao]) {
      const g = r.mes + "|" + o, k = g + "|" + r.grau;
      cont.set(k, (cont.get(k) || 0) + 1); tot.set(g, (tot.get(g) || 0) + 1);
    }
    return Array.from(cont, ([k, n]) => { const [mes, orgao, grau] = k.split("|"); return { mes, orgao, grau, casos: n, share: n / tot.get(mes + "|" + orgao) }; })
      .sort((a, b) => b.casos - a.casos);
  }
});

dash.calc("top_classes", {
  title: "Classes mais frequentes",
  description: "As 10 classes processuais com mais casos novos, por mês e por órgão.",
  inputs: ["casos"],
  fn: (casos) => {
    const cont = new Map();
    for (const r of casos) for (const o of ["Todos", r.orgao]) {
      const g = r.mes + "|" + o;
      if (!cont.has(g)) cont.set(g, new Map());
      cont.get(g).set(r.classe, (cont.get(g).get(r.classe) || 0) + 1);
    }
    const out = [];
    for (const [g, m] of cont) {
      const [mes, orgao] = g.split("|");
      Array.from(m, ([classe, n]) => ({ classe, casos: n })).sort((a, b) => b.casos - a.casos || a.classe.localeCompare(b.classe)).slice(0, 10)
        .forEach((r, i) => out.push({ mes, orgao, pos: i + 1, classe: r.classe, casos: r.casos }));
    }
    return out;
  }
});

dash.calc("top_assuntos", {
  title: "Assuntos mais frequentes",
  description: "Os 10 assuntos (primeiro informado) com mais casos novos, por mês e por órgão.",
  inputs: ["casos"],
  fn: (casos) => {
    const cont = new Map();
    for (const r of casos) for (const o of ["Todos", r.orgao]) {
      const g = r.mes + "|" + o;
      if (!cont.has(g)) cont.set(g, new Map());
      cont.get(g).set(r.assunto, (cont.get(g).get(r.assunto) || 0) + 1);
    }
    const out = [];
    for (const [g, m] of cont) {
      const [mes, orgao] = g.split("|");
      Array.from(m, ([assunto, n]) => ({ assunto, casos: n })).sort((a, b) => b.casos - a.casos || a.assunto.localeCompare(b.assunto)).slice(0, 10)
        .forEach((r, i) => out.push({ mes, orgao, pos: i + 1, assunto: r.assunto, casos: r.casos }));
    }
    return out;
  }
});

dash.calc("por_comarca", {
  title: "Casos novos por comarca",
  description: "Contagem por município do órgão julgador, por mês (todos os órgãos).",
  inputs: ["casos"],
  fn: (casos) => {
    const cont = new Map();
    for (const r of casos) { const k = r.mes + "|" + r.comarca; cont.set(k, (cont.get(k) || 0) + 1); }
    return Array.from(cont, ([k, n]) => { const [mes, comarca] = k.split("|"); return { mes, comarca, casos: n }; }).sort((a, b) => b.casos - a.casos);
  }
});

dash.calc("top_orgaos", {
  title: "Órgãos com mais entradas",
  description: "Por mês: os 10 órgãos com mais casos novos no tribunal (grupo Todos) e todos os órgãos de cada grupo (gabinetes, Turma Recursal, varas e juizados de Boa Vista, cada comarca do interior).",
  inputs: ["casos"],
  fn: (casos) => {
    const cont = new Map();
    for (const r of casos) { const k = r.mes + "|" + r.grupo + "|" + r.orgao; cont.set(k, (cont.get(k) || 0) + 1); }
    const rows = Array.from(cont, ([k, n]) => { const [mes, grupo, unidade] = k.split("|"); return { mes, grupo, unidade, casos: n }; })
      .sort((a, b) => b.casos - a.casos || a.unidade.localeCompare(b.unidade, "pt-BR", {numeric: true}));
    const out = [];
    for (const mes of Array.from(new Set(rows.map(r => r.mes)))) {
      rows.filter(r => r.mes === mes).slice(0, 10).forEach(r => out.push({ mes, grupo: "Todos", unidade: r.unidade, casos: r.casos }));
    }
    return out.concat(rows);
  }
});

dash.calc("orgaos", {
  title: "Lista de órgãos para o filtro",
  description: "Cada gabinete, vara ou juizado com seu grupo e o número de casos novos em cada mês.",
  inputs: ["casos"],
  fn: (casos) => {
    const cont = new Map();
    for (const r of casos) { const k = r.grupo + "|" + r.orgao + "|" + r.mes; cont.set(k, (cont.get(k) || 0) + 1); }
    return Array.from(cont, ([k, n]) => { const [grupo, orgao, mes] = k.split("|"); return { grupo, orgao, mes, casos: n }; });
  }
});

dash.calc("destaques", {
  title: "Letreiro do rodapé",
  description: "As seis classes e os seis assuntos mais frequentes, intercalados, por mês e por órgão.",
  inputs: ["top_classes", "top_assuntos"],
  fn: (top_classes, top_assuntos) => {
    const out = [];
    for (const c of top_classes) if (c.pos <= 6) out.push({ mes: c.mes, orgao: c.orgao, ordem: c.pos * 2 - 1, texto: "processos de " + c.classe, casos: c.casos });
    for (const a of top_assuntos) if (a.pos <= 6) out.push({ mes: a.mes, orgao: a.orgao, ordem: a.pos * 2, texto: "com assunto " + a.assunto, casos: a.casos });
    return out.sort((a, b) => a.ordem - b.ordem);
  }
});
})();
