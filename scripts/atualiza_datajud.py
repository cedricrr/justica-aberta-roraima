#!/usr/bin/env python3
"""Atualiza os arquivos do dashboard TJRR (setembro e outubro de 2026) a partir da API Pública do DataJud.
Uso: python3 atualiza_datajud.py <carga_atual_iso> <pasta_saida> [--forcar]
Imprime SEM_NOVIDADE se a carga não mudou; NOVA_CARGA e um resumo se mudou (ou com --forcar).
Gera: tjrr_casos.csv, tjrr_comparativo.csv, tjrr_carga.csv
"""
import calendar, csv, datetime, json, os, sys, time, urllib.error, urllib.request

U = "https://api-publica.datajud.cnj.jus.br/api_publica_tjrr/_search"
# Chave pública divulgada pelo CNJ; pode ser trocada pelo secret DATAJUD_KEY sem mexer no código.
KEY = os.environ.get("DATAJUD_KEY") or "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=="
H = {"Authorization": "APIKey " + KEY, "Content-Type": "application/json"}
MESES = ["2026-09", "2026-10"]
NOME_MES = {1: "janeiro", 2: "fevereiro", 3: "março", 4: "abril", 5: "maio", 6: "junho", 7: "julho",
            8: "agosto", 9: "setembro", 10: "outubro", 11: "novembro", 12: "dezembro"}
MUN = {1400027: 'Amajari', 1400050: 'Alto Alegre', 1400100: 'Boa Vista', 1400159: 'Bonfim', 1400175: 'Cantá',
       1400209: 'Caracaraí', 1400233: 'Caroebe', 1400282: 'Iracema', 1400308: 'Mucajaí', 1400407: 'Normandia',
       1400456: 'Pacaraima', 1400472: 'Rorainópolis', 1400506: 'São João da Baliza', 1400605: 'São Luiz', 1400704: 'Uiramutã'}
GRAU = {'G1': '1º grau', 'G2': '2º grau', 'JE': 'Juizado Especial', 'TR': 'Turma Recursal'}
MINUSC = {"da", "de", "do", "das", "dos", "e", "a", "o", "em"}
CAMPOS = ["id", "numeroProcesso", "dataAjuizamento", "grau", "classe", "assuntos", "orgaoJulgador", "nivelSigilo"]


def q(body):
    for t in range(8):
        try:
            r = urllib.request.Request(U, data=json.dumps(body).encode(), headers=H, method="POST")
            return json.load(urllib.request.urlopen(r, timeout=180))
        except urllib.error.HTTPError as e:
            if e.code == 401:
                sys.exit("ERRO_CHAVE: a API recusou a chave pública (401)")
            if e.code != 429 and e.code < 500:
                raise
            time.sleep(int(e.headers.get("Retry-After") or 0) or 15 * (t + 1))
        except (urllib.error.URLError, TimeoutError):
            time.sleep(15 * (t + 1))
    sys.exit("ERRO_LIMITE: a API continuou recusando os pedidos")


def baixa(ini, fim):
    """Processos com dataAjuizamento em [ini, fim) — datas 'AAAA-MM-DD'."""
    g, l = ini.replace("-", "") + "000000", fim.replace("-", "") + "000000"
    docs, after, vistos = [], None, set()
    while True:
        b = {"size": 1000, "_source": CAMPOS,
             "query": {"range": {"dataAjuizamento": {"gte": g, "lt": l}}},
             "sort": [{"@timestamp": {"order": "asc"}}, {"id.keyword": {"order": "asc"}}]}
        if after:
            b["search_after"] = after
        h = q(b)["hits"]["hits"]
        if not h:
            break
        for x in h:
            s = x["_source"]
            if s["id"] not in vistos and s.get("nivelSigilo", 0) == 0:
                vistos.add(s["id"])
                docs.append(s)
        after = h[-1]["sort"]
        time.sleep(3)
    return docs


def titulo(t):
    out = []
    for i, w in enumerate(t.strip().split()):
        lw = w.lower()
        if i and lw in MINUSC:
            out.append(lw)
        elif any(c.isdigit() for c in w):
            out.append(lw)
        elif lw in {"tjrr", "cejusc", "nupemec", "cnj"}:
            out.append(w.upper())
        else:
            out.append(lw[:1].upper() + lw[1:])
    return " ".join(out)


def orgao(x):
    o = x["orgaoJulgador"]
    nome = titulo(o["nome"])
    com = MUN.get(o.get("codigoMunicipioIBGE"), "Não informado")
    g = x["grau"]
    if g == "G2":
        return "Gabinetes do 2º grau", nome, com
    if g == "TR":
        return "Turma Recursal", nome, com
    if com == "Boa Vista":
        return ("Juizados de Boa Vista" if g == "JE" else "Varas e unidades de Boa Vista"), nome, com
    return "Comarca de " + com, nome + " · " + com, com


def assunto(x):
    a = x.get('assuntos') or []
    while a and isinstance(a[0], list):
        a = a[0]
    for i in a:
        if isinstance(i, dict) and i.get('nome'):
            return i['nome'].strip()
    return 'Não informado'


def mais(d, n):
    return (datetime.date.fromisoformat(d) + datetime.timedelta(days=n)).isoformat()


def mes_ant(ano, mes):
    return (ano - 1, 12) if mes == 1 else (ano, mes - 1)


def main():
    anterior, saida = sys.argv[1], sys.argv[2]
    forcar = "--forcar" in sys.argv
    os.makedirs(saida, exist_ok=True)
    ult = q({"size": 1, "sort": [{"@timestamp": {"order": "desc"}}], "_source": ["@timestamp"]})
    carga = ult["hits"]["hits"][0]["_source"]["@timestamp"][:19] + "Z"
    if carga[:19] <= anterior[:19] and not forcar:
        print("SEM_NOVIDADE", carga)
        return
    carga_local = (datetime.datetime.fromisoformat(carga.replace("Z", "+00:00")) - datetime.timedelta(hours=4)).date()
    hoje = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-4))).date().isoformat()

    linhas, comp, cargas, resumo = [], [], [], []
    for m in MESES:
        ano, mes = int(m[:4]), int(m[5:])
        ndias = calendar.monthrange(ano, mes)[1]
        ini, fim_mes = f"{m}-01", mais(f"{m}-{ndias:02d}", 1)
        docs = baixa(ini, fim_mes)
        if not docs:
            continue
        completo = carga_local > datetime.date(ano, mes, ndias)
        ate = ndias if completo else max(int(x["dataAjuizamento"][6:8]) for x in docs)
        for x in sorted(docs, key=lambda x: x["dataAjuizamento"]):
            grupo, nome, com = orgao(x)
            n, da = x["numeroProcesso"], x["dataAjuizamento"]
            linhas.append({"id": x["id"], "mes": m,
                           "numero": f"{n[:7]}-{n[7:9]}.{n[9:13]}.{n[13]}.{n[14:16]}.{n[16:]}",
                           "data": f"{da[:4]}-{da[4:6]}-{da[6:8]}", "grau": GRAU.get(x["grau"], x["grau"]),
                           "classe": x["classe"]["nome"].strip(), "assunto": assunto(x),
                           "grupo": grupo, "orgao": nome, "comarca": com})
        # bases de comparação: mesmo mês do ano anterior e mês anterior, nos mesmos dias (ou mês inteiro)
        bases = []
        pa, pm = ano - 1, mes
        bases.append((1, f"{NOME_MES[pm]}/{pa}", pa, pm))
        aa, am = mes_ant(ano, mes)
        bases.append((2, f"{NOME_MES[am]}/{aa}", aa, am))
        for ordem, rotulo, ba, bm in bases:
            bd = calendar.monthrange(ba, bm)[1]
            b_ini = f"{ba}-{bm:02d}-01"
            b_fim = mais(f"{ba}-{bm:02d}-{bd:02d}", 1) if completo else mais(f"{ba}-{bm:02d}-{min(ate, bd):02d}", 1)
            time.sleep(3)
            bdocs = baixa(b_ini, b_fim)
            cont = {}
            for x in bdocs:
                _, nome, _ = orgao(x)
                cont[nome] = cont.get(nome, 0) + 1
            periodo = rotulo + (" inteiro" if completo else f" (01 a {min(ate, bd):02d})")
            comp.append({"mes": m, "orgao": "Todos", "ordem": ordem, "periodo": periodo, "casos": len(bdocs)})
            for nome, c in sorted(cont.items()):
                comp.append({"mes": m, "orgao": nome, "ordem": ordem, "periodo": periodo, "casos": c})
            resumo.append(f"{m}:{rotulo}={len(bdocs)}")
        cargas.append({"mes": m, "ate": ate, "completo": "sim" if completo else "não", "carga": carga,
                       "extracao": hoje, "registros": sum(1 for r in linhas if r["mes"] == m)})
        resumo.append(f"{m}={cargas[-1]['registros']} (até dia {ate})")
    if not linhas:
        sys.exit("ERRO_VAZIO: a consulta não trouxe processos")
    for nome, rows in [("tjrr_casos.csv", linhas), ("tjrr_comparativo.csv", comp), ("tjrr_carga.csv", cargas)]:
        with open(os.path.join(saida, nome), "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0]))
            w.writeheader()
            w.writerows(rows)
    print("NOVA_CARGA", carga, "; ".join(resumo))


main()
