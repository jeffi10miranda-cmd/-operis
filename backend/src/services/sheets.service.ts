// OPERIS — Integração Google Sheets

import { google, sheets_v4 } from 'googleapis';
import { logger } from '../config/logger';

// Mapeamento de colunas esperadas nas planilhas
export interface SheetRow {
  maquina: string;
  produto: string;
  cicloAtual: number | null;
  cavidadeReal: number | null;
  velocidade: number | null;
  status: string;
  observacao: string;
}

// Inicializa cliente Google Auth
function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

// Mapeia nome de status da planilha para enum interno
const STATUS_MAP: Record<string, string> = {
  'em producao':            'EM_PRODUCAO',
  'em produção':            'EM_PRODUCAO',
  'producao':               'EM_PRODUCAO',
  'produção':               'EM_PRODUCAO',
  'setup':                  'SETUP',
  'setup de cor':           'SETUP_DE_COR',
  'regulagem':              'REGULAGEM',
  'ferramentaria':          'FERRAMENTARIA',
  'manutencao':             'MANUTENCAO',
  'manutenção':             'MANUTENCAO',
  'aguardando mp':          'AGUARDANDO_MP',
  'aguardando materia prima': 'AGUARDANDO_MP',
  'aguardando técnico':     'AGUARDANDO_TECNICO',
  'aguardando tecnico':     'AGUARDANDO_TECNICO',
  'aguardando liberacao':   'AGUARDANDO_LIBERACAO',
  'aguardando liberação':   'AGUARDANDO_LIBERACAO',
  'aguardando estufagem':   'AGUARDANDO_ESTUFAGEM',
  'reinicio':               'REINICIO',
  'reinício':               'REINICIO',
  'tryout':                 'TRYOUT',
  'troca de versao':        'TROCA_DE_VERSAO',
  'troca de versão':        'TROCA_DE_VERSAO',
  'fora da cor padrao':     'FORA_DA_COR_PADRAO',
  'fora da cor padrão':     'FORA_DA_COR_PADRAO',
  'inativa':                'INATIVA',
  'nao programada':         'INATIVA',
  'não programada':         'INATIVA',
};

export function mapearStatus(rawStatus: string): string {
  const key = rawStatus.toLowerCase().trim();
  return STATUS_MAP[key] || 'INATIVA';
}

// Lê uma planilha e retorna array de rows normalizadas
export async function lerPlanilha(
  sheetId: string,
  range: string = 'A:H'
): Promise<SheetRow[]> {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      logger.warn(`Planilha ${sheetId} vazia ou sem dados`);
      return [];
    }

    // Primeira linha = cabeçalho, ignora
    const dataRows = rows.slice(1);

    return dataRows
      .filter((row) => row[0]?.toString().trim()) // ignora linhas sem máquina
      .map((row): SheetRow => ({
        maquina:      normalizeStr(row[0] || ''),
        produto:      normalizeStr(row[1] || ''),
        cicloAtual:   parseNum(row[2]),
        cavidadeReal: parseNum(row[3]),
        velocidade:   parseNum(row[4]),
        status:       normalizeStr(row[5] || 'Inativa'),
        observacao:   normalizeStr(row[6] || ''),
      }));
  } catch (error) {
    logger.error(`Erro ao ler planilha ${sheetId}:`, error);
    throw new Error(`Falha ao ler planilha Google Sheets: ${sheetId}`);
  }
}

// Lê as 3 planilhas de turno
export async function lerTodosTurnos(): Promise<{
  turno1: SheetRow[];
  turno2: SheetRow[];
  turno3: SheetRow[];
}> {
  const sheetIds = {
    turno1: process.env.SHEET_ID_TURNO_1!,
    turno2: process.env.SHEET_ID_TURNO_2!,
    turno3: process.env.SHEET_ID_TURNO_3!,
  };

  const [turno1, turno2, turno3] = await Promise.allSettled([
    lerPlanilha(sheetIds.turno1),
    lerPlanilha(sheetIds.turno2),
    lerPlanilha(sheetIds.turno3),
  ]);

  return {
    turno1: turno1.status === 'fulfilled' ? turno1.value : [],
    turno2: turno2.status === 'fulfilled' ? turno2.value : [],
    turno3: turno3.status === 'fulfilled' ? turno3.value : [],
  };
}

// Verifica se credenciais estão configuradas
export async function testarConexao(sheetId: string): Promise<boolean> {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    return true;
  } catch {
    return false;
  }
}

function normalizeStr(val: unknown): string {
  return String(val ?? '').trim();
}

function parseNum(val: unknown): number | null {
  const n = parseFloat(String(val ?? '').replace(',', '.'));
  return isNaN(n) ? null : n;
}
