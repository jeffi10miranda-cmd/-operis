import type {
  OperisAlertRecord,
  OperisComparisonRow,
  OperisRoundItem,
  OperisSettingGroup,
} from '@/types/operis';

export const operisRoundsMock: OperisRoundItem[] = [
  { data: '2026-05-28', turno: '1o Turno', maquinas: 30, emProducao: 19, emSetup: 4, emRegulagem: 3, aguardando: 2, paradas: 2, divergencias: 5 },
  { data: '2026-05-28', turno: '2o Turno', maquinas: 30, emProducao: 18, emSetup: 5, emRegulagem: 3, aguardando: 4, paradas: 4, divergencias: 6 },
  { data: '2026-05-27', turno: '3o Turno', maquinas: 29, emProducao: 17, emSetup: 6, emRegulagem: 2, aguardando: 3, paradas: 3, divergencias: 4 },
  { data: '2026-05-26', turno: '2o Turno', maquinas: 28, emProducao: 16, emSetup: 4, emRegulagem: 3, aguardando: 3, paradas: 2, divergencias: 5 },
];

export const operisComparativosMock: OperisComparisonRow[] = [
  { indicador: 'M01', ontem: '50s', hoje: '55s', resultado: 'Ciclo aumentou', detalhe: 'Acima do padrao do produto', status: 'alerta' },
  { indicador: 'M02', ontem: 'Produto A', hoje: 'Produto B', resultado: 'Novo OP', detalhe: 'Troca de produto entre turnos', status: 'mudanca' },
  { indicador: 'M03', ontem: '32 / 32', hoje: '28 / 32', resultado: 'Perda de cavidade', detalhe: 'Cavidade real abaixo do padrao', status: 'alerta' },
  { indicador: 'M07', ontem: '24s', hoje: '24s', resultado: 'Estavel', detalhe: 'Operacao dentro do esperado', status: 'ok' },
];

export const operisAlertasMock: OperisAlertRecord[] = [
  { maquina: 'MAQ 04', tipo: 'Ciclo acima do padrao', descricao: 'Ciclo subiu 5 segundos acima do banco mestre.', severidade: 'alta', recorrencia: '3x no turno', timestamp: '2026-05-28T14:30:00' },
  { maquina: 'MAQ 02', tipo: 'Setup de cor', descricao: 'Troca de cor em andamento com impacto no ritmo.', severidade: 'media', recorrencia: '2x na semana', timestamp: '2026-05-28T14:24:00' },
  { maquina: 'MAQ 08', tipo: 'Aguardando materia prima', descricao: 'Linha parada aguardando liberacao de insumo.', severidade: 'media', recorrencia: '1x no turno', timestamp: '2026-05-28T14:10:00' },
  { maquina: 'MAQ 10', tipo: 'Manutencao', descricao: 'Parada tecnica com reincidencia operacional.', severidade: 'alta', recorrencia: '4x no mes', timestamp: '2026-05-28T13:52:00' },
  { maquina: 'MAQ 03', tipo: 'Regulagem recorrente', descricao: 'Regulagem repetida para o mesmo produto.', severidade: 'baixa', recorrencia: '5x no mes', timestamp: '2026-05-28T13:20:00' },
];

export const operisConfiguracoesMock: OperisSettingGroup[] = [
  {
    titulo: 'Integracao Google Sheets',
    descricao: 'Controle de planilhas por turno e estado da sincronizacao.',
    itens: [
      { label: 'Turno 1', valor: 'sheet-turno-1', status: 'Conectado', ativo: true },
      { label: 'Turno 2', valor: 'sheet-turno-2', status: 'Conectado', ativo: true },
      { label: 'Turno 3', valor: 'sheet-turno-3', status: 'Pendente', ativo: false },
    ],
  },
  {
    titulo: 'Regras operacionais',
    descricao: 'Parametros de comparacao e limites para alertas automaticos.',
    itens: [
      { label: 'Desvio maximo de ciclo', valor: '10%', status: 'Ativo', ativo: true },
      { label: 'Setup excessivo', valor: '60 min', status: 'Ativo', ativo: true },
      { label: 'Cavidade abaixo do padrao', valor: '1 unidade', status: 'Ativo', ativo: true },
    ],
  },
  {
    titulo: 'Governanca e acesso',
    descricao: 'Usuarios, papeis operacionais e tema de interface.',
    itens: [
      { label: 'Perfis ativos', valor: 'ADMIN / SUPERVISOR / OPERADOR', status: 'Configurado', ativo: true },
      { label: 'Tema visual', valor: 'Claro industrial', status: 'Padrao', ativo: true },
      { label: 'Tempo de sincronizacao', valor: '5 minutos', status: 'Em execucao', ativo: true },
    ],
  },
];
