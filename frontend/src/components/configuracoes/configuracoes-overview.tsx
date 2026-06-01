'use client';

import { operisConfiguracoesMock } from '@/services/operis-data';

export function ConfiguracoesOverview() {
  return (
    <section className="module-stack">
      <div className="module-header">
        <div>
          <h2>Configuracoes administrativas</h2>
          <p>Integracoes, sincronizacao, usuarios, permissoes, limites operacionais e regras de alerta.</p>
        </div>
      </div>

      <div className="settings-grid">
        {operisConfiguracoesMock.map((group) => (
          <section className="module-panel settings-card" key={group.titulo}>
            <div className="settings-card__header">
              <h3>{group.titulo}</h3>
              <p>{group.descricao}</p>
            </div>

            <div className="settings-list">
              {group.itens.map((item) => (
                <div className="settings-list__item" key={item.label}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.valor}</span>
                  </div>
                  <em className={item.ativo ? 'is-active' : 'is-inactive'}>{item.status}</em>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
