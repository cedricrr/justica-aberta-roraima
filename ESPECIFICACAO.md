# Especificação Técnica Mínima — Justiça Aberta Roraima

**Versão:** 1.0
**Data:** 2026-10-29
**Projeto:** Justiça Aberta Roraima — Casos novos no TJRR

---

## 1. Visão geral do sistema

O sistema tem três camadas:

1. **Coleta** — consulta à API Pública do DataJud em dias úteis, pelo GitHub Actions
2. **Dados** — três CSVs versionados no repositório (`docs/dados/`)
3. **Apresentação** — site estático no GitHub Pages, com domínio opcional via Cloudflare DNS

```
┌──────────────┐    ┌──────────────────┐    ┌───────────────┐    ┌──────────────┐    ┌─────────────┐
│ API DataJud  │───>│ GitHub Actions   │───>│ docs/dados/   │───>│ GitHub Pages │───>│ Cloudflare  │
│ (CNJ)        │    │ atualiza-dados   │    │ CSVs (commit) │    │ docs/        │    │ DNS / HTTPS │
└──────────────┘    └──────────────────┘    └───────────────┘    └──────────────┘    └─────────────┘
```

---

## 2. Requisitos funcionais

### RF-01: Coleta
- O sistema DEVE consultar o índice `api_publica_tjrr` com a chave pública divulgada pelo CNJ, substituível pelo secret `DATAJUD_KEY`
- O sistema DEVE comparar o `@timestamp` mais recente do índice com o gravado em `tjrr_carga.csv` e só baixar dados quando houver remessa nova
- O sistema DEVE paginar com `search_after` (1.000 registros por página) e respeitar o limite de pedidos da API (espera e repetição em respostas 429 e 5xx)
- O sistema DEVE descartar registros com `nivelSigilo` diferente de 0 e registros repetidos

### RF-02: Processamento
- O sistema DEVE gerar uma linha por processo para cada mês de `MESES`
- O sistema DEVE rotular cada órgão julgador num grupo (gabinetes do 2º grau, Turma Recursal, varas e juizados de Boa Vista, comarca do interior) e acrescentar a comarca ao nome dos órgãos do interior
- O sistema DEVE marcar o mês como completo quando a remessa é posterior ao último dia do mês; caso contrário, registrar até que dia há dados
- O sistema DEVE gerar as bases de comparação por órgão: mês anterior e mesmo mês do ano anterior, inteiros (mês completo) ou nos mesmos dias (mês parcial)

### RF-03: Painel
- O painel DEVE permitir escolher o mês e o órgão julgador, e guardar essa escolha no endereço
- O painel DEVE mostrar total, variações, distribuição por dia, grau, classe, assunto, comarca e órgão, e a lista de processos com busca
- O painel DEVE oferecer o modo TV (`#tv`), com rotação de telas e tela cheia
- O painel DEVE indicar a remessa usada, se o mês é parcial e o aviso de projeto independente
- O painel DEVE oferecer o download dos três CSVs

### RF-04: Publicação
- Cada commit na `main` e cada coleta concluída DEVEM publicar `docs/` no GitHub Pages
- O repositório DEVE ter atividade ao menos a cada 45 dias (commit de verificação), para a agenda não ser desativada

---

## 3. Requisitos não funcionais

| Item | Requisito |
|------|-----------|
| Custo | R$ 0 (repositório público; Actions e Pages gratuitos; Cloudflare Free) |
| Dependências | Coleta só com biblioteca padrão do Python; site sem CDN externo (d3 e fontes servidos pelo próprio site) |
| Desempenho | Página inicial < 2 MB transferidos; dados ~1,6 MB sem compressão |
| Acessibilidade | Controles reais (`button`, `select`, `input` com rótulo), foco visível, alvos ≥ 44 px |
| Responsividade | Sem rolagem horizontal a 390 px de largura |
| Privacidade | Sem cookies; sem dados de partes; só metadados sem sigilo |

---

## 4. Riscos conhecidos

| Risco | Tratamento |
|-------|------------|
| Agenda desativada após 60 dias sem atividade (repositórios públicos) | Commit de verificação quando o último commit tem mais de 45 dias |
| Chave pública trocada pelo CNJ | Secret `DATAJUD_KEY`; o script sai com `ERRO_CHAVE` |
| Limite de pedidos da API | Esperas entre páginas e repetição com recuo; job com 50 minutos de limite |
| API inacessível a partir dos servidores do GitHub | Plano B: runner próprio registrado no repositório |
