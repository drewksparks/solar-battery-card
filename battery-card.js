import { LitElement, html, css } from "https://unpkg.com/lit-element/lit-element.js?module";

/**
 * VISUAL EDITOR COMPONENT
 * Rebuilt using standard <ha-form> for native entity pickers
 */
class EcoflowCardEditor extends LitElement {
  static get properties() {
    return {
      hass: {},
      _config: {},
    };
  }

  setConfig(config) {
    this._config = config;
  }

  _computeLabel(schema) {
    const labels = {
      name: "Card Title",
      max_solar: "Max Solar (Watts)",
      status: "System Status (online/offline)",
      grid_power: "Grid Power (Watts)",
      output_power: "Output Power (Watts)",
      solar_power: "Solar Power (Watts)",
      p1_power: "Solar Input 1",
      battery_level: "Current Battery Level",
      battery_capacity: "Battery Remaining Capacity (mAh)",
      battery_volts: "Battery Voltage Sensor",
      solar_total: "Solar Total Energy (cumulative Wh or kWh)",
      grid_total: "Grid Total Energy (cumulative Wh or kWh)",
      output_total: "Output Total Energy (cumulative Wh or kWh)",
      ac_enabled_switch: "AC Switch",
      dc_enabled_switch: "DC Switch",
      backup_reserve_number: "Backup Reserve Slider"
    };
    return labels[schema.name] || schema.name;
  }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const data = ev.detail.value;

    const formKeys = [
      "status", "grid_power", "output_power", "solar_power", "p1_power", 
      "battery_level", "battery_capacity", "battery_volts", 
      "solar_total", "grid_total", "output_total", 
      "ac_enabled_switch", "dc_enabled_switch", "backup_reserve_number"
    ];

    const entitiesConfig = {};
    formKeys.forEach(key => {
      if (data[key]) entitiesConfig[key] = data[key];
    });

    const finalEntities = { ...this._config.entities, ...entitiesConfig };

    // Clean up empty keys
    formKeys.forEach(key => {
      if (!data[key]) delete finalEntities[key];
    });

    const newConfig = {
      ...this._config,
      name: data.name,
      max_solar: data.max_solar,
      entities: finalEntities
    };

    const event = new CustomEvent("config-changed", {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  render() {
    if (!this.hass || !this._config) return html``;

    // Flatten config for ha-form
    const data = {
      name: this._config.name,
      max_solar: this._config.max_solar,
      ...(this._config.entities || {})
    };

    const schemaGen = [
      { name: "name", selector: { text: {} } },
      { name: "max_solar", selector: { number: { mode: "box", min: 0 } } }
    ];

    const schemaSensors = [
      { name: "status", selector: { entity: { domain: "sensor" } } },
      { name: "grid_power", selector: { entity: { domain: "sensor" } } },
      { name: "output_power", selector: { entity: { domain: "sensor" } } },
      { name: "solar_power", selector: { entity: { domain: "sensor" } } },
      { name: "p1_power", selector: { entity: { domain: "sensor" } } },
      { name: "battery_level", selector: { entity: { domain: "sensor" } } },
      { name: "battery_capacity", selector: { entity: { domain: "sensor" } } },
      { name: "battery_volts", selector: { entity: { domain: "sensor" } } }
    ];

    const schemaEnergy = [
      { name: "solar_total", selector: { entity: { domain: "sensor" } } },
      { name: "grid_total", selector: { entity: { domain: "sensor" } } },
      { name: "output_total", selector: { entity: { domain: "sensor" } } }
    ];

    const schemaControls = [
      { name: "ac_enabled_switch", selector: { entity: { domain: "switch" } } },
      { name: "dc_enabled_switch", selector: { entity: { domain: "switch" } } },
      { name: "backup_reserve_number", selector: { entity: { domain: "number" } } }
    ];

    return html`
      <div class="card-config">
        <h3>Main Settings</h3>
        <ha-form .hass=${this.hass} .data=${data} .schema=${schemaGen} .computeLabel=${this._computeLabel} @value-changed=${this._valueChanged}></ha-form>
        
        <div class="divider"></div>
        <h3>System Sensors</h3>
        <ha-form .hass=${this.hass} .data=${data} .schema=${schemaSensors} .computeLabel=${this._computeLabel} @value-changed=${this._valueChanged}></ha-form>
        
        <div class="divider"></div>
        <h3>Daily Energy Tracking</h3>
        <p class="note">Aside from Solar Producton, these are NOT default sensors, must be created using a left riemann sum template helper. Helpers are reccomended to be cumulative, the card filters values for the day automatically. Leave blank to remove from UI. </p>

        <ha-form .hass=${this.hass} .data=${data} .schema=${schemaEnergy} .computeLabel=${this._computeLabel} @value-changed=${this._valueChanged}></ha-form>
        
        <div class="divider"></div>
        <h3>System Controls (Optional)</h3>
        <p class="note">Leave blank to hide the control. The card will automatically generate the proper switch/slider based on the entity domain.</p>
        <ha-form .hass=${this.hass} .data=${data} .schema=${schemaControls} .computeLabel=${this._computeLabel} @value-changed=${this._valueChanged}></ha-form>
        
        <div class="divider"></div>
        <p class="note">Note: For extra/slave batteries, please configure using the YAML editor.</p>
      </div>
    `;
  }

  static get styles() {
    return css`
      .card-config { padding: 0 16px 16px; }
      h3 { margin-bottom: 12px; font-size: 16px; font-weight: 500; color: var(--primary-text-color); }
      .divider { height: 1px; background: var(--divider-color); margin: 24px 0; }
      .note { font-size: 12px; color: var(--secondary-text-color); font-style: italic; margin-bottom: 12px; }
    `;
  }
}

customElements.define("ecoflow-battery-card-editor", EcoflowCardEditor);


/**
 * MAIN CARD COMPONENT
 */
const translations = {
  en: {
    card: {
      solar: "Solar Input",
      output: "AC Output",
      grid: "Grid/AC Input",
      battery: "Battery",
      production: "Energy Today",
      realtime: "Realtime",
      today: "Today",
      controls: "System Controls"
    },
    labels: {
      last_update: "Last Update",
      capacity: "Remaining Energy",
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
        --battery-high: #4caf50;
        --battery-medium: #ff9800;
        --battery-low: #f44336;
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
        margin-bottom: 12px;
        padding: 0 10px;
      }

      .header .title { font-size: 20px; font-weight: 600; }
      .header .update { font-size: 11px; color: var(--muted); }

      /* Detailed Device Visualizer (The "Unit") */
      .device {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        padding: 10px 0 20px;
        cursor: pointer;
      }

      .unit {
        width: 70px;
        height: 110px;
        border-radius: 16px;
        background: linear-gradient(135deg, #68686A 0%, #48484a 45%, #5a5a5c 100%);
        box-shadow: inset 0 2px 0 rgba(255,255,255,.05), inset 0 -8px 16px rgba(0,0,0,.45);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .unit .battery-bar-inner {
        width: 10px;
        height: 70px;
        border-radius: 5px;
        border: 1px solid #000;
        background: rgb(28, 28, 28);
        position: relative;
        overflow: hidden;
        display: flex;
        justify-content: center;
      }

      .unit .battery-fill-inner {
        position: absolute;
        bottom: 1px;
        width: 6px;
        border-radius: 2px;
        transition: height .6s ease;
      }

      .unit .battery-fill-inner.high { background: linear-gradient(#5be5bf, #2ae5a8); box-shadow: 0 0 3px #5be5bf; }
      .unit .battery-fill-inner.medium { background: linear-gradient(#ffc107, #ff9800); box-shadow: 0 0 3px #ffc107; }
      .unit .battery-fill-inner.low { background: linear-gradient(#ff5722, #f44336); box-shadow: 0 0 3px #ff5722; }

      .unit .battery-fill-inner.charging { animation: pulseGreen 2.5s infinite ease-in-out; }
      .unit .battery-fill-inner.discharging { animation: pulseOrange 2.5s infinite ease-in-out; }

      @keyframes pulseGreen {
        0%,100% { opacity:0.6; transform:scaleY(0.95); }
        50%     { opacity:1;   transform:scaleY(1.05); }
      }
      @keyframes pulseOrange {
        0%,100% { opacity:0.6; transform:scaleY(0.95); }
        50%     { opacity:1;   transform:scaleY(1.05); }
      }

      .device-info { display: flex; flex-direction: column; align-items: center; }
      .device-status-text { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; }
      .status-online { color: var(--battery-high); }
      .status-offline { color: var(--muted); }

      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

      .card {
        position: relative;
        background: rgba(100, 100, 100, 0.15);
        border-radius: var(--radius);
        padding: 16px;
        box-sizing: border-box;
        min-height: 100px;
        cursor: pointer;
        transition: background 0.3s ease;
      }
      .card:hover { background: rgba(100, 100, 100, 0.2); }

      .full-width { grid-column: 1 / -1; }

      .card-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; display: flex; justify-content: space-between; }
      .value-group { display: flex; align-items: baseline; gap: 4px; }
      .big-num { font-size: 24px; font-weight: 400; }
      .unit-text { font-size: 14px; color: var(--muted); }

      .bar-container { margin-top: 10px; }
      .bar-wrap { display: flex; gap: 8px; height: 6px; background: rgba(0, 0, 0, 0.2); border-radius: 3px; overflow: hidden; }
      .bar-fill { height: 100%; background: #549EA4; transition: width 0.6s ease; }
      .bar-labels { display: flex; justify-content: space-between; margin-top: 4px; font-size: 11px; color: var(--muted); }

      .battery-section { grid-row: span 2; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }

      .ring {
        position: relative;
        width: 150px;
        height: 150px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        padding: 6px;
        box-sizing: border-box;
        overflow: visible;
      }

      .ring::before {
        content: ""; position: absolute; inset: -3px; border-radius: 50%;
        background: inherit; filter: blur(8px); opacity: 0.6; z-index: 0;
      }

      .ring-inner {
        position: relative; z-index: 1; width: 100%; height: 100%; border-radius: 50%;
        background: #1c1c1c; display: flex; flex-direction: column; align-items: center; justify-content: center;
      }

      .ring-label { font-size: 12px; color: white; opacity: 0.8; }
      .ring-percent { font-size: 32px; font-weight: 400; color: white; line-height: 1.1; }

      .icon-float { position: absolute; bottom: 14px; right: 14px; font-size: 22px; color: var(--text); }
      ha-icon[icon="mdi:battery-high"] { transform: rotate(90deg); transform-origin: center; display: inline-block; }

      .battery-bar {
        width: 12px; height: 20px; border: 1.5px solid var(--muted); border-radius: 2px;
        position: relative; padding: 1px; box-sizing: border-box;
      }
      .battery-bar::after {
        content: ""; position: absolute; top: -4px; left: 3px; width: 4px; height: 2px;
        background: var(--muted); border-radius: 1px 1px 0 0;
      }
      .battery-fill {
        width: 100%; border-radius: 1px; position: absolute; bottom: 1px; left: 0;
        transition: height 0.5s ease, background-color 0.3s ease;
      }
      .battery-fill.high { background-color: var(--battery-high); }
      .battery-fill.medium { background-color: var(--battery-medium); }
      .battery-fill.low { background-color: var(--battery-low); }

      .slave-card {
        grid-column: 1 / -1; background: rgba(100, 100, 100, 0.15); border-radius: var(--radius);
        padding: 16px; box-sizing: border-box; display: flex; align-items: center; gap: 16px; cursor: pointer; transition: background 0.3s ease;
      }
      .slave-card:hover { background: rgba(100, 100, 100, 0.2); }
      .slave-icon-ring { width: 50px; height: 50px; border-radius: 50%; display: grid; place-items: center; padding: 3px; box-sizing: border-box; }
      .slave-icon-inner { width: 100%; height: 100%; border-radius: 50%; background: #1c1c1c; display: grid; place-items: center; }
      .slave-details { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
      .slave-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
      .slave-name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .slave-level { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
      .slave-stats-grid { display: flex; justify-content: space-between; }

      /* Dynamic Controls Section */
      .controls-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 8px; flex-wrap: wrap; }
      .control-item {
        flex: 1; min-width: 80px; display: flex; flex-direction: column; align-items: center;
        background: rgba(255, 255, 255, 0.05); padding: 10px; border-radius: 12px; overflow: hidden;
      }
      .control-label { 
        font-size: 10px; color: var(--muted); margin-bottom: 8px; text-transform: uppercase; 
        text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
      }
      
      .switch-wrap { position: relative; display: inline-block; width: 40px; height: 22px; }
      .switch-wrap input { opacity: 0; width: 0; height: 0; }
      .slider-bg {
        position: absolute; cursor: pointer; inset: 0; background-color: rgba(0,0,0,0.3); transition: .4s; border-radius: 22px;
      }
      .slider-bg:before {
        position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px;
        background-color: white; transition: .4s; border-radius: 50%;
      }
      input:checked + .slider-bg { background-color: var(--accent); }
      input:checked + .slider-bg:before { transform: translateX(18px); }

      .range-input {
        width: 100%; -webkit-appearance: none; background: rgba(0,0,0,0.3);
        height: 6px; border-radius: 3px; outline: none; margin-top: 4px;
      }
      .range-input::-webkit-slider-thumb {
        -webkit-appearance: none; width: 18px; height: 18px; background: var(--accent); border-radius: 50%; cursor: pointer;
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

  static getConfigElement() {
    return document.createElement("ecoflow-battery-card-editor");
  }

  static getStubConfig() {
    return {
      name: "Office Delta Pro",
      max_solar: 1200,
      entities: {
        status: "sensor.office_delta_pro_status",
        grid_power: "sensor.office_delta_pro_ac_in_power",
        output_power: "sensor.office_delta_pro_ac_out_power",
        battery_level: "sensor.office_delta_pro_battery_level",
        battery_capacity: "sensor.office_delta_pro_main_remain_capacity",
        battery_volts: "sensor.office_delta_pro_battery_volts",
        solar_power: "sensor.office_delta_pro_solar_in_power",
        solar_total: "sensor.office_delta_pro_solar_in_energy",
        grid_total: "sensor.delta_pro_total_energy_in",
        output_total: "sensor.delta_pro_total_energy_out"
      }
    };
  }

  constructor() {
    super();
    this._midnightStats = {};
    this._fetchingHistory = false;
    this._historyDate = null;
  }

  setConfig(config) {
    this.config = config;
  }

  set hass(hass) {
    this._hass = hass;
    this.state = this._updateState();
  }

  async _fetchMidnightValues(entities) {
    const today = new Date().toLocaleDateString();
    if (this._historyDate === today || this._fetchingHistory) return;
    this._fetchingHistory = true;
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    const isoMidnight = midnight.toISOString();

    try {
      const promises = Object.values(entities).map(async (entityId) => {
        if (!entityId || typeof entityId !== 'string' || !entityId.startsWith('sensor.')) return;
        const url = `history/period/${isoMidnight}?filter_entity_id=${entityId}&minimal_response&end_time=${isoMidnight}`;
        const res = await this._hass.callApi('GET', url);
        if (res && res.length > 0 && res[0].length > 0) {
          this._midnightStats[entityId] = parseFloat(res[0][0].state) || 0;
        }
      });
      await Promise.all(promises);
      this._historyDate = today;
      this.requestUpdate();
    } catch (err) {
      console.warn("Battery Card: Failed to fetch HA history.", err);
    } finally {
      this._fetchingHistory = false;
    }
  }

  _updateState() {
    if (!this._hass || !this.config || !this.config.entities) return null;
    const e = this.config.entities;

    this._fetchMidnightValues({ 
      solar: e.solar_total, grid: e.grid_total, output: e.output_total 
    });

    const getState = (entityId) => {
      if (!entityId || !this._hass.states[entityId]) return { val: 0, unit: '', state: 'unknown' };
      const stateObj = this._hass.states[entityId];
      return {
        val: parseFloat(stateObj.state) || 0,
        state: stateObj.state,
        unit: stateObj.attributes.unit_of_measurement || ''
      };
    };

    const capacityObj = getState(e.battery_capacity);
    let volts = 50; 
    if (e.battery_volts && this._hass.states[e.battery_volts]) {
       volts = parseFloat(this._hass.states[e.battery_volts].state) || 50;
    }

    let currentKWh = capacityObj.val;
    const unit = capacityObj.unit ? capacityObj.unit.toLowerCase() : '';
    if (unit === 'mah' || (capacityObj.val > 10000)) {
      currentKWh = (capacityObj.val * volts) / 1000000;
    } else if (unit === 'wh' || (capacityObj.val > 1000 && capacityObj.val <= 10000)) {
      currentKWh = capacityObj.val / 1000;
    }

    const slaveBatteries = [];
    if (e.slave_batteries && Array.isArray(e.slave_batteries)) {
      e.slave_batteries.forEach(slave => {
        const sCapObj = getState(slave.capacity);
        let sVolts = 50; 
        if (slave.volts && this._hass.states[slave.volts]) {
           sVolts = parseFloat(this._hass.states[slave.volts].state) || 50;
        }
        let sKWh = sCapObj.val;
        const sUnit = sCapObj.unit ? sCapObj.unit.toLowerCase() : '';
        if (sUnit === 'mah' || (sCapObj.val > 10000)) {
          sKWh = (sCapObj.val * sVolts) / 1000000;
        } else if (sUnit === 'wh') {
          sKWh = sCapObj.val / 1000;
        }
        slaveBatteries.push({
          name: slave.name || "Extra Battery",
          level: getState(slave.level).val,
          capacity: sKWh,
          inPower: getState(slave.in_power).val,
          outPower: getState(slave.out_power).val,
          entityId: slave.level
        });
      });
    }

    const getTodayValue = (entityId) => {
      if (!entityId) return 0;
      const current = getState(entityId);
      const startVal = this._midnightStats[entityId];
      let diff = (startVal !== undefined && current.val >= startVal) ? current.val - startVal : 0;
      const cUnit = current.unit ? current.unit.toLowerCase() : '';
      return cUnit === 'wh' ? diff / 1000 : diff;
    };

    // Dynamic Controls Generation
    const controls = [];
    const controlKeys = ['ac_enabled_switch', 'dc_enabled_switch', 'backup_reserve_number'];
    controlKeys.forEach(key => {
      const entityId = e[key];
      if (entityId && this._hass.states[entityId]) {
        const stateObj = this._hass.states[entityId];
        let name = stateObj.attributes.friendly_name || entityId;
        name = name.replace(/Office Delta Pro /i, "").trim(); // Clean up common prefix

        controls.push({
          id: entityId,
          domain: entityId.split('.')[0],
          state: stateObj.state,
          val: parseFloat(stateObj.state) || 0,
          name: name
        });
      }
    });

    return {
      status: getState(e.status).state,
      gridPower: getState(e.grid_power).val,
      outputPower: getState(e.output_power).val,
      solarPower: getState(e.solar_power).val,
      p1: getState(e.p1_power).val,
      p2: e.p2_power ? getState(e.p2_power).val : null,
      batteryLevel: getState(e.battery_level).val,
      batteryCapacity: currentKWh,
      slaveBatteries: slaveBatteries,
      solarToday: getTodayValue(e.solar_total),
      gridToday: getTodayValue(e.grid_total),
      outputToday: getTodayValue(e.output_total),
      lastUpdate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      controls: controls
    };
  }

  _toggleSwitch(entityId) {
    if (!entityId) return;
    this._hass.callService("switch", "toggle", { entity_id: entityId });
  }

  _setNumberLevel(ev, entityId) {
    const value = ev.target.value;
    if (!entityId) return;
    this._hass.callService("number", "set_value", { entity_id: entityId, value: value });
  }

  _handleMoreInfo(entityId) {
    if (!entityId) return;
    const event = new CustomEvent("hass-more-info", {
      detail: { entityId },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  _getBatteryClass(percent) {
    if (percent <= 20) return 'low';
    if (percent <= 50) return 'medium';
    return 'high';
  }

  render() {
    if (!this.config || !this.config.entities) {
      return html`<ha-card header="Config Error"><div class="card-content">Define entities in YAML.</div></ha-card>`;
    }

    if (!this.state) return html`<div>Loading...</div>`;
    const s = this.state;
    const e = this.config.entities;
    const lang = this._hass.language || 'en';
    const t = translations[lang] || translations['en'];

    const solar = Number(s.solarPower);
    const output = Number(s.outputPower);

    const maxSolar = this.config.max_solar || 800;
    const p1Width = Math.min((s.p1 / maxSolar) * 100, 100);
    const p2Width = s.p2 !== null ? Math.min((s.p2 / maxSolar) * 100, 100) : 0;
    const ringColor = `conic-gradient(#58C3D3 ${s.batteryLevel}%, rgba(255,255,255,0.1) ${s.batteryLevel}% 100%)`;
    const gridTotalLabel = (e.grid_total && e.grid_total.includes("battery_charge")) ? "GRID CHARGE" : "GRID IMPORT";
    const hasOutputTotal = !!e.output_total;

    const batteryStateClass = solar > output && s.batteryLevel < 100
      ? 'charging'
      : output > solar && s.batteryLevel > 0
        ? 'discharging'
        : '';

    return html`
      <div class="container">
        <div class="header">
          <div class="title">${this.config.name || "Ecoflow Delta Pro"}</div>
          <div class="update">${t.labels.last_update}: ${s.lastUpdate}</div>
        </div>

        <div class="device" @click="${() => this._handleMoreInfo(e.status)}">
          <div class="unit">
            <div class="battery-bar-inner">
              <div class="battery-fill-inner ${this._getBatteryClass(s.batteryLevel)} ${batteryStateClass}" 
                   style="height:${Math.min(s.batteryLevel, 98)}%">
              </div>
            </div>
          </div>
          <div class="device-info">
            <div class="device-status-text ${s.status === 'online' ? 'status-online' : 'status-offline'}">
              ${s.status || 'offline'}
            </div>
          </div>
        </div>

        <section class="grid">
          <div class="card full-width" @click="${() => this._handleMoreInfo(e.solar_power)}">
            <div class="card-title">
              ${t.card.solar}
              <div class="value-group">
                <span class="big-num">${s.solarPower}</span>
                <span class="unit-text">W</span>
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

          <div class="card battery-section" @click="${() => this._handleMoreInfo(e.battery_level)}">
            <div class="card-title">${t.card.battery}</div>
            <div class="ring" style="background: ${ringColor}">
              <div class="ring-inner">
                <div style="display: flex; align-items: baseline; gap: 4px;">
                    <span class="ring-percent">${s.batteryCapacity.toFixed(2)}</span>
                    <span class="ring-label">kWh</span>
                </div>
                <div class="slave-level" style="margin-top: 2px;">
                   <div class="battery-bar">
                      <div class="battery-fill ${this._getBatteryClass(s.batteryLevel)}" 
                           style="height:${Math.min(s.batteryLevel, 98)}%">
                      </div>
                   </div>
                   <span class="ring-label" style="font-size: 16px;">${s.batteryLevel}%</span>
                </div>
              </div>
            </div>
            <ha-icon class="icon-float" icon="mdi:battery-high"></ha-icon>
          </div>

          <div class="card" @click="${() => this._handleMoreInfo(e.output_power)}">
            <div class="card-title">${t.card.output}</div>
            <div class="value-group">
              <span class="big-num">${s.outputPower}</span>
              <span class="unit-text">W</span>
            </div>
            <div class="update" style="margin-top:4px">${t.card.realtime}</div>
            <ha-icon class="icon-float" icon="mdi:power-plug"></ha-icon>
          </div>

          <div class="card" @click="${() => this._handleMoreInfo(e.grid_power)}">
            <div class="card-title">${t.card.grid}</div>
            <div class="value-group">
              <span class="big-num">${s.gridPower}</span>
              <span class="unit-text">W</span>
            </div>
             <div class="update" style="margin-top:4px">Grid Input</div>
            <ha-icon class="icon-float" icon="mdi:transmission-tower"></ha-icon>
          </div>

          <!-- Dynamic Controls Section -->
          ${s.controls && s.controls.length > 0 ? html`
            <div class="card full-width">
              <div class="card-title">${t.card.controls}</div>
              <div class="controls-row">
                ${s.controls.map(ctrl => {
                  if (ctrl.domain === 'switch') {
                    return html`
                      <div class="control-item">
                        <span class="control-label" title="${ctrl.name}">${ctrl.name}</span>
                        <label class="switch-wrap">
                          <input type="checkbox" .checked="${ctrl.state === 'on'}" @change="${() => this._toggleSwitch(ctrl.id)}">
                          <span class="slider-bg"></span>
                        </label>
                      </div>
                    `;
                  } else if (ctrl.domain === 'number') {
                    return html`
                      <div class="control-item" style="flex: 2;">
                        <span class="control-label" title="${ctrl.name}">${ctrl.name}: ${ctrl.val}%</span>
                        <input type="range" class="range-input" min="0" max="100" .value="${ctrl.val}" @change="${(ev) => this._setNumberLevel(ev, ctrl.id)}">
                      </div>
                    `;
                  }
                  return '';
                })}
              </div>
              <ha-icon class="icon-float" icon="mdi:cog-outline"></ha-icon>
            </div>
          ` : ''}

          ${s.slaveBatteries && s.slaveBatteries.length > 0 ? s.slaveBatteries.map(slave => html`
            <div class="slave-card" @click="${() => this._handleMoreInfo(slave.entityId)}">
              <div class="slave-icon-ring" style="background: conic-gradient(#58C3D3 ${slave.level}%, rgba(255,255,255,0.1) ${slave.level}% 100%);">
                <div class="slave-icon-inner"><ha-icon icon="mdi:battery-plus" style="--mdc-icon-size: 20px; color: white;"></ha-icon></div>
              </div>
              <div class="slave-details">
                <div class="slave-header">
                  <span class="slave-name">${slave.name}</span>
                  <div class="slave-level">
                    <div class="battery-bar">
                      <div class="battery-fill ${this._getBatteryClass(slave.level)}" 
                           style="height:${Math.min(slave.level, 98)}%">
                      </div>
                    </div>
                    <span style="color: ${slave.level > 20 ? 'var(--accent)' : '#ff5a5a'}">${slave.level}%</span>
                  </div>
                </div>
                <div class="slave-stats-grid">
                  <div class="value-group" style="flex-direction: column;"><span class="unit-text" style="font-size: 9px;">CAPACITY</span><div><span class="big-num" style="font-size: 16px;">${slave.capacity.toFixed(2)}</span><span class="unit-text" style="font-size: 10px;"> kWh</span></div></div>
                  <div class="value-group" style="flex-direction: column;"><span class="unit-text" style="font-size: 9px;">INPUT</span><div><span class="big-num" style="font-size: 16px;">${slave.inPower}</span><span class="unit-text" style="font-size: 10px;"> W</span></div></div>
                  <div class="value-group" style="flex-direction: column;"><span class="unit-text" style="font-size: 9px;">OUTPUT</span><div><span class="big-num" style="font-size: 16px;">${slave.outPower}</span><span class="unit-text" style="font-size: 10px;"> W</span></div></div>
                </div>
              </div>
            </div>
          `) : ''}

          <div class="card full-width" @click="${() => this._handleMoreInfo(e.solar_total)}">
            <div class="card-title">${t.card.production}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 4px;">
               <div class="value-group" style="flex-direction: column; align-items: center; flex: 1;">
                  <span class="unit-text" style="font-size: 9px; white-space: nowrap;">SOLAR GENERATED</span>
                  <div><span class="big-num" style="font-size: 18px;">${this._historyDate ? s.solarToday.toFixed(2) : "--"}</span><span class="unit-text" style="font-size: 12px;">kWh</span></div>
               </div>
               <div style="width: 1px; background: var(--divider); height: 25px;"></div>
               <div class="value-group" style="flex-direction: column; align-items: center; flex: 1;">
                  <span class="unit-text" style="font-size: 9px; white-space: nowrap;">GRID IMPORT</span>
                  <div><span class="big-num" style="font-size: 18px;">${this._historyDate ? s.gridToday.toFixed(2) : "--"}</span><span class="unit-text" style="font-size: 12px;">kWh</span></div>
               </div>
               ${hasOutputTotal ? html`
                  <div style="width: 1px; background: var(--divider); height: 25px;"></div>
                  <div class="value-group" style="flex-direction: column; align-items: center; flex: 1;">
                    <span class="unit-text" style="font-size: 9px; white-space: nowrap;">AC DELIVERED</span>
                    <div><span class="big-num" style="font-size: 18px;">${this._historyDate ? s.outputToday.toFixed(2) : "--"}</span><span class="unit-text" style="font-size: 12px;">kWh</span></div>
                  </div>
               ` : ''}
            </div>
            <ha-icon class="icon-float" icon="mdi:chart-timeline-variant"></ha-icon>
          </div>
        </section>
      </div>
    `;
  }

  getCardSize() {
    return 8 + (this.state && this.state.slaveBatteries ? this.state.slaveBatteries.length : 0);
  }
}

customElements.define("ecoflow-battery-card", EcoflowCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ecoflow-battery-card",
  name: "Ecoflow Battery Card",
  description: "A custom card for Ecoflow power systems (Delta/River Series)",
});
