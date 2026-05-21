const TEMPLATE = document.createElement("template");

TEMPLATE.innerHTML = `
  <style>
    :host {
      display: block;
      min-height: 100vh;
      color: var(--primary-text-color, #1f2937);
      background:
        radial-gradient(circle at top left, rgba(99, 102, 241, 0.14), transparent 28%),
        radial-gradient(circle at top right, rgba(14, 165, 233, 0.14), transparent 22%),
        linear-gradient(180deg, var(--primary-background-color, #f7f7fb), var(--primary-background-color, #ffffff));
    }

    .page {
      max-width: 1240px;
      margin: 0 auto;
      padding: 28px;
      box-sizing: border-box;
    }

    .hero {
      display: grid;
      gap: 10px;
      margin-bottom: 20px;
    }

    .eyebrow {
      display: inline-flex;
      width: fit-content;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(59, 130, 246, 0.12);
      color: #1d4ed8;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-size: clamp(28px, 4vw, 44px);
      line-height: 1.05;
      letter-spacing: -0.04em;
    }

    .subtitle {
      margin: 0;
      max-width: 760px;
      color: var(--secondary-text-color, #586174);
      font-size: 15px;
      line-height: 1.6;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin: 20px 0 24px;
    }

    .stat,
    .card {
      background: rgba(255, 255, 255, 0.82);
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 18px;
      box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
      backdrop-filter: blur(16px);
    }

    .stat {
      padding: 16px;
    }

    .stat-label {
      color: var(--secondary-text-color, #64748b);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .stat-value {
      margin-top: 8px;
      font-size: 28px;
      font-weight: 800;
    }

    .grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 18px;
    }

    .stack {
      display: grid;
      gap: 18px;
    }

    .card {
      padding: 18px;
    }

    .card h2 {
      margin: 0 0 12px;
      font-size: 18px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .form-grid.single {
      grid-template-columns: 1fr;
    }

    label {
      display: grid;
      gap: 6px;
      font-size: 13px;
      color: var(--secondary-text-color, #475569);
    }

    input,
    select,
    textarea {
      appearance: none;
      border: 1px solid rgba(148, 163, 184, 0.4);
      border-radius: 12px;
      padding: 12px 14px;
      font: inherit;
      color: inherit;
      background: rgba(255, 255, 255, 0.95);
      outline: none;
    }

    textarea {
      min-height: 92px;
      resize: vertical;
    }

    input:focus,
    select:focus,
    textarea:focus {
      border-color: rgba(59, 130, 246, 0.8);
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 14px;
    }

    button {
      border: 0;
      border-radius: 999px;
      padding: 11px 16px;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      transition: transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease;
    }

    button:hover {
      transform: translateY(-1px);
    }

    button.primary {
      color: white;
      background: linear-gradient(135deg, #2563eb, #0ea5e9);
      box-shadow: 0 10px 24px rgba(37, 99, 235, 0.26);
    }

    button.secondary {
      background: rgba(15, 23, 42, 0.06);
      color: inherit;
    }

    .group-list {
      display: grid;
      gap: 12px;
    }

    .device-block {
      padding: 14px;
      border-radius: 14px;
      background: rgba(15, 23, 42, 0.03);
      border: 1px solid rgba(148, 163, 184, 0.18);
    }

    .device-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
      font-weight: 800;
    }

    .device-notes {
      margin: -2px 0 10px;
      font-size: 12px;
      color: var(--secondary-text-color, #64748b);
    }

    .command-list {
      display: grid;
      gap: 10px;
    }

    .command {
      display: grid;
      gap: 10px;
      padding: 12px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.16);
    }

    .command-top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: start;
    }

    .pill {
      display: inline-flex;
      width: fit-content;
      padding: 5px 9px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.07);
      font-size: 12px;
      color: var(--secondary-text-color, #475569);
    }

    .command-name {
      font-weight: 800;
    }

    .command-payload {
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 12px;
      word-break: break-all;
      color: var(--secondary-text-color, #334155);
    }

    .command-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .danger {
      background: rgba(239, 68, 68, 0.1);
      color: #b91c1c;
    }

    .hint {
      margin: 0;
      color: var(--secondary-text-color, #64748b);
      font-size: 13px;
      line-height: 1.5;
    }

    .empty {
      padding: 16px;
      border-radius: 14px;
      border: 1px dashed rgba(148, 163, 184, 0.4);
      color: var(--secondary-text-color, #64748b);
      background: rgba(255, 255, 255, 0.5);
    }

    .error {
      margin-top: 12px;
      color: #b91c1c;
      font-size: 13px;
    }

    @media (max-width: 1100px) {
      .grid,
      .stats {
        grid-template-columns: 1fr;
      }
    }
  </style>
  <div class="page">
    <div class="hero">
      <div class="eyebrow">Home Assistant RF library</div>
      <h1>RF Command Manager</h1>
      <p class="subtitle">
        Organize Broadlink RF and IR commands by device, send them quickly, and keep the library local to Home Assistant.
      </p>
    </div>

    <div class="stats">
      <div class="stat"><div class="stat-label">Devices</div><div class="stat-value" data-stat="devices">0</div></div>
      <div class="stat"><div class="stat-label">Commands</div><div class="stat-value" data-stat="commands">0</div></div>
      <div class="stat"><div class="stat-label">Favorites</div><div class="stat-value" data-stat="favorites">0</div></div>
      <div class="stat"><div class="stat-label">Macros</div><div class="stat-value" data-stat="macros">0</div></div>
    </div>

    <div class="grid">
      <div class="stack">
        <section class="card">
          <h2>Library</h2>
          <div class="group-list" data-library></div>
        </section>
      </div>

      <div class="stack">
        <section class="card">
          <h2>Add device</h2>
          <div class="form-grid single">
            <label>Name <input data-device-name type="text" placeholder="Living room TV"></label>
            <label>Notes <textarea data-device-notes placeholder="Optional location or notes"></textarea></label>
          </div>
          <div class="actions"><button class="primary" data-device-save>Add device</button></div>
        </section>

        <section class="card">
          <h2>Add command</h2>
          <div class="form-grid">
            <label>Name <input data-command-name type="text" placeholder="Power"></label>
            <label>Type
              <select data-command-type>
                <option value="rf">RF</option>
                <option value="ir">IR</option>
                <option value="macro">Macro</option>
              </select>
            </label>
            <label>Device
              <select data-command-device></select>
            </label>
            <label>Favorite
              <select data-command-favorite>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </label>
          </div>
          <div style="margin-top:12px">
            <label>Payload <textarea data-command-payload placeholder="Captured payload or command data"></textarea></label>
          </div>
          <div class="actions"><button class="primary" data-command-save>Add command</button></div>
          <p class="hint">This first version captures and organizes commands manually. A true learn/capture flow can hook into this same library next.</p>
        </section>

        <section class="card">
          <h2>Macros</h2>
          <div class="form-grid single">
            <label>Name <input data-macro-name type="text" placeholder="Movie night"></label>
            <label>Command IDs <textarea data-macro-command-ids placeholder="Comma-separated command IDs"></textarea></label>
          </div>
          <div class="actions"><button class="secondary" data-macro-save>Create macro</button></div>
        </section>
      </div>
    </div>

    <div class="error" data-error hidden></div>
  </div>
`;

class RFCommandManagerPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._library = { version: 1, devices: {}, commands: {}, macros: {} };
    this._loading = false;
  }

  setProperties(props) {
    Object.assign(this, props);
    this._render();
    if (this.hass && !this._loaded) {
      this._loaded = true;
      this._refresh();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.shadowRoot && !this.shadowRoot.childNodes.length) {
      this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
      this._bindEvents();
      this._render();
    }
    if (this.hass && !this._loaded) {
      this._loaded = true;
      this._refresh();
    }
  }

  _bindEvents() {
    const root = this.shadowRoot;
    root.querySelector("[data-device-save]").addEventListener("click", () => this._addDevice());
    root.querySelector("[data-command-save]").addEventListener("click", () => this._addCommand());
    root.querySelector("[data-macro-save]").addEventListener("click", () => this._addMacro());
  }

  async _refresh() {
    if (!this.hass || this._loading) return;
    this._loading = true;
    try {
      this._library = await this.hass.callWS({ type: "rf_command_manager/get_library" });
      this._error(null);
      this._render();
    } catch (err) {
      this._error(err?.message || String(err));
    } finally {
      this._loading = false;
    }
  }

  _deviceOptions(selectedId) {
    const devices = Object.values(this._library.devices || {});
    return [`<option value="">No device</option>`]
      .concat(devices.map((device) => `<option value="${device.id}" ${device.id === selectedId ? "selected" : ""}>${this._escape(device.name)}</option>`))
      .join("");
  }

  _render() {
    if (!this.shadowRoot) return;
    const devices = Object.values(this._library.devices || {});
    const commands = Object.values(this._library.commands || {});
    const macros = Object.values(this._library.macros || {});
    const favorites = commands.filter((command) => command.favorite).length;

    this.shadowRoot.querySelectorAll("[data-stat]").forEach((el) => {
      const key = el.getAttribute("data-stat");
      el.textContent = String(
        key === "devices"
          ? devices.length
          : key === "commands"
            ? commands.length
            : key === "favorites"
              ? favorites
              : macros.length
      );
    });

    const deviceSelect = this.shadowRoot.querySelector("[data-command-device]");
    if (deviceSelect) deviceSelect.innerHTML = this._deviceOptions(deviceSelect.value);

    const grouped = new Map();
    for (const device of devices) grouped.set(device.id, { device, commands: [] });
    grouped.set("__unassigned__", { device: null, commands: [] });
    for (const command of commands) {
      const bucket = command.device_id && grouped.has(command.device_id)
        ? grouped.get(command.device_id)
        : grouped.get("__unassigned__");
      bucket.commands.push(command);
    }

    const libraryEl = this.shadowRoot.querySelector("[data-library]");
    if (!commands.length && !devices.length) {
      libraryEl.innerHTML = `<div class="empty">No devices or commands yet. Start by adding a device and a command on the right.</div>`;
    } else {
      libraryEl.innerHTML = [...grouped.values()]
        .filter((bucket) => bucket.device || bucket.commands.length)
        .map((bucket) => this._renderDeviceBlock(bucket))
        .join("");
    }

    libraryEl.querySelectorAll("[data-send]").forEach((button) => {
      button.addEventListener("click", () => this._sendCommand(button.getAttribute("data-send")));
    });
    libraryEl.querySelectorAll("[data-delete]").forEach((button) => {
      button.addEventListener("click", () => this._deleteCommand(button.getAttribute("data-delete")));
    });
    libraryEl.querySelectorAll("[data-toggle-favorite]").forEach((button) => {
      button.addEventListener("click", () => this._toggleFavorite(button.getAttribute("data-toggle-favorite")));
    });
  }

  _renderDeviceBlock(bucket) {
    const title = bucket.device ? this._escape(bucket.device.name) : "Unassigned commands";
    const notes = bucket.device?.notes ? `<div class="device-notes">${this._escape(bucket.device.notes)}</div>` : "";
    const commands = bucket.commands
      .map(
        (command) => `
          <div class="command">
            <div class="command-top">
              <div>
                <div class="command-name">${this._escape(command.name)} ${command.favorite ? "★" : ""}</div>
                <div class="pill">${this._escape(command.command_type.toUpperCase())}</div>
              </div>
              <div class="pill">Sent ${command.send_count || 0}x</div>
            </div>
            <div class="command-payload">${this._escape(command.payload || "")}</div>
            <div class="command-actions">
              <button class="primary" data-send="${command.id}">Send</button>
              <button class="secondary" data-toggle-favorite="${command.id}">${command.favorite ? "Unfavorite" : "Favorite"}</button>
              <button class="danger" data-delete="${command.id}">Delete</button>
            </div>
          </div>
        `
      )
      .join("");

    return `
      <div class="device-block">
        <div class="device-title">
          <span>${title}</span>
          ${bucket.device ? `<span class="pill">${bucket.commands.length} command(s)</span>` : ""}
        </div>
        ${notes}
        <div class="command-list">${commands || `<div class="empty">No commands in this group.</div>`}</div>
      </div>
    `;
  }

  async _addDevice() {
    const name = this.shadowRoot.querySelector("[data-device-name]").value.trim();
    const notes = this.shadowRoot.querySelector("[data-device-notes]").value.trim();
    if (!name) return this._error("Device name is required.");
    await this.hass.callService("rf_command_manager", "add_device", { name, notes: notes || undefined });
    this.shadowRoot.querySelector("[data-device-name]").value = "";
    this.shadowRoot.querySelector("[data-device-notes]").value = "";
    await this._refresh();
  }

  async _addCommand() {
    const name = this.shadowRoot.querySelector("[data-command-name]").value.trim();
    const command_type = this.shadowRoot.querySelector("[data-command-type]").value;
    const payload = this.shadowRoot.querySelector("[data-command-payload]").value.trim();
    const device_id = this.shadowRoot.querySelector("[data-command-device]").value || undefined;
    const favorite = this.shadowRoot.querySelector("[data-command-favorite]").value === "true";
    if (!name || !payload) return this._error("Command name and payload are required.");
    await this.hass.callService("rf_command_manager", "add_command", {
      name,
      command_type,
      payload,
      device_id,
      favorite,
    });
    this.shadowRoot.querySelector("[data-command-name]").value = "";
    this.shadowRoot.querySelector("[data-command-payload]").value = "";
    await this._refresh();
  }

  async _addMacro() {
    const name = this.shadowRoot.querySelector("[data-macro-name]").value.trim();
    const raw = this.shadowRoot.querySelector("[data-macro-command-ids]").value.trim();
    const command_ids = raw ? raw.split(",").map((item) => item.trim()).filter(Boolean) : [];
    if (!name || !command_ids.length) return this._error("Macro name and command IDs are required.");
    await this.hass.callService("rf_command_manager", "add_macro", { name, command_ids });
    this.shadowRoot.querySelector("[data-macro-name]").value = "";
    this.shadowRoot.querySelector("[data-macro-command-ids]").value = "";
    await this._refresh();
  }

  async _sendCommand(commandId) {
    await this.hass.callService("rf_command_manager", "send_command", { command_id: commandId });
    await this._refresh();
  }

  async _deleteCommand(commandId) {
    if (!confirm("Delete this command?")) return;
    await this.hass.callService("rf_command_manager", "remove_command", { command_id: commandId });
    await this._refresh();
  }

  async _toggleFavorite(commandId) {
    const command = this._library.commands[commandId];
    if (!command) return;
    await this.hass.callService("rf_command_manager", "update_command", {
      command_id: commandId,
      favorite: !command.favorite,
    });
    await this._refresh();
  }

  _error(message) {
    const el = this.shadowRoot.querySelector("[data-error]");
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = message;
  }

  _escape(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
}

customElements.define("rf-command-manager-panel", RFCommandManagerPanel);