# Justiça Aberta Roraima · Casos novos no TJRR

**Painel aberto dos casos novos ajuizados no Tribunal de Justiça de Roraima, por mês, grau, classe, assunto e órgão julgador (gabinetes, varas e juizados), atualizado automaticamente a partir da API Pública do DataJud (CNJ).**

> Projeto independente, sem vínculo com o Tribunal de Justiça de Roraima (TJRR) ou com o Conselho Nacional de Justiça (CNJ). Mostra apenas metadados públicos de processos sem sigilo e não substitui a consulta processual oficial.

Site: `https://cedricrr.github.io/justica-aberta-roraima/` (ou o domínio próprio configurado no Cloudflare)

---

## Sobre o projeto

O projeto **Justiça Aberta Roraima** consulta a [API Pública do DataJud](https://datajud-wiki.cnj.jus.br/api-publica/), base nacional de metadados processuais do Poder Judiciário, e transforma as remessas do TJRR num painel que pode ser aberto no navegador, no celular ou numa TV.

### O que o painel mostra

- Casos novos do mês, com variação sobre o mês anterior e sobre o mesmo mês do ano anterior
- Meses completos e parciais: um mês ainda incompleto na API é comparado com os mesmos dias dos outros períodos
- Entradas por dia (fins de semana e feriados destacados), por grau, classe, assunto, comarca e órgão julgador
- Filtro por **gabinete, vara ou juizado**, em grupos: gabinetes do 2º grau, Turma Recursal, varas e juizados de Boa Vista e cada comarca do interior
- Lista completa dos processos do período, com busca e ordenação
- **Modo TV** (endereço terminado em `#tv`): três telas em rotação a cada 20 segundos e letreiro com as classes e os assuntos mais frequentes

O mês e o órgão escolhidos ficam no endereço (`?mes=2026-10&orgao=...`), então um link ou uma TV abrem já na seleção certa.

---

## Estrutura do repositório

```
justica-aberta-roraima/
├── README.md                         # Este arquivo
├── ESPECIFICACAO.md                  # Especificação técnica mínima
├── LICENSE                           # Licença MIT (código)
├── CITATION.cff                      # Metadados de citação (CFF v1.2.0)
├── .gitignore
├── .nojekyll                         # Desabilita Jekyll no GitHub Pages
│
├── .github/workflows/
│   ├── atualiza-dados.yml            # Coleta em dias úteis e grava os CSVs
│   └── deploy-pages.yml              # Publica docs/ no GitHub Pages
│
├── scripts/
│   └── atualiza_datajud.py           # Coleta na API do DataJud (só biblioteca padrão)
│
├── dataset/
│   └── README.md                     # Dicionário de dados dos CSVs
│
└── docs/                             # Site publicado no GitHub Pages
    ├── index.html                    # Painel
    ├── assets/
    │   ├── painel.css                # Visual (tema escuro, modo TV)
    │   ├── dash-shim.js              # Carrega os CSVs, filtros na URL
    │   ├── calculos.js               # Agregações por mês e por órgão
    │   └── painel.js                 # Gráficos, filtros, tabela, letreiro, modo TV
    ├── dados/                        # CSVs gerados pela coleta (fonte única)
    │   ├── tjrr_casos.csv
    │   ├── tjrr_comparativo.csv
    │   └── tjrr_carga.csv
    ├── fonts/                        # Bricolage Grotesque e IBM Plex (SIL OFL)
    └── vendor/                       # d3 v7.9.0 (licença ISC)
```

Diferente do Respira Boa Vista, aqui não há cópia `web/` + `docs/`: o site e os dados ficam só em `docs/`, e o workflow publica essa pasta.

---

## Dados

| Arquivo | Conteúdo | Linhas (carga de 20/10/2026) |
|---------|----------|------------------------------|
| `docs/dados/tjrr_casos.csv` | Um processo por linha: mês, número CNJ, data de ajuizamento, grau, classe, assunto, grupo, órgão julgador, comarca | 7.515 |
| `docs/dados/tjrr_comparativo.csv` | Casos novos por órgão (e no total) nos períodos de comparação de cada mês | 395 |
| `docs/dados/tjrr_carga.csv` | Por mês: até que dia há dados, se está completo, remessa usada, data da extração | 2 |

Colunas e regras de cada arquivo em [`dataset/README.md`](dataset/README.md).

**Regras principais**

- "Caso novo" é o processo com data de ajuizamento no período, contado por grau: o mesmo número pode aparecer no 1º grau e em recurso.
- Só entram registros com nível de sigilo 0.
- Comarca = município do órgão julgador (código IBGE). No interior, o nome da comarca é acrescentado ao órgão ("Vara Cível · Caracaraí"), porque os nomes se repetem.
- Assunto = primeiro assunto informado no processo.

---

## Atualização automática

1. O workflow **Atualiza dados DataJud** roda de segunda a sexta às 7h56 (horário de Boa Vista).
2. O script compara a data da última remessa do TJRR na API com a gravada em `docs/dados/tjrr_carga.csv`.
3. Sem remessa nova, termina sem gravar nada. Com remessa nova, baixa os meses do painel e as bases de comparação (leva cerca de 20 minutos por causa do limite de pedidos da API) e faz o commit dos CSVs.
4. Ao terminar, o workflow **Deploy to GitHub Pages** publica `docs/`.

Para forçar uma coleta: aba **Actions** → *Atualiza dados DataJud* → *Run workflow* → marcar "Baixar de novo".

Os meses exibidos ficam na lista `MESES` de `scripts/atualiza_datajud.py`.

### Chave da API

A chave pública do DataJud está no script. Se o CNJ a trocar, a coleta falha com `ERRO_CHAVE`. Basta criar o *secret* `DATAJUD_KEY` (Settings → Secrets and variables → Actions) com a chave nova, publicada em [datajud-wiki.cnj.jus.br/api-publica/acesso](https://datajud-wiki.cnj.jus.br/api-publica/acesso).

---

## Como executar localmente

Arquivos estáticos; um servidor HTTP local é necessário por causa das restrições de CORS do `d3.csv()`:

```bash
cd docs
python3 -m http.server 8000
# Acesse http://localhost:8000/
```

Para coletar os dados na sua máquina:

```bash
python3 scripts/atualiza_datajud.py 1970-01-01T00:00:00Z /tmp/saida --forcar
cp /tmp/saida/*.csv docs/dados/
```

---

## Publicação: GitHub Pages + Cloudflare DNS

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Faça um push na `main` (ou rode *Deploy to GitHub Pages* em Actions). O site fica em `https://cedricrr.github.io/justica-aberta-roraima/`.
3. **Domínio próprio (opcional), no Cloudflare:**
   1. Em *DNS → Records*, crie um `CNAME` com o nome do subdomínio (ex.: `painel`) apontando para `cedricrr.github.io`, inicialmente como **DNS only** (nuvem cinza).
   2. No GitHub, em *Settings → Pages → Custom domain*, informe o subdomínio completo e aguarde a verificação do DNS e a emissão do certificado; depois marque **Enforce HTTPS**.
   3. Opcional: troque o registro para **Proxied** (nuvem laranja) e use SSL/TLS no modo **Full (strict)** para ter o cache do Cloudflare.
   4. Recomendado: verifique o domínio na sua conta do GitHub (*Settings → Pages → Verified domains*), para que nenhum outro repositório possa usá-lo.
4. Opcional: ative o **Cloudflare Web Analytics** para contar acessos sem cookies.

---

## Tecnologias

- **Python 3** (só biblioteca padrão) — coleta e agregação dos dados da API
- **GitHub Actions** — agenda da coleta e publicação
- **GitHub Pages** — hospedagem do site estático
- **Cloudflare (plano Free)** — DNS, HTTPS e cache do domínio próprio
- **D3.js v7** — leitura dos CSVs e gráficos
- **HTML, CSS e JavaScript** sem frameworks; fontes Bricolage Grotesque e IBM Plex servidas pelo próprio site

---

## Licença

- **Código:** MIT — ver [LICENSE](LICENSE)
- **Dados:** extraídos da API Pública do DataJud, mantida pelo CNJ. Os CSVs deste repositório são derivados desses dados públicos; cite o DataJud como fonte primária.
- **Fontes tipográficas:** SIL Open Font License (arquivos em `docs/fonts/`)
- **d3:** licença ISC (`docs/vendor/LICENSE-d3.txt`)
