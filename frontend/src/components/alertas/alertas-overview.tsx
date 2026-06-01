'use client';

import { operisAlertasMock } from '@/services/operis-data';
import { formatCompactDateTime } from '@/utils/format';

export function AlertasOverview() {
  return (
    <section className="module-stack">
      <div className="module-header">
        <div>
          <h2>Alertas inteligentes</h2>
          <p>Monitoramento de ciclo, cavidade, troca de produto, setup excessivo e recorrencia operacional.</p>
        </div>

        <div className="module-filters">
          {['Critico', 'Atencao', 'Info', 'Resolvidos', 'Nao lidos'].map((filter) => (
            <span className="module-chip" key={filter}>
              {filter}
            </span>
          ))}
        </div>
      </div>

      <div className="alert-board">
        {operisAlertasMock.map((alerta) => (
          <article className="alert-board__item" key={`${alerta.maquina}-${alerta.timestamp}`}>
            <div>
              <span className={`module-pill module-pill--${alerta.severidade === 'alta' ? 'alerta' : alerta.severidade === 'media' ? 'mudanca' : 'ok'}`}>
                {alerta.tipo}
              </span>
              <h3>{alerta.maquina}</h3>
              <p>{alerta.descricao}</p>
            </div>

            <div className="alert-board__meta">
              <strong>{formatCompactDateTime(alerta.timestamp)}</strong>
              <span>{alerta.recorrencia}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
