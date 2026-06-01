import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const sheetId = req.nextUrl.searchParams.get('id');

  if (!sheetId) {
    return NextResponse.json({ error: 'ID não informado' }, { status: 400 });
  }

  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
    const res = await fetch(url, { next: { revalidate: 0 } });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Planilha não acessível (HTTP ${res.status}). Verifique se o ID está correto e se a planilha é pública.` },
        { status: 400 },
      );
    }

    const text = await res.text();

    // Remove o wrapper JSONP
    const jsonStr = text
      .replace(/^\/\*[\s\S]*?\*\/\s*/, '')
      .replace(/^google\.visualization\.Query\.setResponse\(/, '')
      .replace(/\);\s*$/, '');

    const data = JSON.parse(jsonStr);

    if (data.status === 'error') {
      const msg = data.errors?.[0]?.detailed_message || data.errors?.[0]?.message || 'Sem permissão';
      return NextResponse.json({ error: msg }, { status: 403 });
    }

    const table   = data.table;
    const headers = (table.cols as { label: string }[]).map((c) => c.label || '');
    const total   = (table.rows as unknown[])?.length || 0;
    const sample  = ((table.rows as { c: Array<{ v: unknown } | null> }[]) || [])
      .slice(0, 5)
      .map((row) => row.c.map((cell) => (cell?.v != null ? String(cell.v) : '')));

    return NextResponse.json({ ok: true, rows: total, headers, sample });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
