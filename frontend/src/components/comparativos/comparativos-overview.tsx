'use client';

import { operisComparativosMock } from '@/services/operis-data';

export function ComparativosOverview() {
  return (
    <section className="module-stack">
      <div className="module-header">
        <div>
          <h2>Comparativos operacionais</h2>
          <p>Leituras historicas entre turnos, dias, semanas e meses para decisao rapida.</p>
        </div>

        <div className="module-filters">
          {['Turnos', 'Dias', 'Semanas', 'Meses'].map((filter) => (
            <span className="module-chip" key={filter}>
              {filter}
            </span>
          ))}
        </div>
      </div>

      <section className="module-panel">
        <div className="module-table">
          <div className="module-table__head module-table__head--comparativos">
            <span>Maquina</span>
            <span>Ontem</span>
            <span>Hoje</span>
            <span>Resultado</span>
            <span>Detalhe</span>
          </div>

          {operisComparativosMock.map((row) => (
            <div className="module-table__row module-table__row--comparativos" key={row.indicador}>
              <strong>{row.indicador}</strong>
              <span>{row.ontem}</span>
              <span>{row.hoje}</span>
              <span className={`module-pill module-pill--${row.status}`}>{row.resultado}</span>
              <span>{row.detalhe}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
