import { LitElement, html, css } from "https://unpkg.com/lit-element/lit-element.js?module";

// Localization mapping
const translations = {
  en: {
    card: {
      solar: "Solar Input",
      output: "AC Output",
      grid: "Grid/AC Input",
      battery: "Battery",
      production: "Energy Today",
      realtime: "Realtime",
      today: "Today"
    },
    labels: {
      last_update: "Last Update",
      capacity: "Capacity",
      remaining: "Remaining"
    }
  }
};

class EcoflowCard extends LitElement {
  static get styles() {
    return css`
      :host {
        --text: var(--primary-text-color);
        --muted: var(--secondary-text-color);
        --accent: #58d0ff;
        --divider: var(--entities-divider-color, var(--divider-color));
        --radius: 22px;
        display: block;
      }

      .container {
        width: 100%;
        padding: 18px 14px 26px;
        background: var(--ha-card-background, var(--card-background-color, #fff));
        box-sizing: border-box;
        border-radius: var(--ha-card-border-radius, 12px);
        border: 1px solid var(--ha-card-border-color, var(--divider-color, #e0e0e0));
        color: var(--primary-text-color);
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding: 0 10px;
      }

      .header .title {
        font-size: 20px;
        font-weight: 600;
      }

      .header .update {
        font-size: 11px;
        color: var(--muted);
      }

      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }

      .card {
        position: relative;
        background: rgba(100, 100, 100, 0.1);
        border-radius: var(--radius);
        padding: 16px;
        box-sizing: border-box;
        min-height: 100px;
      }

      .full-width {
        grid-column: 1 / -1;
      }

      .card-title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
      }

      .value-group {
        display: flex;
        align-items: baseline;
        gap: 4px;
      }

      .big-num {
        font-size: 24px;
        font-weight: 400;
      }

      .unit {
        font-size: 14px;
        color: var(--muted);
      }

      /* Solar Bars */
      .bar-container {
        margin-top: 10px;
      }

      .bar-wrap {
        display: flex;
        gap: 8px;
        height: 6px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
        overflow: hidden;
      }

      .bar-fill {
        height: 100%;
        background: #549EA4;
        transition: width 0.6s ease;
      }

      .bar-labels {
        display: flex;
        justify-content: space-between;
        margin-top: 4px;
        font-size: 11px;
        color: var(--muted);
      }

      /* Battery Ring */
      .battery-section {
        grid-row: span 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .ring {
        position: relative;
        width: 140px;
        height: 140px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        transition: background 0.3s ease;
      }

      .ring-inner {
        width: 124px;
        height: 124px;
        border-radius: 50%;
        background: var(--ha-card-background, #1c1c1c);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 2;
      }

      .ring-label {
        font-size: 12px;
        color: var(--muted);
      }

      .ring-percent {
        font-size: 28px;
        font-weight: 600;
      }

      .icon-float {
        position: absolute;
        bottom: 12px;
        right: 12px;
        opacity: 0.5;
      }

      @media (max-width: 450px) {
        .grid { grid-template-columns: 1fr; }
        .battery-section { grid-row: auto; }
      }
    `;
  }

  static get properties() {
    return {
      _hass: {},
      config: {},
    };
  }

  setConfig(config) {
    if (!config.entities) {
      throw new Error("You need to define entities");
    }
    this.config = config;
  }

  set hass(hass) {
    this._hass = hass;
    this.state = this._updateState();
  }

  _updateState() {
    if (!this._hass || !this.config) return null;

    const e = this.config.entities;
    const getState = (entityId) => {
      const stateObj = this._hass.states[entityId];
      if (!stateObj) return { val: 0, unit: 'W' };
      return {
        val: parseFloat(stateObj.state) || 0,
        unit: stateObj.attributes.unit_of_measurement || 'W'
      };
    };

    // Helper to normalize to kWh or Wh based on preference or auto-detection
    const normalizeEnergy = (entityId) => {
      const state = getState(entityId);
      if (state.unit.toLowerCase() === 'wh') return state.val / 1000;
      if (state.unit.toLowerCase() === 'mah') {
        // Approximate Wh for Delta Pro (3.2V nominal * mAh / 1000)
        // Or better yet, use user-provided scaling if known. 
        // For now, let's assume Wh logic if common.
        return state.val / 1000; 
      }
      return state.val;
    };

    return {
      gridPower: getState(e.grid_power).val,
      outputPower: getState(e.output_power).val,
      solarPower: getState(e.solar_power).val,
      p1: getState(e.p1_power).val,
      p2: e.p2_power ? getState(e.p2_power).val : null,
      batteryLevel: getState(e.battery_level).val,
      batteryCapacity: normalizeEnergy(e.battery_capacity),
      solarToday: normalizeEnergy(e.solar_today),
      gridToday: normalizeEnergy(e.grid_today),
      lastUpdate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  render() {
    if (!this.state) return html``;
    const s = this.state;
    const lang = this._hass.language || 'en';
    const t = translations[lang] || translations['en'];

    // Dynamic solar bar logic
    const maxSolar = this.config.max_solar || 800;
    const p1Width = Math.min((s.p1 / maxSolar) * 100, 100);
    const p2Width = s.p2 !== null ? Math.min((s.p2 / maxSolar) * 100, 100) : 0;

    // Battery Ring Color logic
    const ringColor = `conic-gradient(
      #58C3D3 ${s.batteryLevel}%, 
      rgba(255,255,255,0.1) ${s.batteryLevel}% 100%
    )`;

    return html`
      <div class="container">
        <div class="header">
          <div class="title">${this.config.name || "Ecoflow Delta Pro"}</div>
          <div class="update">${t.labels.last_update}: ${s.lastUpdate}</div>
        </div>

        <section class="grid">
          <!-- Solar Input Card -->
          <div class="card full-width">
            <div class="card-title">
              ${t.card.solar}
              <div class="value-group">
                <span class="big-num">${s.solarPower}</span>
                <span class="unit">W</span>
              </div>
            </div>
            
            <div class="bar-container">
              <div class="bar-wrap">
                <div class="bar-fill" style="width: ${s.p2 !== null ? p1Width / 2 : p1Width}%"></div>
                ${s.p2 !== null ? html`<div class="bar-fill" style="width: ${p2Width / 2}%; background: #4caeba;"></div>` : ''}
              </div>
              <div class="bar-labels">
                <span>P1: ${s.p1}W</span>
                ${s.p2 !== null ? html`<span>P2: ${s.p2}W</span>` : ''}
              </div>
            </div>
            <ha-icon class="icon-float" icon="mdi:solar-power-variant"></ha-icon>
          </div>

          <!-- Battery Section -->
          <div class="card battery-section">
            <div class="card-title">${t.card.battery}</div>
            <div class="ring" style="background: ${ringColor}">
              <div class="ring-inner">
                <span class="ring-percent">${s.batteryLevel}%</span>
                <span class="ring-label">${s.batteryCapacity.toFixed(1)} kWh</span>
              </div>
            </div>
            <ha-icon class="icon-float" icon="mdi:battery-high"></ha-icon>
          </div>

          <!-- AC Output Card -->
          <div class="card">
            <div class="card-title">${t.card.output}</div>
            <div class="value-group">
              <span class="big-num">${s.outputPower}</span>
              <span class="unit">W</span>
            </div>
            <div class="update" style="margin-top:4px">${t.card.realtime}</div>
            <ha-icon class="icon-float" icon="mdi:power-plug"></ha-icon>
          </div>

          <!-- Grid/AC Input Card -->
          <div class="card">
            <div class="card-title">${t.card.grid}</div>
            <div class="value-group">
              <span class="big-num">${s.gridPower}</span>
              <span class="unit">W</span>
            </div>
             <div class="update" style="margin-top:4px">Charging/Passthru</div>
            <ha-icon class="icon-float" icon="mdi:transmission-tower"></ha-icon>
          </div>

          <!-- Production/Today Card -->
          <div class="card full-width">
            <div class="card-title">${t.card.production}</div>
            <div style="display: flex; justify-content: space-around;">
               <div class="value-group" style="flex-direction: column; align-items: center;">
                  <span class="unit" style="font-size: 10px;">SOLAR</span>
                  <div>
                    <span class="big-num" style="font-size: 20px;">${s.solarToday.toFixed(2)}</span>
                    <span class="unit">kWh</span>
                  </div>
               </div>
               <div style="width: 1px; background: var(--divider); height: 30px; align-self: center;"></div>
               <div class="value-group" style="flex-direction: column; align-items: center;">
                  <span class="unit" style="font-size: 10px;">GRID CHARGE</span>
                  <div>
                    <span class="big-num" style="font-size: 20px;">${s.gridToday.toFixed(2)}</span>
                    <span class="unit">kWh</span>
                  </div>
               </div>
            </div>
            <ha-icon class="icon-float" icon="mdi:chart-timeline-variant"></ha-icon>
          </div>

        </section>
      </div>
    `;
  }

  getCardSize() {
    return 4;
  }
}

customElements.define("ecoflow-battery-card", EcoflowCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ecoflow-battery-card",
  name: "Ecoflow Battery Card",
  description: "A custom card for Ecoflow power systems (Delta/River Series)",
});
