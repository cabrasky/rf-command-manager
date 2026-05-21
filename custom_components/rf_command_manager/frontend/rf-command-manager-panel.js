class RFCommandManagerPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.state = {
      devices: [],
      loading: true,
      error: "",
      selectedDeviceId: "",
    };

    this.messageId = 1;
  }

  connectedCallback() {
    this.render();
    this.loadLibrary();
  }

  async loadLibrary() {
    this.setState({ loading: true, error: "" });
    try {
      const payload = await this.ws({ type: "rf_command_manager/list" });
      const selectedDeviceId =
        this.state.selectedDeviceId || payload.devices?.[0]?.id || "";
      this.setState({
        devices: payload.devices || [],
        selectedDeviceId,
        loading: false,
      });
    } catch (err) {
      this.setState({ loading: false, error: err.message || String(err) });
    }
  }

  get selectedDevice() {
    return this.state.devices.find((item) => item.id === this.state.selectedDeviceId) || null;
  }

  setState(partial) {
    this.state = { ...this.state, ...partial };
    this.render();
  }

  ws(command) {
    const id = this.messageId++;

    return new Promise((resolve, reject) => {
      if (!window.hassConnection || !window.hassConnection.then) {
        reject(new Error("Home Assistant connection is not available"));
        return;
      }

      window.hassConnection
        .then(({ conn }) => conn.sendMessagePromise({ id, ...command }))
        .then(resolve)
        .catch((err) => reject(new Error(err?.message || "Websocket request failed")));
    });
  }

  async submitAddDevice(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const payload = {
        type: "rf_command_manager/device/add",
        name: String(data.get("name") || "").trim(),
        connection_type: String(data.get("connection_type") || "broadlink").trim(),
        host: String(data.get("host") || "").trim() || undefined,
        mac: String(data.get("mac") || "").trim() || undefined,
        remote_entity_id: String(data.get("remote_entity_id") || "").trim() || undefined,
      };

      const response = await this.ws(payload);
      form.reset();

      this.setState({
        devices: response.devices || [],
        selectedDeviceId: response.devices?.[0]?.id || "",
        error: "",
      });
    } catch (err) {
      this.setState({ error: err.message || String(err) });
    }
  }

  async submitAddCommand(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await this.ws({
        type: "rf_command_manager/command/add",
        device_id: this.state.selectedDeviceId,
        name: String(data.get("name") || "").trim(),
        protocol: String(data.get("protocol") || "rf").trim(),
        payload: String(data.get("payload") || "").trim(),
        notes: String(data.get("notes") || "").trim(),
      });

      form.reset();
      this.setState({
        devices: response.devices || [],
        selectedDeviceId: this.state.selectedDeviceId,
        error: "",
      });
    } catch (err) {
      this.setState({ error: err.message || String(err) });
    }
  }

  async learnCommand() {
    if (!this.state.selectedDeviceId) {
      this.setState({ error: "Select a device before learning" });
      return;
    }

    const name = prompt("Command name");
    if (!name || !name.trim()) {
      return;
    }

    const timeoutInput = prompt("Learn timeout in seconds", "15");
    const timeout = Number(timeoutInput || 15);

    try {
      this.setState({ error: "" });
      const response = await this.ws({
        type: "rf_command_manager/command/learn",
        device_id: this.state.selectedDeviceId,
        name: name.trim(),
        timeout: Number.isFinite(timeout) ? timeout : 15,
      });
      this.setState({ devices: response.devices || [], selectedDeviceId: this.state.selectedDeviceId });
    } catch (err) {
      this.setState({ error: err.message || String(err) });
    }
  }

  async sendCommand(commandId) {
    try {
      this.setState({ error: "" });
      await this.ws({ type: "rf_command_manager/command/send", command_id: commandId });
    } catch (err) {
      this.setState({ error: err.message || String(err) });
    }
  }

  async removeCommand(commandId) {
    if (!confirm("Remove this command?")) {
      return;
    }

    try {
      const response = await this.ws({
        type: "rf_command_manager/command/remove",
        command_id: commandId,
      });
      this.setState({
        devices: response.devices || [],
        selectedDeviceId: this.state.selectedDeviceId,
        error: "",
      });
    } catch (err) {
      this.setState({ error: err.message || String(err) });
    }
  }

  async renameCommand(command) {
    const name = prompt("New command name", command.name);
    if (!name || !name.trim()) {
      return;
    }

    try {
      const response = await this.ws({
        type: "rf_command_manager/command/update",
        command_id: command.id,
        name: name.trim(),
      });
      this.setState({
        devices: response.devices || [],
        selectedDeviceId: this.state.selectedDeviceId,
        error: "",
      });
    } catch (err) {
      this.setState({ error: err.message || String(err) });
    }
  }

  async moveCommand(command, offset) {
    const nextOrder = Math.max(0, command.order + offset);
    try {
      const response = await this.ws({
        type: "rf_command_manager/command/update",
        command_id: command.id,
        order: nextOrder,
      });
      this.setState({
        devices: response.devices || [],
        selectedDeviceId: this.state.selectedDeviceId,
        error: "",
      });
    } catch (err) {
      this.setState({ error: err.message || String(err) });
    }
  }

  async renameDevice(device) {
    const name = prompt("New device name", device.name);
    if (!name || !name.trim()) {
      return;
    }

    try {
      const response = await this.ws({
        type: "rf_command_manager/device/update",
        device_id: device.id,
        name: name.trim(),
      });
      this.setState({ devices: response.devices || [], selectedDeviceId: device.id, error: "" });
    } catch (err) {
      this.setState({ error: err.message || String(err) });
    }
  }

  async removeDevice(deviceId) {
    if (!confirm("Remove this device and all its commands?")) {
      return;
    }

    try {
      const response = await this.ws({
        type: "rf_command_manager/device/remove",
        device_id: deviceId,
      });
      const next = response.devices?.[0]?.id || "";
      this.setState({
        devices: response.devices || [],
        selectedDeviceId: next,
        error: "",
      });
    } catch (err) {
      this.setState({ error: err.message || String(err) });
    }
  }

  style() {
    return `
      :host {
        display: block;
        box-sizing: border-box;
        height: 100%;
        color: #f3f4f6;
        background:
          radial-gradient(circle at 15% 20%, rgba(56, 189, 248, 0.22), transparent 40%),
          radial-gradient(circle at 85% 10%, rgba(249, 115, 22, 0.2), transparent 45%),
          linear-gradient(160deg, #101827 0%, #0f172a 100%);
        font-family: "Aptos", "Segoe UI", sans-serif;
      }

      .layout {
        display: grid;
        grid-template-columns: 300px 1fr;
        gap: 16px;
        min-height: 100%;
        padding: 18px;
      }

      .panel {
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 16px;
        background: rgba(10, 20, 35, 0.66);
        backdrop-filter: blur(8px);
        box-shadow: 0 10px 28px rgba(2, 6, 23, 0.4);
      }

      .sidebar {
        padding: 16px;
        overflow: auto;
      }

      .main {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 16px;
      }

      h2 {
        margin: 0 0 8px;
        font-size: 1.15rem;
      }

      h3 {
        margin: 0 0 8px;
        font-size: 1rem;
      }

      .card {
        border: 1px solid rgba(96, 165, 250, 0.25);
        border-radius: 14px;
        background: rgba(15, 23, 42, 0.72);
        padding: 12px;
      }

      .stack {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .row {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .wrap {
        flex-wrap: wrap;
      }

      button,
      input,
      select,
      textarea {
        border: 1px solid rgba(100, 116, 139, 0.8);
        border-radius: 10px;
        padding: 8px 10px;
        font-size: 0.92rem;
        background: rgba(10, 14, 30, 0.9);
        color: #f8fafc;
      }

      button {
        cursor: pointer;
        border-color: rgba(56, 189, 248, 0.75);
        background: linear-gradient(135deg, #0ea5e9, #0284c7);
        color: #e0f2fe;
        font-weight: 600;
      }

      button.secondary {
        border-color: rgba(148, 163, 184, 0.7);
        background: rgba(30, 41, 59, 0.85);
        color: #e2e8f0;
      }

      button.warn {
        border-color: rgba(248, 113, 113, 0.8);
        background: rgba(127, 29, 29, 0.85);
      }

      .device-item {
        border: 1px solid rgba(148, 163, 184, 0.35);
        border-radius: 12px;
        padding: 10px;
        background: rgba(15, 23, 42, 0.5);
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .device-item.selected {
        border-color: rgba(56, 189, 248, 0.95);
        box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.3) inset;
      }

      .command-item {
        border: 1px solid rgba(148, 163, 184, 0.34);
        border-radius: 12px;
        padding: 10px;
        background: rgba(15, 23, 42, 0.4);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
      }

      .command-meta {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .error {
        color: #fecaca;
        background: rgba(127, 29, 29, 0.55);
        border: 1px solid rgba(248, 113, 113, 0.7);
        border-radius: 10px;
        padding: 8px 10px;
      }

      .muted {
        color: #cbd5e1;
        opacity: 0.85;
      }

      @media (max-width: 960px) {
        .layout {
          grid-template-columns: 1fr;
        }
      }
    `;
  }

  render() {
    const selected = this.selectedDevice;
    const commandItems = selected?.commands || [];

    this.shadowRoot.innerHTML = `
      <style>${this.style()}</style>
      <div class="layout">
        <section class="panel sidebar">
          <h2>Devices</h2>
          <form id="add-device-form" class="card stack" style="margin-bottom: 12px;">
            <input name="name" placeholder="Device name" required>
            <select name="connection_type">
              <option value="broadlink">Broadlink Direct</option>
              <option value="home_assistant_remote">HA Remote Entity</option>
            </select>
            <input name="host" placeholder="Host (direct mode)">
            <input name="mac" placeholder="MAC (direct mode)">
            <input name="remote_entity_id" placeholder="remote.entity_id (HA mode)">
            <button type="submit">Add Device</button>
          </form>

          <div class="stack">
            ${(this.state.devices || [])
              .map(
                (device) => `
              <div class="device-item ${device.id === this.state.selectedDeviceId ? "selected" : ""}">
                <div>
                  <strong>${this.escape(device.name)}</strong>
                  <div class="muted">${this.escape(device.connection_type)}</div>
                </div>
                <div class="row wrap">
                  <button class="secondary" data-action="select-device" data-device-id="${device.id}">Open</button>
                  <button class="secondary" data-action="rename-device" data-device-id="${device.id}">Rename</button>
                  <button class="warn" data-action="remove-device" data-device-id="${device.id}">Delete</button>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </section>

        <section class="panel main">
          <h2>Commands</h2>
          ${this.state.error ? `<div class="error">${this.escape(this.state.error)}</div>` : ""}

          ${
            this.state.loading
              ? '<div class="card muted">Loading library...</div>'
              : !selected
              ? '<div class="card muted">Add a device to start creating commands.</div>'
              : `
                <div class="card stack">
                  <h3>New Command for ${this.escape(selected.name)}</h3>
                  <form id="add-command-form" class="stack">
                    <input name="name" placeholder="Command name" required>
                    <input name="protocol" placeholder="Protocol (rf/ir)" value="rf">
                    <textarea name="payload" placeholder="Base64 payload" rows="3" required></textarea>
                    <input name="notes" placeholder="Optional notes">
                    <div class="row wrap">
                      <button type="submit">Save Command</button>
                      <button type="button" class="secondary" id="learn-command-btn">Learn Command</button>
                    </div>
                  </form>
                </div>

                <div class="stack">
                  ${(commandItems || [])
                    .map(
                      (command) => `
                    <div class="command-item">
                      <div class="command-meta">
                        <strong>${this.escape(command.name)}</strong>
                        <span class="muted">${this.escape(command.protocol)} • order ${command.order}</span>
                        ${command.notes ? `<span class="muted">${this.escape(command.notes)}</span>` : ""}
                      </div>
                      <div class="row wrap">
                        <button data-action="send-command" data-command-id="${command.id}">Send</button>
                        <button class="secondary" data-action="rename-command" data-command-id="${command.id}">Rename</button>
                        <button class="secondary" data-action="move-up" data-command-id="${command.id}">Up</button>
                        <button class="secondary" data-action="move-down" data-command-id="${command.id}">Down</button>
                        <button class="warn" data-action="remove-command" data-command-id="${command.id}">Delete</button>
                      </div>
                    </div>
                  `
                    )
                    .join("")}
                </div>
              `
          }
        </section>
      </div>
    `;

    const addDeviceForm = this.shadowRoot.getElementById("add-device-form");
    if (addDeviceForm) {
      addDeviceForm.addEventListener("submit", (event) => this.submitAddDevice(event));
    }

    const addCommandForm = this.shadowRoot.getElementById("add-command-form");
    if (addCommandForm) {
      addCommandForm.addEventListener("submit", (event) => this.submitAddCommand(event));
    }

    const learnButton = this.shadowRoot.getElementById("learn-command-btn");
    if (learnButton) {
      learnButton.addEventListener("click", () => this.learnCommand());
    }

    this.shadowRoot.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        const action = event.currentTarget.getAttribute("data-action");
        const deviceId = event.currentTarget.getAttribute("data-device-id");
        const commandId = event.currentTarget.getAttribute("data-command-id");

        if (action === "select-device") {
          this.setState({ selectedDeviceId: deviceId || "" });
          return;
        }

        if (action === "rename-device") {
          const device = this.state.devices.find((item) => item.id === deviceId);
          if (device) {
            await this.renameDevice(device);
          }
          return;
        }

        if (action === "remove-device" && deviceId) {
          await this.removeDevice(deviceId);
          return;
        }

        const device = this.selectedDevice;
        const command = device?.commands?.find((item) => item.id === commandId);
        if (!command) {
          return;
        }

        if (action === "send-command") {
          await this.sendCommand(command.id);
          return;
        }

        if (action === "rename-command") {
          await this.renameCommand(command);
          return;
        }

        if (action === "move-up") {
          await this.moveCommand(command, -1);
          return;
        }

        if (action === "move-down") {
          await this.moveCommand(command, 1);
          return;
        }

        if (action === "remove-command") {
          await this.removeCommand(command.id);
        }
      });
    });
  }

  escape(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }
}

customElements.define("rf-command-manager-panel", RFCommandManagerPanel);
