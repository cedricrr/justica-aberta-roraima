# Dicionário de dados

Os arquivos ficam em `docs/dados/` (são publicados junto com o site) e são gerados por `scripts/atualiza_datajud.py`. Fonte: [API Pública do DataJud](https://datajud-wiki.cnj.jus.br/api-publica/), índice `api_publica_tjrr`.

## `tjrr_casos.csv` — um processo por linha

| Coluna | Descrição | Exemplo |
|--------|-----------|---------|
| `id` | Identificador do registro no DataJud (tribunal, grau e número) | `TJRR_JE_08394072620268230010` |
| `mes` | Mês de ajuizamento (`AAAA-MM`) | `2026-09` |
| `numero` | Número do processo no padrão CNJ | `0839407-26.2026.8.23.0010` |
| `data` | Data de ajuizamento (`AAAA-MM-DD`) | `2026-09-01` |
| `grau` | 1º grau, 2º grau, Juizado Especial ou Turma Recursal | `Juizado Especial` |
| `classe` | Classe processual (Tabelas Processuais Unificadas do CNJ) | `Procedimento do Juizado Especial Cível` |
| `assunto` | Primeiro assunto informado; `Não informado` quando ausente | `Locação de Móvel` |
| `grupo` | Grupo usado no filtro: Gabinetes do 2º grau, Turma Recursal, Varas e unidades de Boa Vista, Juizados de Boa Vista ou "Comarca de …" | `Juizados de Boa Vista` |
| `orgao` | Órgão julgador; no interior, com a comarca após " · " | `2º Juizado Cível` |
| `comarca` | Município do órgão julgador (pelo código IBGE) | `Boa Vista` |

## `tjrr_comparativo.csv` — bases de comparação

| Coluna | Descrição |
|--------|-----------|
| `mes` | Mês do painel ao qual a base se refere |
| `orgao` | Órgão julgador, com o mesmo rótulo de `tjrr_casos.csv`, ou `Todos` para o tribunal inteiro |
| `ordem` | `1` = mesmo mês do ano anterior; `2` = mês anterior |
| `periodo` | Período usado, ex.: `setembro/2025 inteiro` ou `outubro/2025 (01 a 19)` |
| `casos` | Casos novos do órgão no período |

Quando o mês do painel está completo, as bases usam meses inteiros; quando está parcial, usam os mesmos dias (do dia 1 ao último dia com dados).

## `tjrr_carga.csv` — remessa usada

| Coluna | Descrição |
|--------|-----------|
| `mes` | Mês do painel |
| `ate` | Último dia do mês com dados na API |
| `completo` | `sim` se a remessa é posterior ao fim do mês |
| `carga` | Data e hora (UTC) da última remessa do TJRR na API (`@timestamp` mais recente do índice) |
| `extracao` | Data em que a coleta foi feita |
| `registros` | Processos do mês |

## Limitações

- O DataJud recebe os dados dos tribunais em remessas periódicas; o painel não é em tempo real.
- Um mesmo processo pode aparecer em mais de um grau.
- Órgãos criados ou renomeados entre um ano e outro aparecem sem base de comparação ("sem base") ou com variações grandes.
- Só entram processos com nível de sigilo 0.
