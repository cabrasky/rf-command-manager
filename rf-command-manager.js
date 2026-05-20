// ═══════════════════════════════════════════════════════════════════════
// RF Command Manager — Home Assistant Custom Panel
// ═══════════════════════════════════════════════════════════════════════

const REMOTE_ENTITY = 'remote.broadlink_rm4_pro';
const STORAGE_KEY = 'rf_manager_commands';
const BRIDGE_URL = '/local/rf-manager-bridge'; // placeholder; use standalone bridge or manual import
const BROADLINK_MAC = 'e87072ba795c';

// ══════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════
const eHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const eAttr = s => String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
const eId = s => String(s).replace(/[^a-zA-Z0-9_-]/g,'_');

// ══════════════════════════════════════════
// Local storage
// ══════════════════════════════════════════
function loadCmds() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } }
function saveCmds(c) { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); }

function layoutKey(dev) { return `rf_layout_${dev}`; }
function getLayout(dev, names) {
  try {
    const s = JSON.parse(localStorage.getItem(layoutKey(dev)) || '{}');
    if (Array.isArray(s)) return { order: s.filter(c => names.includes(c)), cols: 0, spans: {}, groups: {} };
    const spans = {};
    if (s.spans) for (const [k,v] of Object.entries(s.spans)) spans[k] = typeof v === 'number' ? { col: v, row: 1 } : v;
    return { order: (s.order || []).filter(c => names.includes(c)), cols: s.cols || 0, spans, groups: s.groups || {} };
  } catch { return { order: [], cols: 0, spans: {}, groups: {} }; }
}
function saveLayout(dev, l) { localStorage.setItem(layoutKey(dev), JSON.stringify(l)); }
function orderedNames(dev, names) {
  const l = getLayout(dev, names);
  if (l.order.length === names.length) return l.order;
  const saved = new Set(l.order);
  return [...l.order.filter(c => saved.has(c) && names.includes(c)), ...names.filter(c => !saved.has(c)).sort()];
}
function cmdSpan(dev, cmd) {
  const cmds = loadCmds();
  const l = getLayout(dev, Object.keys(cmds[dev] || {}));
  return l.spans[cmd] || { col: 1, row: 1 };
}
function devCols(dev) {
  const cmds = loadCmds();
  return getLayout(dev, Object.keys(cmds[dev] || {})).cols || 0;
}

// ══════════════════════════════════════════
// Button helpers
// ══════════════════════════════════════════
function btnClass(name) {
  const n = name.toLowerCase();
  if (/off\b|apag|power|stop/.test(n)) return 'power';
  if (/speed|veloc|nivel|level|\d/.test(n)) return 'speed';
  if (/light|luz|warm|neutral|blue|azul|calid|frio|cool|blanco|white|color|on|bright|dim/.test(n)) return 'light-cmd';
  return '';
}
function btnIcon(name) {
  const n = name.toLowerCase();
  if (/off\b|apag/.test(n)) return '⏻';
  if (/on\b/.test(n)) return '💡';
  if (/speed\s*1|veloc\s*1|nivel\s*1/.test(n)) return '🐢';
  if (/speed|veloc|nivel/.test(n)) return '🌀';
  if (/bright/.test(n)) return '🔆';
  if (/dim/.test(n)) return '🔅';
  if (/warm|calid/.test(n)) return '🔶';
  if (/neutral/.test(n)) return '⚪';
  if (/blue|azul/.test(n)) return '🔵';
  if (/cool|frio/.test(n)) return '🔹';
  return '📶';
}

// ══════════════════════════════════════════
// Toast
// ══════════════════════════════════════════
function toast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, 3000);
}

// ══════════════════════════════════════════
// Layout editing state
// ══════════════════════════════════════════
const layoutEditing = {};
const groupSelect = {};

function isLayoutMode(dev) { return !!layoutEditing[dev]; }
function toggleLayoutMode(dev) {
  layoutEditing[dev] = !layoutEditing[dev];
  RFManagerPanel.instance.render();
  if (layoutEditing[dev]) toast('✋ Click to select · Drag to reorder · ↔↕ to resize · 📁 to group', 'info');
}

// ══════════════════════════════════════════
// Service calls (via hass)
// ══════════════════════════════════════════
function callService(domain, service, data) {
  const hass = RFManagerPanel.instance?.hass;
  if (hass) hass.callService(domain, service, data);
}

function quickSend(dev, cmd) {
  callService('remote', 'send_command', {
    entity_id: REMOTE_ENTITY, device: dev, command: cmd, num_repeats: 1
  });
  const btn = document.getElementById(`rbtn-${eId(dev)}-${eId(cmd)}`);
  if (btn) { btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 450); }
  toast(`Sent "${cmd}"`, 'success');
}

function doDelete(dev, cmd) {
  if (!confirm(`Delete "${cmd}" from "${dev}"?`)) return;
  callService('remote', 'delete_command', { entity_id: REMOTE_ENTITY, device: dev, command: cmd });
  const cmds = loadCmds();
  if (cmds[dev]) { delete cmds[dev][cmd]; if (!Object.keys(cmds[dev]).length) delete cmds[dev]; }
  saveCmds(cmds);
  RFManagerPanel.instance.render();
  toast(`Deleted "${cmd}"`, 'info');
}

function renameCmd(dev, old) {
  const n = prompt(`Rename "${old}" in "${dev}":`, old);
  if (!n || n === old) return;
  const cmds = loadCmds();
  if (!cmds[dev]?.[old] || cmds[dev][n]) return toast(cmds[dev][n] ? `"${n}" exists` : 'Not found', 'error');
  cmds[dev][n] = cmds[dev][old]; delete cmds[dev][old];
  saveCmds(cmds);
  RFManagerPanel.instance.render();
  toast(`Renamed → "${n}"`, 'success');
}

function renameDev(old) {
  const n = prompt(`Rename device "${old}":`, old);
  if (!n || n === old) return;
  const cmds = loadCmds();
  if (!cmds[old] || cmds[n]) return toast(cmds[n] ? `"${n}" exists` : 'Not found', 'error');
  cmds[n] = cmds[old]; delete cmds[old];
  saveCmds(cmds);
  RFManagerPanel.instance.render();
  toast(`Device → "${n}"`, 'success');
}

// ══════════════════════════════════════════
// Span & groups
// ══════════════════════════════════════════
function setSpan(dev, cmd, c, r) {
  const cmds = loadCmds();
  const l = getLayout(dev, Object.keys(cmds[dev] || {}));
  const col = Math.max(1, Math.min(4, c || 1));
  const row = Math.max(1, Math.min(4, r || 1));
  if (col === 1 && row === 1) delete l.spans[cmd];
  else l.spans[cmd] = { col, row };
  saveLayout(dev, l);
  RFManagerPanel.instance.render();
}

function setCols(dev, cols) {
  const cmds = loadCmds();
  const l = getLayout(dev, Object.keys(cmds[dev] || {}));
  l.cols = cols;
  saveLayout(dev, l);
  RFManagerPanel.instance.render();
}

function toggleSelect(dev, cmd) {
  if (!groupSelect[dev]) groupSelect[dev] = new Set();
  if (groupSelect[dev].has(cmd)) groupSelect[dev].delete(cmd);
  else groupSelect[dev].add(cmd);
  RFManagerPanel.instance.render();
}

function createGroup(dev) {
  const sel = groupSelect[dev];
  if (!sel || sel.size < 2) return toast('Select at least 2 buttons', 'error');
  const name = prompt('Group name:', 'New Group');
  if (!name) return;
  const cmds = loadCmds();
  const l = getLayout(dev, Object.keys(cmds[dev] || {}));
  if (!l.groups) l.groups = {};
  l.groups[name] = [...sel];
  saveLayout(dev, l);
  groupSelect[dev] = new Set();
  RFManagerPanel.instance.render();
  toast(`Created group "${name}"`, 'success');
}

function ungroup(dev, gName) {
  const cmds = loadCmds();
  const l = getLayout(dev, Object.keys(cmds[dev] || {}));
  if (l.groups) delete l.groups[gName];
  saveLayout(dev, l);
  RFManagerPanel.instance.render();
}

function saveLayoutNow(dev) {
  const cmds = loadCmds();
  const names = Object.keys(cmds[dev] || {});
  const grid = document.getElementById(`layout-${eId(dev)}`);
  if (!grid) return;
  const order = [...grid.querySelectorAll('.remote-btn .btn-label')].map(l => l.textContent);
  if (order.length === names.length) {
    const l = getLayout(dev, names);
    l.order = order;
    saveLayout(dev, l);
    layoutEditing[dev] = false;
    RFManagerPanel.instance.render();
    toast('✅ Layout saved!', 'success');
  }
}

// ══════════════════════════════════════════
// Drag & drop
// ══════════════════════════════════════════
function dragStart(e, dev, cmd) {
  if (!isLayoutMode(dev)) { e.preventDefault(); return; }
  e.dataTransfer.setData('text/plain', JSON.stringify({ device: dev, command: cmd }));
  e.dataTransfer.effectAllowed = 'move';
  e.target.classList.add('dragging');
  setTimeout(() => e.target?.classList.remove('dragging'), 0);
}
function dragOver(e, dev) {
  if (!isLayoutMode(dev)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.target.closest('.remote-btn')?.classList.add('drag-over');
}
function dragLeave(e) { e.target.closest('.remote-btn')?.classList.remove('drag-over'); }
function drop(e, dev, targetCmd) {
  e.preventDefault();
  e.target.closest('.remote-btn')?.classList.remove('drag-over');
  const d = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
  if (d.device !== dev || d.command === targetCmd) return;
  const cmds = loadCmds();
  const names = Object.keys(cmds[dev] || {});
  const ord = orderedNames(dev, names);
  const si = ord.indexOf(d.command), di = ord.indexOf(targetCmd);
  if (si < 0 || di < 0) return;
  ord.splice(si, 1); ord.splice(di, 0, d.command);
  const l = getLayout(dev, names); l.order = ord;
  saveLayout(dev, l);
  RFManagerPanel.instance.render();
}

// ══════════════════════════════════════════
// Learn
// ══════════════════════════════════════════
let pendingLearn = null;
function openLearn() {
  document.getElementById('learnModal').classList.remove('hidden');
  document.getElementById('learnDevice').focus();
}
function closeLearn() {
  document.getElementById('learnModal').classList.add('hidden');
  const btn = document.getElementById('learnBtn');
  btn.textContent = '🎓 Start Learning'; btn.disabled = false; btn.classList.remove('loading');
  pendingLearn = null;
}
function startLearn() {
  const dev = document.getElementById('learnDevice').value.trim();
  const cmd = document.getElementById('learnCommand').value.trim();
  const type = document.querySelector('input[name="cmdType"]:checked')?.value || 'rf';
  const timeout = parseInt(document.getElementById('learnTimeout').value) || 15;
  if (!dev || !cmd) return toast('Fill device and command name', 'error');

  callService('remote', 'learn_command', {
    entity_id: REMOTE_ENTITY, device: dev, command: cmd, command_type: type, timeout
  });

  // Save immediately
  const cmds = loadCmds();
  if (!cmds[dev]) cmds[dev] = {};
  cmds[dev][cmd] = { type, learnedAt: new Date().toISOString() };
  saveCmds(cmds);
  RFManagerPanel.instance.render();

  const btn = document.getElementById('learnBtn');
  btn.textContent = '⏳ Learning... (press button)';
  btn.disabled = true; btn.classList.add('loading');
  toast(`Learning "${cmd}" for "${dev}" — press RF button now!`, 'info');
  setTimeout(() => { closeLearn(); }, 2500);
}

// ══════════════════════════════════════════
// Send / Import
// ══════════════════════════════════════════
function openSend(dev, cmd) {
  document.getElementById('sendModal').classList.remove('hidden');
  document.getElementById('sendCmdName').textContent = cmd;
  document.getElementById('sendCmdName').dataset.command = cmd;
  document.getElementById('sendDeviceName').textContent = dev;
  document.getElementById('sendDeviceName').dataset.device = dev;
  document.getElementById('sendRepeats').value = 1;
}
function closeSend() { document.getElementById('sendModal').classList.add('hidden'); }
function sendWithRepeats() {
  const dev = document.getElementById('sendDeviceName').dataset.device;
  const cmd = document.getElementById('sendCmdName').dataset.command;
  const n = parseInt(document.getElementById('sendRepeats').value) || 1;
  callService('remote', 'send_command', { entity_id: REMOTE_ENTITY, device: dev, command: cmd, num_repeats: n });
  toast(`Sent "${cmd}" ×${n}`, 'success'); closeSend();
}

function exportCmds() {
  const cmds = loadCmds();
  const blob = new Blob([JSON.stringify(cmds, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `rf-commands-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
  toast('Exported!', 'success');
}
function importCmds(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      const existing = loadCmds();
      for (const [d, c] of Object.entries(imported)) {
        if (!existing[d]) existing[d] = {};
        Object.assign(existing[d], c);
      }
      saveCmds(existing);
      RFManagerPanel.instance.render();
      toast(`Imported ${Object.keys(imported).length} device(s)`, 'success');
    } catch { toast('Invalid JSON', 'error'); }
  };
  reader.readAsText(file); input.value = '';
}
function openPull() { document.getElementById('pullModal').classList.remove('hidden'); }
function closePull() { document.getElementById('pullModal').classList.add('hidden'); document.getElementById('pullTextarea').value = ''; }
function parsePull() {
  const raw = document.getElementById('pullTextarea').value.trim();
  if (!raw) return toast('Paste storage file contents first', 'error');
  try {
    const data = JSON.parse(raw);
    const src = data.data || data;
    const cmds = loadCmds();
    let n = 0;
    for (const [dev, cmds2] of Object.entries(src)) {
      if (typeof cmds2 !== 'object') continue;
      if (!cmds[dev]) cmds[dev] = {};
      for (const [cn, code] of Object.entries(cmds2)) {
        if (!cmds[dev][cn]) { cmds[dev][cn] = { type: 'rf', learnedAt: null }; n++; }
      }
    }
    saveCmds(cmds);
    RFManagerPanel.instance.render();
    closePull();
    toast(`Imported ${n} command(s)`, 'success');
  } catch { toast('Invalid JSON', 'error'); }
}

// ══════════════════════════════════════════
// Render
// ══════════════════════════════════════════
function renderBtn(dev, name, cmd, layoutOn, sel) {
  const cls = btnClass(name);
  const icon = btnIcon(name);
  const span = cmdSpan(dev, name);
  const selClass = sel ? ' selected' : '';
  const spanStyle = `grid-column:span ${span.col};grid-row:span ${span.row};`;
  return `<div class="remote-btn ${cls}${layoutOn ? ' draggable' : ''}${selClass}"
    id="rbtn-${eId(dev)}-${eId(name)}" style="${spanStyle}"
    draggable="${layoutOn}"
    ondragstart="RFManagerPanel.instance.dragStart(event,'${eAttr(dev)}','${eAttr(name)}')"
    ondragover="RFManagerPanel.instance.dragOver(event,'${eAttr(dev)}')"
    ondragleave="RFManagerPanel.instance.dragLeave(event)"
    ondrop="RFManagerPanel.instance.drop(event,'${eAttr(dev)}','${eAttr(name)}')"
    onclick="${layoutOn ? `RFManagerPanel.instance.toggleSelect('${eAttr(dev)}','${eAttr(name)}')` : `RFManagerPanel.instance.quickSend('${eAttr(dev)}','${eAttr(name)}')`}"
    oncontextmenu="${layoutOn ? '' : `event.preventDefault();RFManagerPanel.instance.openSend('${eAttr(dev)}','${eAttr(name)}');return false`}"
    title="${layoutOn ? (sel ? 'Selected' : 'Click to select') : 'Tap to send'}">
    ${layoutOn ? '<span class="drag-handle">⠿</span>' : ''}
    ${layoutOn ? `<div class="span-controls">
      <button onclick="event.stopPropagation();RFManagerPanel.instance.setSpan('${eAttr(dev)}','${eAttr(name)}',${span.col-1},${span.row})" title="Narrower">↔−</button>
      <span>${span.col}×${span.row}</span>
      <button onclick="event.stopPropagation();RFManagerPanel.instance.setSpan('${eAttr(dev)}','${eAttr(name)}',${span.col+1},${span.row})" title="Wider">↔+</button>
      <button onclick="event.stopPropagation();RFManagerPanel.instance.setSpan('${eAttr(dev)}','${eAttr(name)}',${span.col},${span.row-1})" title="Shorter">↕−</button>
      <button onclick="event.stopPropagation();RFManagerPanel.instance.setSpan('${eAttr(dev)}','${eAttr(name)}',${span.col},${span.row+1})" title="Taller">↕+</button>
    </div>` : ''}
    ${sel ? '<div class="sel-check">✓</div>' : ''}
    <div class="btn-actions" style="${layoutOn ? 'opacity:0.7' : ''}">
      <button onclick="event.stopPropagation();RFManagerPanel.instance.renameCmd('${eAttr(dev)}','${eAttr(name)}')" title="Rename">✏️</button>
      <button onclick="event.stopPropagation();RFManagerPanel.instance.doDelete('${eAttr(dev)}','${eAttr(name)}')" title="Delete">🗑</button>
    </div>
    <span class="btn-icon">${icon}</span>
    <span class="btn-label">${eHtml(name)}</span>
  </div>`;
}

function render() {
  const cmds = loadCmds();
  const container = document.getElementById('commandsList');
  const devices = Object.keys(cmds).sort();

  if (!devices.length) {
    container.innerHTML = `<div class="empty-state"><div class="icon">📭</div>
      <p>No commands registered yet</p>
      <p style="font-size:0.8rem">Click "+ Learn" to register RF/IR buttons</p></div>`;
    const sc = document.getElementById('sbCount'); if (sc) sc.textContent = '0';
    return;
  }

  let total = 0, html = '';
  for (const dev of devices) {
    const commands = cmds[dev];
    const names = Object.keys(commands).sort();
    const ordered = orderedNames(dev, names);
    const layoutOn = isLayoutMode(dev);
    const cols = devCols(dev);
    const layout = getLayout(dev, names);
    const groups = layout.groups || {};
    const sel = groupSelect[dev] || new Set();
    total += names.length;

    const gridStyle = cols > 0 ? `grid-template-columns:repeat(${cols},1fr);` : '';

    // Separate grouped vs ungrouped
    const grouped = new Map(), ungrouped = [];
    for (const n of ordered) {
      let found = false;
      for (const [gn, gcmds] of Object.entries(groups)) {
        if (gcmds.includes(n)) { if (!grouped.has(gn)) grouped.set(gn, []); grouped.get(gn).push(n); found = true; break; }
      }
      if (!found) ungrouped.push(n);
    }

    html += `<div class="device-group">
      <div class="device-header">
        <h3 onclick="this.closest('.device-group').querySelector('.device-commands').style.display=this.closest('.device-group').querySelector('.device-commands').style.display==='none'?'':'none';this.parentElement.querySelector('.toggle-arrow').textContent=this.closest('.device-group').querySelector('.device-commands').style.display==='none'?'▶':'▼'">📟 ${eHtml(dev)} <span class="badge">${names.length}</span></h3>
        <div style="display:flex;gap:4px;align-items:center">
          ${layoutOn ? `<select onchange="RFManagerPanel.instance.setCols('${eAttr(dev)}',+this.value)" style="background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:4px 8px;font-size:0.75rem;cursor:pointer" onclick="event.stopPropagation()">
            <option value="0" ${cols===0?'selected':''}>auto</option>
            <option value="2" ${cols===2?'selected':''}>2 col</option><option value="3" ${cols===3?'selected':''}>3 col</option>
            <option value="4" ${cols===4?'selected':''}>4 col</option><option value="5" ${cols===5?'selected':''}>5 col</option>
          </select>` : ''}
          ${layoutOn ? `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();RFManagerPanel.instance.createGroup('${eAttr(dev)}')">📁 Group</button>` : ''}
          <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();RFManagerPanel.instance.toggleLayoutMode('${eAttr(dev)}')">${layoutOn ? '🔒 Done' : '✋ Layout'}</button>
          <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();RFManagerPanel.instance.renameDev('${eAttr(dev)}')" title="Rename">✏️</button>
        </div>
        <span class="toggle-arrow" style="color:var(--text2);font-size:0.8rem;cursor:pointer;user-select:none">▼</span>
      </div>
      <div class="device-commands${layoutOn ? ' layout-mode' : ''}" id="layout-${eId(dev)}" style="${gridStyle}">`;

    const renderB = n => { const c = commands[n]; return c ? renderBtn(dev, n, c, layoutOn, sel.has(n)) : ''; };

    for (const [gn, gcmds] of grouped) {
      html += `<div class="cmd-group" style="grid-column:1/-1">
        <div class="cmd-group-header"><span>📁 ${eHtml(gn)}</span>
        ${layoutOn ? `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();RFManagerPanel.instance.ungroup('${eAttr(dev)}','${eAttr(gn)}')">✕ Ungroup</button>` : ''}
        </div><div class="cmd-group-grid">${gcmds.map(renderB).join('')}</div></div>`;
    }
    html += ungrouped.map(renderB).join('');

    if (layoutOn) {
      html += `</div><div style="padding:8px 16px 16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn btn-primary btn-sm" onclick="RFManagerPanel.instance.saveLayoutNow('${eAttr(dev)}')">💾 Save Layout</button>
        <button class="btn btn-outline btn-sm" onclick="RFManagerPanel.instance.toggleLayoutMode('${eAttr(dev)}')">Cancel</button>
        <span style="font-size:0.68rem;color:var(--text2)">Click to select · Drag to reorder · ↔↕ to resize · 📁 to group</span></div>`;
    }
    html += `</div></div>`;
  }

  container.innerHTML = html;
  const sc = document.getElementById('sbCount'); if (sc) sc.textContent = total;
  const dl = document.getElementById('deviceList'); if (dl) dl.innerHTML = devices.map(d => `<option value="${eHtml(d)}">`).join('');
}

// ══════════════════════════════════════════
// Panel template
// ══════════════════════════════════════════
const TEMPLATE = `<header><div class="status-dot connected" id="statusDot"></div><h1>🧌 RF Command Manager — Broadlink RM4 Pro</h1></header>
<div class="status-bar" id="statusBar">
  <span>Device: <strong id="sbDevice">broadlink_rm4_pro</strong></span>
  <span>MAC: <strong>e8:70:72:ba:79:5c</strong></span>
  <span>Commands: <strong id="sbCount">0</strong></span>
</div>
<main id="app">
  <div class="section">
    <div class="section-header"><h2>📡 Learn New Command</h2><button class="btn btn-primary" id="learnBtnTop">+ Learn</button></div>
    <p class="help-text">Press the button on your RF remote while the Broadlink is in learning mode.</p>
  </div>
  <div class="section">
    <div class="section-header"><h2>📋 Registered Commands</h2>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" id="syncBtn">📥 Pull from HA</button>
        <button class="btn btn-outline btn-sm" id="refreshBtn">🔄 Refresh</button>
        <button class="btn btn-outline btn-sm" id="exportBtn">💾 Export</button>
        <label class="btn btn-outline btn-sm" style="cursor:pointer">📤 Import <input type="file" accept=".json" id="importFile" style="display:none"></label>
        <button class="btn btn-outline btn-sm" id="manualPullBtn">📋 Manual Import</button>
      </div>
    </div>
    <div id="commandsList"><div class="empty-state"><div class="icon">📭</div><p>No commands registered yet</p></div></div>
  </div>
</main>
<div class="modal-overlay hidden" id="learnModal">
  <div class="modal"><h2>🎓 Learn New Command</h2>
    <div class="form-group"><label>Device Name</label><input type="text" id="learnDevice" placeholder="e.g., Garage Door, LED Strip" list="deviceList" autocomplete="off"><datalist id="deviceList"></datalist></div>
    <div class="form-group"><label>Command Name</label><input type="text" id="learnCommand" placeholder="e.g., Open, Power On" autocomplete="off"></div>
    <div class="form-group"><label>Command Type</label><div class="radio-group"><label><input type="radio" name="cmdType" value="rf" checked> RF (433MHz)</label><label><input type="radio" name="cmdType" value="ir"> IR (Infrared)</label></div></div>
    <div class="form-group"><label>Learning Timeout (seconds)</label><input type="number" id="learnTimeout" value="15" min="5" max="60"></div>
    <p class="help-text" style="margin-bottom:6px">After clicking "Start Learning", press and hold the button on your remote near the Broadlink.</p>
    <div class="modal-actions"><button class="btn btn-outline" id="learnCancel">Cancel</button><button class="btn btn-primary" id="learnBtn">🎓 Start Learning</button></div>
  </div>
</div>
<div class="modal-overlay hidden" id="sendModal">
  <div class="modal"><h2>🚀 Send Command</h2>
    <p style="margin-bottom:16px;color:var(--text2)">Sending <strong id="sendCmdName" style="color:var(--text)"></strong> to <strong id="sendDeviceName" style="color:var(--text)"></strong></p>
    <div class="form-group"><label>Repeats</label><input type="number" id="sendRepeats" value="1" min="1" max="10"></div>
    <div class="modal-actions"><button class="btn btn-outline" id="sendCancel">Cancel</button><button class="btn btn-success" id="sendOk">🚀 Send</button></div>
  </div>
</div>
<div class="modal-overlay hidden" id="pullModal">
  <div class="modal"><h2>📥 Pull Commands from HA Storage</h2>
    <p class="help-text" style="margin-bottom:12px">Broadlink learned commands are stored in the HA container filesystem. Extract the file manually.</p>
    <div class="form-group"><label>Storage file path</label><code style="display:block;word-break:break-all;padding:8px 12px">/config/.storage/broadlink_remote_e87072ba795c_codes</code></div>
    <div class="form-group"><label>Paste the JSON contents here</label><textarea id="pullTextarea" placeholder='Paste the contents of broadlink_remote_e87072ba795c_codes here...'></textarea></div>
    <div class="modal-actions"><button class="btn btn-outline" id="pullCancel">Cancel</button><button class="btn btn-primary" id="pullImport">📥 Import</button></div>
  </div>
</div>
<div id="toast-container"></div>`;

// ══════════════════════════════════════════
// Custom Panel Class
// ══════════════════════════════════════════
class RFManagerPanel extends HTMLElement {
  static instance = null;

  constructor() {
    super();
    RFManagerPanel.instance = this;
  }

  set hass(hass) {
        if (!this._rendered) {
      // Inject styles
      const style = document.createElement('style');
      style.textContent = ':root {\n  --bg: #0b0b12;\n  --surface: #151520;\n  --surface2: #1e1e2e;\n  --border: #282840;\n  --text: #e2e2f0;\n  --text2: #8484a8;\n  --accent: #6c5ce7;\n  --accent2: #a78bfa;\n  --green: #00d2a0;\n  --red: #ff6b6b;\n  --orange: #ff9f43;\n  --radius: 10px;\n  --radius-sm: 6px;\n  --shadow: 0 2px 8px rgba(0,0,0,0.3);\n}\n*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }\nbody {\n  font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;\n  background: var(--bg);\n  color: var(--text);\n  min-height: 100vh;\n  line-height: 1.5;\n  -webkit-tap-highlight-color: transparent;\n}\n\n/* ─── Header ─── */\nheader {\n  background: var(--surface);\n  border-bottom: 1px solid var(--border);\n  padding: 10px 16px;\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  position: sticky;\n  top: 0;\n  z-index: 10;\n  backdrop-filter: blur(10px);\n}\nheader h1 { font-size: 1rem; font-weight: 600; letter-spacing: -0.3px; }\n.status-dot {\n  width: 12px; height: 12px;\n  border-radius: 50%;\n  background: var(--red);\n  flex-shrink: 0;\n  transition: all 0.3s;\n}\n.status-dot.connected { background: var(--green); box-shadow: 0 0 8px var(--green); }\n\n/* ─── Status bar ─── */\n.status-bar {\n  background: var(--surface2);\n  border-bottom: 1px solid var(--border);\n  padding: 8px 16px;\n  display: flex;\n  gap: 16px;\n  align-items: center;\n  flex-wrap: wrap;\n  font-size: 0.78rem;\n  color: var(--text2);\n}\n.status-bar strong { color: var(--text); }\n\n/* ─── Connection bar ─── */\n.connection-bar {\n  background: var(--surface2);\n  border-bottom: 1px solid var(--border);\n  padding: 12px 16px;\n  display: flex;\n  gap: 10px;\n  align-items: center;\n  flex-wrap: wrap;\n}\n.connection-bar input {\n  background: var(--bg);\n  border: 1px solid var(--border);\n  color: var(--text);\n  padding: 10px 12px;\n  border-radius: var(--radius-sm);\n  font-size: 0.85rem;\n  flex: 1;\n  min-width: 180px;\n  font-family: monospace;\n}\n.connection-bar input::placeholder { color: var(--text2); }\n\n/* ─── Buttons ─── */\n.btn {\n  padding: 10px 16px;\n  border: none;\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  font-size: 0.85rem;\n  font-weight: 500;\n  transition: all 0.2s;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 6px;\n  white-space: nowrap;\n  min-height: 44px;\n  min-width: 44px;\n  user-select: none;\n}\n.btn:active { transform: scale(0.97); }\n.btn-primary { background: var(--accent); color: #fff; }\n.btn-primary:hover { background: var(--accent2); }\n.btn-success { background: #0d7d5e; color: #fff; }\n.btn-success:hover { background: var(--green); }\n.btn-danger { background: #5c1a1a; color: #fff; }\n.btn-danger:hover { background: var(--red); }\n.btn-outline {\n  background: transparent;\n  border: 1px solid var(--border);\n  color: var(--text);\n}\n.btn-outline:hover { background: var(--surface2); }\n.btn-sm { padding: 6px 12px; font-size: 0.78rem; min-height: 36px; }\n.btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }\n.btn.loading { pointer-events: none; }\n\n/* ─── Layout ─── */\nmain { padding: 16px; max-width: 960px; margin: 0 auto; }\n\n/* ─── Sections ─── */\n.section {\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius);\n  padding: 16px;\n  margin-bottom: 14px;\n}\n.section-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 12px;\n  flex-wrap: wrap;\n  gap: 8px;\n}\n.section-header h2 {\n  font-size: 0.95rem;\n  font-weight: 600;\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n/* ─── Remote Control Layout ─── */\n.device-group {\n  background: var(--surface);\n  border: 2px solid var(--border);\n  border-radius: 20px;\n  margin-bottom: 20px;\n  overflow: hidden;\n  box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03);\n}\n.device-header {\n  padding: 14px 20px;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  gap: 8px;\n  background: var(--surface2);\n  border-bottom: 1px solid var(--border);\n}\n.device-header h3 {\n  font-size: 0.95rem;\n  font-weight: 600;\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  cursor: pointer;\n  flex: 1;\n  user-select: none;\n}\n.device-header .badge {\n  background: var(--accent);\n  color: #fff;\n  font-size: 0.65rem;\n  padding: 2px 8px;\n  border-radius: 10px;\n  font-weight: 600;\n}\n\n/* ─── Remote button grid ─── */\n.device-commands {\n  padding: 16px;\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));\n  gap: 10px;\n  transition: background 0.2s;\n}\n.device-commands.layout-mode {\n  background: rgba(108,92,231,0.04);\n  border: 2px dashed rgba(108,92,231,0.2);\n  border-radius: 12px;\n  margin: 4px 12px 12px;\n  padding: 12px;\n}\n\n.remote-btn {\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  min-height: 72px;\n  padding: 12px 8px;\n  border-radius: 14px;\n  cursor: pointer;\n  user-select: none;\n  transition: all 0.15s ease;\n  border: 1px solid var(--border);\n  background: var(--surface2);\n  text-align: center;\n  gap: 4px;\n  overflow: hidden;\n}\n.remote-btn.dragging {\n  opacity: 0.4;\n  transform: scale(0.95);\n}\n.remote-btn.drag-over {\n  border-color: var(--accent2);\n  box-shadow: 0 0 16px rgba(108,92,231,0.25);\n  background: rgba(108,92,231,0.08);\n}\n.remote-btn.draggable {\n  cursor: grab;\n}\n.remote-btn.draggable:active {\n  cursor: grabbing;\n}\n.remote-btn .drag-handle {\n  position: absolute;\n  top: 4px;\n  left: 4px;\n  font-size: 0.7rem;\n  color: var(--text2);\n  opacity: 0;\n  transition: opacity 0.2s;\n  cursor: grab;\n  padding: 2px 4px;\n  border-radius: 4px;\n  line-height: 1;\n}\n.remote-btn.draggable .drag-handle { opacity: 0.8; }\n.remote-btn:active .drag-handle { cursor: grabbing; }\n\n/* Span controls in layout mode */\n.remote-btn .span-controls {\n  position: absolute;\n  bottom: 4px;\n  left: 4px;\n  display: flex;\n  align-items: center;\n  gap: 2px;\n  opacity: 0;\n  transition: opacity 0.2s;\n  background: var(--bg);\n  border-radius: 6px;\n  padding: 1px 2px;\n  border: 1px solid var(--border);\n}\n.remote-btn.draggable .span-controls { opacity: 0.85; }\n.span-controls button {\n  width: 22px;\n  height: 22px;\n  padding: 0;\n  border: none;\n  background: transparent;\n  color: var(--accent2);\n  cursor: pointer;\n  border-radius: 4px;\n  font-size: 0.8rem;\n  font-weight: 700;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n.span-controls button:hover { background: var(--surface2); color: #fff; }\n.span-controls span {\n  font-size: 0.6rem;\n  color: var(--text2);\n  font-weight: 600;\n  min-width: 20px;\n  text-align: center;\n}\n\n/* Selection checkmark */\n.remote-btn .sel-check {\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%,-50%);\n  font-size: 1.4rem;\n  color: var(--accent2);\n  opacity: 0;\n  pointer-events: none;\n  text-shadow: 0 0 8px rgba(108,92,231,0.5);\n  transition: opacity 0.15s;\n}\n.remote-btn.selected .sel-check { opacity: 1; }\n.remote-btn.selected { border-color: var(--accent2); box-shadow: 0 0 12px rgba(108,92,231,0.2); }\n\n/* Command groups */\n.cmd-group {\n  border: 2px dashed var(--border);\n  border-radius: 12px;\n  padding: 8px;\n  background: rgba(108,92,231,0.03);\n}\n.cmd-group-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 4px 8px 8px;\n  font-size: 0.78rem;\n  font-weight: 500;\n  color: var(--text2);\n  gap: 8px;\n}\n.cmd-group-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));\n  gap: 8px;\n}\n.remote-btn:active {\n  transform: scale(0.94);\n  background: var(--accent);\n  border-color: var(--accent2);\n  box-shadow: 0 0 20px rgba(108,92,231,0.3);\n}\n.remote-btn.flash {\n  animation: btnBurst 0.45s ease;\n}\n.remote-btn .btn-icon {\n  font-size: 1.4rem;\n  line-height: 1;\n  transition: transform 0.15s;\n}\n.remote-btn:active .btn-icon { transform: scale(1.15); }\n.remote-btn .btn-label {\n  font-size: 0.72rem;\n  font-weight: 500;\n  color: var(--text);\n  line-height: 1.2;\n  word-break: break-word;\n}\n\n/* Power-style button (commands with OFF/ON) */\n.remote-btn.power {\n  background: #3d1515;\n  border-color: #5c2020;\n}\n.remote-btn.power:active {\n  background: var(--red);\n  border-color: #ff8888;\n  box-shadow: 0 0 20px rgba(255,107,107,0.4);\n}\n.remote-btn.power .btn-label { color: #ff9999; }\n\n/* Speed-style button */\n.remote-btn.speed {\n  background: #1a2a1a;\n  border-color: #2a402a;\n}\n.remote-btn.speed:active {\n  background: var(--green);\n  border-color: #44ffaa;\n  box-shadow: 0 0 20px rgba(0,210,160,0.3);\n}\n.remote-btn.speed .btn-label { color: #88ddaa; }\n\n/* Light-style button */\n.remote-btn.light-cmd {\n  background: #1a1a2e;\n  border-color: #2a2a4a;\n}\n.remote-btn.light-cmd:active {\n  background: var(--accent);\n  border-color: var(--accent2);\n  box-shadow: 0 0 20px rgba(108,92,231,0.4);\n}\n\n/* Action buttons on remote (edit/delete) */\n.remote-btn .btn-actions {\n  position: absolute;\n  top: 4px;\n  right: 4px;\n  display: flex;\n  gap: 2px;\n  opacity: 0;\n  transition: opacity 0.2s;\n}\n.remote-btn:hover .btn-actions,\n.remote-btn:focus-within .btn-actions { opacity: 1; }\n.remote-btn .btn-actions button {\n  width: 24px;\n  height: 24px;\n  padding: 0;\n  border-radius: 6px;\n  font-size: 0.6rem;\n  border: 1px solid var(--border);\n  background: var(--bg);\n  color: var(--text2);\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n.remote-btn .btn-actions button:hover { color: var(--text); background: var(--surface2); }\n\n/* ─── Remote button repeat indicator ─── */\n.repeat-badge {\n  position: absolute;\n  bottom: 4px;\n  right: 4px;\n  font-size: 0.55rem;\n  color: var(--text2);\n  opacity: 0;\n  transition: opacity 0.3s;\n}\n.remote-btn:hover .repeat-badge { opacity: 1; }\n\n@keyframes btnBurst {\n  0% { box-shadow: 0 0 0 0 rgba(0,210,160,0.6); }\n  50% { box-shadow: 0 0 30px 8px rgba(0,210,160,0.3); }\n  100% { box-shadow: 0 0 0 0 rgba(0,210,160,0); }\n}\n\n/* ─── Modals ─── */\n.modal-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0,0,0,0.75);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 100;\n  backdrop-filter: blur(2px);\n  animation: fadeIn 0.15s ease;\n}\n.modal {\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius);\n  padding: 20px;\n  width: 92%;\n  max-width: 460px;\n  max-height: 90vh;\n  overflow-y: auto;\n  box-shadow: 0 20px 60px rgba(0,0,0,0.6);\n  animation: slideUp 0.2s ease;\n}\n.modal h2 { font-size: 1.05rem; margin-bottom: 16px; }\n.form-group { margin-bottom: 14px; }\n.form-group label {\n  display: block;\n  font-size: 0.78rem;\n  color: var(--text2);\n  margin-bottom: 4px;\n  font-weight: 500;\n}\n.form-group input, .form-group select, .form-group textarea {\n  width: 100%;\n  background: var(--bg);\n  border: 1px solid var(--border);\n  color: var(--text);\n  padding: 10px 12px;\n  border-radius: var(--radius-sm);\n  font-size: 0.9rem;\n}\n.form-group textarea { font-family: monospace; font-size: 0.8rem; resize: vertical; min-height: 120px; }\n.form-group select { cursor: pointer; }\n.modal-actions {\n  display: flex;\n  gap: 10px;\n  justify-content: flex-end;\n  margin-top: 20px;\n  flex-wrap: wrap;\n}\n\n.radio-group {\n  display: flex;\n  gap: 16px;\n}\n.radio-group label {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  cursor: pointer;\n  font-size: 0.9rem;\n  color: var(--text);\n}\n.radio-group input[type="radio"] { accent-color: var(--accent); width: auto; }\n\n@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }\n@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }\n\n/* ─── Toasts ─── */\n#toast-container {\n  position: fixed;\n  bottom: 16px;\n  right: 16px;\n  left: 16px;\n  z-index: 300;\n  display: flex;\n  flex-direction: column;\n  align-items: flex-end;\n  gap: 8px;\n  pointer-events: none;\n}\n.toast {\n  padding: 10px 16px;\n  border-radius: var(--radius-sm);\n  font-size: 0.85rem;\n  animation: slideIn 0.3s ease;\n  box-shadow: var(--shadow);\n  max-width: 400px;\n  pointer-events: auto;\n}\n.toast.success { background: #0d7d5e; color: #fff; }\n.toast.error { background: var(--red); color: #fff; }\n.toast.info { background: var(--accent); color: #fff; }\n@keyframes slideIn {\n  from { transform: translateX(100%); opacity: 0; }\n  to { transform: translateX(0); opacity: 1; }\n}\n\n/* ─── Empty state ─── */\n.empty-state {\n  text-align: center;\n  padding: 40px 16px;\n  color: var(--text2);\n}\n.empty-state .icon { font-size: 2.5rem; margin-bottom: 8px; }\n\n/* ─── Help ─── */\n.help-text { font-size: 0.78rem; color: var(--text2); margin-top: 4px; }\n.hidden { display: none !important; }\ncode {\n  background: var(--bg);\n  padding: 2px 6px;\n  border-radius: 4px;\n  font-size: 0.8rem;\n  border: 1px solid var(--border);\n}\n\n/* ─── Responsive: Tablet ─── */\n@media (max-width: 768px) {\n  .device-commands { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; padding: 12px; }\n  .device-commands.layout-mode { margin: 4px 8px 8px; padding: 8px; }\n  .remote-btn { min-height: 64px; padding: 10px 6px; border-radius: 12px; }\n  .remote-btn .btn-icon { font-size: 1.2rem; }\n  .remote-btn .btn-label { font-size: 0.68rem; }\n  header h1 { font-size: 0.9rem; }\n  .connection-bar { flex-direction: column; align-items: stretch; }\n  .connection-bar .btn { width: 100%; }\n  .status-bar { gap: 10px; }\n}\n\n/* ─── Responsive: Mobile ─── */\n@media (max-width: 480px) {\n  header { padding: 8px 12px; }\n  header h1 { font-size: 0.82rem; }\n  main { padding: 10px; }\n  .section { padding: 12px; border-radius: var(--radius-sm); }\n  .section-header { flex-direction: column; align-items: stretch; }\n  .section-header > div { display: flex; gap: 6px; flex-wrap: wrap; }\n  .device-group { border-radius: 14px; }\n  .device-commands { grid-template-columns: repeat(3, 1fr); gap: 6px; padding: 10px; }\n  .device-commands.layout-mode { grid-template-columns: repeat(3, 1fr); margin: 2px 4px 4px; padding: 6px; }\n  .device-header { padding: 10px 14px; }\n  .remote-btn { min-height: 56px; padding: 8px 4px; border-radius: 10px; }\n  .remote-btn .btn-icon { font-size: 1.1rem; }\n  .remote-btn .btn-label { font-size: 0.62rem; }\n  .remote-btn .btn-actions { opacity: 0.7; }\n  .remote-btn .btn-actions button { width: 20px; height: 20px; font-size: 0.5rem; }\n  .cmd-group-grid { grid-template-columns: repeat(3, 1fr); gap: 6px; }\n  .cmd-group { padding: 6px; }\n  .span-controls button { width: 18px; height: 18px; font-size: 0.65rem; }\n  .span-controls span { font-size: 0.55rem; min-width: 16px; }\n  .btn { padding: 10px 14px; font-size: 0.82rem; }\n  .btn-sm { padding: 6px 10px; font-size: 0.75rem; }\n  .modal {\n    width: 100%;\n    max-width: 100%;\n    border-radius: var(--radius) var(--radius) 0 0;\n    max-height: 95vh;\n    margin-top: auto;\n    padding: 16px;\n  }\n  .modal-overlay { align-items: flex-end; }\n  .modal-actions { flex-direction: column; }\n  .modal-actions .btn { width: 100%; }\n  .radio-group { flex-direction: column; gap: 8px; }\n  #toast-container { left: 8px; right: 8px; bottom: 8px; }\n  .toast { max-width: 100%; }\n  .status-bar { font-size: 0.72rem; gap: 8px; padding: 6px 12px; }\n}';
      this.appendChild(style);

      this.innerHTML = TEMPLATE;
      this._rendered = true;
      this._bindEvents();
    }
    this._hass = hass;
    if (!this._initialRender) {
      this._initialRender = true;
      render();
    }
  }

  get hass() { return this._hass; }

  _bindEvents() {
    this.querySelector('#learnBtnTop').onclick = () => openLearn();
    this.querySelector('#learnBtn').onclick = () => startLearn();
    this.querySelector('#learnCancel').onclick = () => closeLearn();
    this.querySelector('#sendOk').onclick = () => sendWithRepeats();
    this.querySelector('#sendCancel').onclick = () => closeSend();
    this.querySelector('#refreshBtn').onclick = () => { render(); toast('Refreshed', 'info'); };
    this.querySelector('#exportBtn').onclick = () => exportCmds();
    this.querySelector('#importFile').onchange = (e) => importCmds(e.target);
    this.querySelector('#manualPullBtn').onclick = () => openPull();
    this.querySelector('#pullCancel').onclick = () => closePull();
    this.querySelector('#pullImport').onclick = () => parsePull();
    this.querySelector('#syncBtn').onclick = () => toast('Use Manual Import to paste storage file JSON', 'info');

    // Modal click-outside
    this.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => {
      if (e.target === o) { closeLearn(); closeSend(); closePull(); }
    }));
    // Escape
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeLearn(); closeSend(); closePull(); } });
  }

  // Expose methods for onclick handlers
  quickSend = quickSend;
  doDelete = doDelete;
  renameCmd = renameCmd;
  renameDev = renameDev;
  openSend = openSend;
  toggleLayoutMode = toggleLayoutMode;
  setSpan = setSpan;
  setCols = setCols;
  toggleSelect = toggleSelect;
  createGroup = createGroup;
  ungroup = ungroup;
  saveLayoutNow = saveLayoutNow;
  dragStart = dragStart;
  dragOver = dragOver;
  dragLeave = dragLeave;
  drop = drop;
  render = render;
}

customElements.define('rf-command-manager', RFManagerPanel);

// Also expose to window for standalone mode (non-HA)
window.RFManagerPanel = RFManagerPanel;
window.quickSend = quickSend;
window.doDelete = doDelete;
window.renameCmd = renameCmd;
window.renameDev = renameDev;
window.openSend = openSend;
window.closeSend = closeSend;
window.sendWithRepeats = sendWithRepeats;
window.toggleLayoutMode = toggleLayoutMode;
window.setSpan = setSpan;
window.setCols = setCols;
window.toggleSelect = toggleSelect;
window.createGroup = createGroup;
window.ungroup = ungroup;
window.saveLayoutNow = saveLayoutNow;
window.openLearn = openLearn;
window.closeLearn = closeLearn;
window.startLearn = startLearn;
window.exportCmds = exportCmds;
window.importCmds = importCmds;
window.openPull = openPull;
window.closePull = closePull;
window.parsePull = parsePull;
window.render = render;
