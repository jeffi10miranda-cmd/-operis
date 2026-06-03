// OPERIS — Integração Google Sheets
// Formato esperado da planilha:
// A(0)=# (nº máquina)  B(1)=Maq  C(2)=Op  D(3)=Descrição
// E(4)=#  F(5)=Qtd Op  G(6)=Qtd Atual  H(7)=#
// I(8)=Ciclo  J(9)=#  K(10)=C Real  L(11)=Cav  M(12)=Cav Fec  N(13)=Status

import { google } from 'googleapis';
import { logger } from '../config/logger';

export interface SheetRow {
  maquina:      string;
  op:           string;
  produto:      string;
  qtdOP:        number | null;
  qtdAtual:     number | null;
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

function getAuthWrite() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });
}

type CellValue = string | number | null;

function cell(v: CellValue): object {
  if (v === null || v === undefined || v === '') return { userEnteredValue: { stringValue: '' } };
  if (typeof v === 'number') return { userEnteredValue: { numberValue: v } };
  return { userEnteredValue: { stringValue: String(v) } };
}

export async function exportarHistoricoParaSheets(params: {
  titulo:  string;
  linhas:  Array<{
    idx: number; maquina: string; turno: string; op: string | null;
    descricao: string | null; qtdOP: number | null; qtdAtual: number | null;
    ciclo: number | null; cicloReal: number | null;
    cav: number | null; cavFec: number | null; status: string;
  }>;
  emailCompartilhar?: string;
}): Promise<string> {
  const auth    = getAuthWrite();
  const sheets  = google.sheets({ version: 'v4', auth });
  const drive   = google.drive({ version: 'v3', auth });

  const HEADER_BG = { red: 0.102, green: 0.227, blue: 0.165 }; // #1a3a2a

  const headerRow = {
    values: ['#','Máq','Turno','OP','Descrição','Qtd OP','Qtd Atual','Ciclo','C Real','Cav','Cav Fec','Status']
      .map(h => ({
        userEnteredValue: { stringValue: h },
        userEnteredFormat: {
          backgroundColor: HEADER_BG,
          textFormat: { foregroundColor: { red:1,green:1,blue:1 }, bold: true },
          horizontalAlignment: 'CENTER',
        },
      })),
  };

  const TURNO_LABEL: Record<string,string> = { PRIMEIRO:'1º Turno', SEGUNDO:'2º Turno', TERCEIRO:'3º Turno' };
  const STATUS_LABEL: Record<string,string> = {
    EM_PRODUCAO:'Ok', SETUP:'Setup', SETUP_DE_COR:'Setup de Cor',
    REGULAGEM:'Regulagem', MANUTENCAO:'Manutenção', FERRAMENTARIA:'Ferramentaria',
    AGUARDANDO_MP:'Aguard. MP', AGUARDANDO_TECNICO:'Aguard. Técnico',
    AGUARDANDO_LIBERACAO:'Aguard. Liberação', AGUARDANDO_ESTUFAGEM:'Aguard. Estufagem',
    REINICIO:'Reinício', TRYOUT:'Tryout', TROCA_DE_VERSAO:'Troca de Versão',
    FORA_DA_COR_PADRAO:'Fora da Cor', INATIVA:'Inativa',
  };

  const dataRows = params.linhas.map((l, i) => ({
    values: [
      cell(l.idx),
      cell(l.maquina.replace(/\D+/g,'')),
      cell(TURNO_LABEL[l.turno] ?? l.turno),
      cell(l.op),
      cell(l.descricao),
      cell(l.qtdOP),
      cell(l.qtdAtual),
      cell(l.ciclo),
      cell(l.cicloReal),
      cell(l.cav),
      cell(l.cavFec),
      cell(STATUS_LABEL[l.status] ?? l.status),
    ],
    // Alterna fundo branco/cinza
    ...(i % 2 !== 0 ? { } : {}),
  }));

  const result = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: params.titulo, locale: 'pt_BR' },
      sheets: [{
        properties: { title: 'Histórico', gridProperties: { frozenRowCount: 1 } },
        data: [{ startRow: 0, startColumn: 0, rowData: [headerRow, ...dataRows] }],
      }],
    },
  });

  const spreadsheetId  = result.data.spreadsheetId!;
  const spreadsheetUrl = result.data.spreadsheetUrl!;

  // Tenta compartilhar (requer Drive API habilitada no Google Cloud Console)
  try {
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: { role: 'reader', type: 'anyone' },
    });
    if (params.emailCompartilhar) {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: { role: 'writer', type: 'user', emailAddress: params.emailCompartilhar },
      });
    }
    logger.info(`📊 Planilha exportada e compartilhada: ${spreadsheetUrl}`);
  } catch (err) {
    // Drive API não habilitada — planilha criada mas sem compartilhamento automático
    // Usuário pode abrir e compartilhar manualmente
    logger.warn(`📊 Planilha criada mas não compartilhada (habilite Drive API): ${spreadsheetUrl}`);
  }

  return spreadsheetUrl;
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
  'try out':                  'TRYOUT',
  'troca de versao':          'TROCA_DE_VERSAO',
  'troca de versão':          'TROCA_DE_VERSAO',
  'troca de molde':           'TROCA_DE_VERSAO',
  'troca molde':              'TROCA_DE_VERSAO',
  'troca de ferramenta':      'TROCA_DE_VERSAO',
  'setup de molde':           'SETUP',
  'set up':                   'SETUP',
  'fora da cor padrao':       'FORA_DA_COR_PADRAO',
  'fora da cor padrão':       'FORA_DA_COR_PADRAO',
  'inativa':                  'INATIVA',
  'nao programada':           'INATIVA',
  'não programada':           'INATIVA',
  'sem producao':             'INATIVA',
  'sem produção':             'INATIVA',
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

// Normaliza caracteres de grau/ordinal para comparação (° U+00B0 e º U+00BA são visualmente iguais)
function normalizaGrau(s: string): string {
  return s.replace(/[°º]/g, '°');
}

// Descobre o nome da aba de hoje para um turno (ex: "1°T 02-06-26")
async function descobrirAbaHoje(spreadsheetId: string, prefixoTurno: string): Promise<string | null> {
  try {
    const auth  = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const meta   = await sheets.spreadsheets.get({ spreadsheetId });
    const abas   = meta.data.sheets?.map(s => s.properties?.title ?? '') ?? [];
    const hoje   = formatarDataAba(new Date());
    const prefNorm = normalizaGrau(prefixoTurno);

    logger.info(`Procurando prefixo: "${prefixoTurno}" | Data hoje: "${hoje}"`);

    // Tenta encontrar aba exata do dia (ex: "1°T 03-06-26")
    const abaHoje = abas.find(a => normalizaGrau(a).startsWith(prefNorm) && a.includes(hoje));
    if (abaHoje) return abaHoje;

    // Fallback: aba mais recente que começa com o prefixo do turno
    const fallback = abas.find(a => normalizaGrau(a).startsWith(prefNorm));
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
    logger.info(`Aba "${nomeAba}": ${rows?.length ?? 0} linhas brutas recebidas da API`);

    if (!rows || rows.length < 2) {
      logger.warn(`Planilha ${spreadsheetId} aba "${nomeAba ?? 'padrão'}" vazia ou sem dados`);
      return [];
    }

    // Log das primeiras linhas para debug de colunas
    if (rows.length > 1) {
      logger.info(`Cabeçalho: ${JSON.stringify(rows[0])}`);
      logger.info(`Linha 2: ${JSON.stringify(rows[1])}`);
      if (rows[4]) logger.info(`Linha 5: ${JSON.stringify(rows[4])}`);
    }

    // Primeira linha = cabeçalho, ignora
    const dataRows = rows.slice(1);

    return dataRows
      .filter(row => {
        // Maq(0) e Status(9) precisam estar preenchidos
        const maq    = row[0]?.toString().trim();
        const status = row[9]?.toString().trim();
        return maq && status;
      })
      .map((row): SheetRow => ({
        maquina:      normalizeStr(row[0]),              // 0 = Maq
        op:           normalizeStr(row[1] || ''),        // 1 = Op (nº da OP)
        produto:      normalizeStr(row[2] || ''),        // 2 = Descrição
        qtdOP:        parseNum(row[3]),                  // 3 = Qtd Op (meta)
        qtdAtual:     parseNum(row[4]),                  // 4 = Qtd Atual (acumulado)
        cicloAtual:   parseNum(row[5]),                  // 5 = Ciclo
        cavidadeReal: parseNum(row[7]),                  // 7 = Cav
        velocidade:   parseNum(row[6]),                  // 6 = C Real
        status:       normalizeStr(row[9] || 'Inativa'), // 9 = Status
        observacao:   normalizeStr(row[10] || ''),       // 10 = Ficha Técnica
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

  const prefixo1 = process.env.SHEET_TAB_TURNO_1 ?? '1°';
  const prefixo2 = process.env.SHEET_TAB_TURNO_2 ?? '2°';
  const prefixo3 = process.env.SHEET_TAB_TURNO_3 ?? '3°';

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
  const s = String(val ?? '').trim();
  if (!s || s === '-') return null;
  // Formato pt-BR: "75.500" = 75500 (ponto = milhar), "47,3" = 47.3 (vírgula = decimal)
  const normalized = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return isNaN(n) ? null : n;
}
