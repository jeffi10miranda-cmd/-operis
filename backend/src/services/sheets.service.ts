// OPERIS — Integração Google Sheets
// Formato esperado da planilha:
// A(0)=# (nº máquina)  B(1)=Maq  C(2)=Op  D(3)=Descrição
// E(4)=#  F(5)=Qtd Op  G(6)=Qtd Atual  H(7)=#
// I(8)=Ciclo  J(9)=#  K(10)=C Real  L(11)=Cav  M(12)=Cav Fec  N(13)=Status

import { google } from 'googleapis';
import { logger } from '../config/logger';

export interface SheetRow {
  maquina:      string;
  produto:      string;
  cicloAtual:   number | null;
  cavidadeReal: number | null;
  velocidade:   number | null;
  status:       string;
  observacao:   string;
}

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

const STATUS_MAP: Record<string, string> = {
  'ok':                       'EM_PRODUCAO',
  'em producao':              'EM_PRODUCAO',
  'em produção':              'EM_PRODUCAO',
  'producao':                 'EM_PRODUCAO',
  'produção':                 'EM_PRODUCAO',
  'setup':                    'SETUP',
  'setup de cor':             'SETUP_DE_COR',
  'regulagem':                'REGULAGEM',
  'ferramentaria':            'FERRAMENTARIA',
  'manutencao':               'MANUTENCAO',
  'manutenção':               'MANUTENCAO',
  'aguardando mp':            'AGUARDANDO_MP',
  'aguardando materia prima': 'AGUARDANDO_MP',
  'aguardando técnico':       'AGUARDANDO_TECNICO',
  'aguardando tecnico':       'AGUARDANDO_TECNICO',
  'aguardando liberacao':     'AGUARDANDO_LIBERACAO',
  'aguardando liberação':     'AGUARDANDO_LIBERACAO',
  'aguardando estufagem':     'AGUARDANDO_ESTUFAGEM',
  'reinicio':                 'REINICIO',
  'reinício':                 'REINICIO',
  'tryout':                   'TRYOUT',
  'troca de versao':          'TROCA_DE_VERSAO',
  'troca de versão':          'TROCA_DE_VERSAO',
  'fora da cor padrao':       'FORA_DA_COR_PADRAO',
  'fora da cor padrão':       'FORA_DA_COR_PADRAO',
  'inativa':                  'INATIVA',
  'nao programada':           'INATIVA',
  'não programada':           'INATIVA',
};

export function mapearStatus(rawStatus: string): string {
  const key = rawStatus.toLowerCase().trim();
  return STATUS_MAP[key] || 'INATIVA';
}

// Formata data como DD-MM-AA (padrão das abas: "1º T 02-06-26")
function formatarDataAba(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

// Descobre o nome da aba de hoje para um turno (ex: "1º T 02-06-26")
async function descobrirAbaHoje(spreadsheetId: string, prefixoTurno: string): Promise<string | null> {
  try {
    const auth  = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const meta   = await sheets.spreadsheets.get({ spreadsheetId });
    const abas   = meta.data.sheets?.map(s => s.properties?.title ?? '') ?? [];
    const hoje   = formatarDataAba(new Date());

    // Tenta encontrar aba exata do dia (ex: "1º T 02-06-26")
    const abaHoje = abas.find(a => a.startsWith(prefixoTurno) && a.includes(hoje));
    if (abaHoje) return abaHoje;

    // Fallback: primeira aba que começa com o prefixo do turno
    const fallback = abas.find(a => a.startsWith(prefixoTurno));
    if (fallback) {
      logger.warn(`Aba de hoje (${prefixoTurno} ${hoje}) não encontrada. Usando: "${fallback}"`);
      return fallback;
    }

    logger.warn(`Nenhuma aba encontrada para o prefixo "${prefixoTurno}"`);
    return null;
  } catch (err) {
    logger.error('Erro ao listar abas da planilha:', err);
    return null;
  }
}

// Lê uma aba da planilha e retorna rows normalizadas
export async function lerPlanilha(
  spreadsheetId: string,
  nomeAba?: string
): Promise<SheetRow[]> {
  try {
    const auth   = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Range com nome da aba se informado: "1º T 02-06-26"!A:N
    const range = nomeAba ? `'${nomeAba}'!A:N` : 'A:N';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      logger.warn(`Planilha ${spreadsheetId} aba "${nomeAba ?? 'padrão'}" vazia ou sem dados`);
      return [];
    }

    // Primeira linha = cabeçalho, ignora
    const dataRows = rows.slice(1);

    return dataRows
      .filter(row => {
        // Ignora linhas sem número de máquina (col A) e sem status (col N)
        const maq    = row[0]?.toString().trim();
        const status = row[13]?.toString().trim();
        return maq && status;
      })
      .map((row): SheetRow => ({
        maquina:      normalizeStr(row[0]),           // col A = # (nº máquina)
        produto:      normalizeStr(row[3] || row[2]), // col D = Descrição, fallback col C = Op
        cicloAtual:   parseNum(row[8]),               // col I = Ciclo
        cavidadeReal: parseNum(row[11]),              // col L = Cav
        velocidade:   parseNum(row[10]),              // col K = C Real
        status:       normalizeStr(row[13] || 'Inativa'), // col N = Status
        observacao:   '',
      }));
  } catch (error) {
    logger.error(`Erro ao ler planilha ${spreadsheetId} aba "${nomeAba}":`, error);
    throw new Error(`Falha ao ler planilha: ${spreadsheetId} / ${nomeAba}`);
  }
}

// Lê os 3 turnos descobrindo automaticamente a aba do dia
export async function lerTodosTurnos(): Promise<{
  turno1: SheetRow[];
  turno2: SheetRow[];
  turno3: SheetRow[];
}> {
  const spreadsheetId = process.env.SHEET_ID_TURNO_1!; // mesma planilha para os 3 turnos

  const prefixo1 = process.env.SHEET_TAB_TURNO_1 ?? '1º T';
  const prefixo2 = process.env.SHEET_TAB_TURNO_2 ?? '2º T';
  const prefixo3 = process.env.SHEET_TAB_TURNO_3 ?? '3º T';

  const [aba1, aba2, aba3] = await Promise.all([
    descobrirAbaHoje(spreadsheetId, prefixo1),
    descobrirAbaHoje(spreadsheetId, prefixo2),
    descobrirAbaHoje(spreadsheetId, prefixo3),
  ]);

  const [turno1, turno2, turno3] = await Promise.allSettled([
    aba1 ? lerPlanilha(spreadsheetId, aba1) : Promise.resolve([]),
    aba2 ? lerPlanilha(spreadsheetId, aba2) : Promise.resolve([]),
    aba3 ? lerPlanilha(spreadsheetId, aba3) : Promise.resolve([]),
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
    const auth   = getAuth();
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
