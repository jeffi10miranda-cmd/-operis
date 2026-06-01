# OPERIS Architecture

## Objetivo

OPERIS e uma central operacional industrial para leitura em tempo real, armazenamento historico, comparativos entre turnos e alertas inteligentes a partir de dados recebidos por Google Sheets.

## Frontend alvo

Estrutura:

```text
frontend/src
  app
  components
    alertas
    comparativos
    configuracoes
    ronda
  contexts
  hooks
  layouts
  services
  styles
  types
  utils
```

Diretrizes:

- shell operacional unico com sidebar fixa
- modulos independentes por tela
- hooks para leitura da API e socket
- services para mock, transformacao e contratos
- types compartilhados do dominio
- componentes pequenos e reusaveis

## Backend alvo

Estrutura alvo recomendada:

```text
backend/src
  controllers
  services
  repositories
  middlewares
  routes
  prisma
  utils
  websocket
  jobs
```

Camadas:

- `controllers`: contratos HTTP e serializacao das respostas
- `services`: regras operacionais, comparacoes e alertas
- `repositories`: acesso ao Prisma e consultas compostas
- `jobs`: sincronizacao Google Sheets e consolidacao diaria
- `websocket`: eventos de central, alerta, ronda e status de sincronizacao

## Dominio principal

- `users`
- `products`
- `rounds`
- `machine_snapshots`
- `alerts`
- `integrations`

## Fluxo operacional

1. Job automatico dispara leitura das tres planilhas.
2. Dados sao normalizados por turno.
3. Produtos sao reconciliados com o banco mestre.
4. Regras de divergencia e alerta sao executadas.
5. Snapshots sao salvos.
6. Ronda consolidada e atualizada.
7. Eventos Socket.io notificam o frontend.

## Alertas inteligentes

- ciclo acima do padrao
- ciclo abaixo do padrao
- cavidade abaixo do padrao
- troca de produto
- maquina parada
- setup excessivo
- aguardando materia prima
- recorrencia operacional

## Proximos passos tecnicos

- refatorar rotas atuais para `controllers` e `repositories`
- adicionar tabela `integrations` no Prisma
- consolidar configuracoes operacionais em entidade tipada
- conectar frontend das telas novas aos endpoints reais
- introduzir autenticação persistente com refresh de sessao
