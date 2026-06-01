'use client';

import { operisRoundsMock } from '@/services/operis-data';
import { formatCompactDate, formatNumber } from '@/utils/format';

export function RondaOverview() {
  return (
    <section className="module-stack">
      <div className="module-header">
        <div>
          <h2>Ronda operacional</h2>
          <p>Snapshots historicos diarios organizados por data, turno, maquina e status.</p>
        </div>

        <div className="module-filters">
          {['Dia', 'Semana', 'Mes', 'Maquina', 'Produto', 'Status'].map((filter) => (
            <span className="module-chip" key={filter}>
              {filter}
            </span>
          ))}
        </div>
      </div>

      <div className="module-kpi-grid">
        <article className="module-panel module-panel--metric">
          <span>Capturas armazenadas</span>
          <strong>93</strong>
        </article>
        <article className="module-panel module-panel--metric">
          <span>Ultimo snapshot</span>
          <strong>2o Turno</strong>
        </article>
        <article className="module-panel module-panel--metric">
          <span>Divergencias no periodo</span>
          <strong>20</strong>
        </article>
      </div>

      <section className="module-panel">
        <div className="module-table">
          <div className="module-table__head module-table__head--ronda">
            <span>Data</span>
            <span>Turno</span>
            <span>Maquinas</span>
            <span>Producao</span>
            <span>Setup</span>
            <span>Regulagem</span>
            <span>Aguardando</span>
            <span>Paradas</span>
            <span>Divergencias</span>
          </div>

          {operisRoundsMock.map((item) => (
            <div className="module-table__row module-table__row--ronda" key={`${item.data}-${item.turno}`}>
              <span>{formatCompactDate(item.data)}</span>
              <strong>{item.turno}</strong>
              <span>{formatNumber(item.maquinas)}</span>
              <span>{formatNumber(item.emProducao)}</span>
              <span>{formatNumber(item.emSetup)}</span>
              <span>{formatNumber(item.emRegulagem)}</span>
              <span>{formatNumber(item.aguardando)}</span>
              <span>{formatNumber(item.paradas)}</span>
              <span className="is-alert">{formatNumber(item.divergencias)}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
