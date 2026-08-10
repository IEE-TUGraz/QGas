/**
 * QGas Session Logs
 *
 * Owns the browser-session logs, buffered server writes, current-log reader,
 * and the collapsible Logs popup. Dataset change detection remains in
 * core.js and submits already formatted entries through this module.
 *
 * Public API:
 * - QGasLogs.ensureSessionStarted(): Initialize logging for the current session.
 * - QGasLogs.queueEntries(entries): Queue entries for persistent storage.
 * - QGasLogs.flush(useBeacon): Persist queued entries immediately.
 * - QGasLogs.loadCurrent(): Load the current session log.
 * - QGasLogs.openPopup(): Open the session logs dialog.
 * - openLogsPopup(): Entry point used by the GUI button.
 */
(function () {
  const pendingEntries = [];
  let sessionId = '';
  let flushTimer = null;
  let requestInFlight = false;
  let sessionInitialization = null;

  function contributorName() {
    return document.getElementById('contributor-input')?.value?.trim() || 'Unknown';
  }

  function createSessionId() {
    const now = new Date();
    const pad = value => String(value).padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `${timestamp}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }

  function ensureSessionStarted() {
    if (sessionId) return sessionId;
    sessionId = createSessionId();
    sessionInitialization = fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, contributor: contributorName(), entries: [] }),
      keepalive: true
    }).catch(error => console.warn('Could not initialize logs session:', error));
    return sessionId;
  }

  function queueEntries(entries) {
    if (!Array.isArray(entries) || !entries.length) return;
    ensureSessionStarted();
    pendingEntries.push(...entries);
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => flush(), 120);
  }

  async function flush(useBeacon = false) {
    if (requestInFlight || !pendingEntries.length || !sessionId) return;
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    const entries = pendingEntries.splice(0, 250);
    const payload = { session_id: sessionId, contributor: contributorName(), entries };

    if (useBeacon && navigator.sendBeacon) {
      const sent = navigator.sendBeacon('/api/logs', new Blob(
        [JSON.stringify(payload)], { type: 'application/json' }
      ));
      if (!sent) pendingEntries.unshift(...entries);
      return;
    }

    requestInFlight = true;
    try {
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      pendingEntries.unshift(...entries);
      console.warn('Could not write logs; retrying:', error);
    } finally {
      requestInFlight = false;
      if (pendingEntries.length) flushTimer = setTimeout(() => flush(), 1500);
    }
  }

  async function waitForWrites() {
    ensureSessionStarted();
    if (sessionInitialization) await sessionInitialization;
    while (requestInFlight) await new Promise(resolve => setTimeout(resolve, 20));
    await flush();
    while (requestInFlight) await new Promise(resolve => setTimeout(resolve, 20));
  }

  function render(viewer, content) {
    viewer.replaceChildren();
    const lines = String(content || '').split(/\r?\n/);
    const header = lines.shift() || 'Current session';
    if (lines[0] && /^=+$/.test(lines[0].trim())) lines.shift();

    const headerElement = document.createElement('div');
    headerElement.className = 'logs-session-header';
    headerElement.textContent = header;
    viewer.appendChild(headerElement);

    const entries = lines.filter(line => line.trim()).map(line => {
      const fields = line.split(' | ');
      const timestamp = fields[0] || 'Unknown time';
      const toolField = fields.find(field => field.startsWith('Tool: '));
      return {
        fields,
        timestamp,
        timestampMs: Date.parse(timestamp.replace(' ', 'T')),
        tool: toolField ? toolField.slice(6) : 'Unknown tool'
      };
    });
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No changes have been recorded yet.';
      viewer.appendChild(empty);
      return;
    }

    const groups = [];
    entries.forEach(entry => {
      const previousGroup = groups[groups.length - 1];
      const previousEntry = previousGroup?.entries[previousGroup.entries.length - 1];
      const distance = Number.isFinite(entry.timestampMs) && Number.isFinite(previousEntry?.timestampMs)
        ? Math.abs(entry.timestampMs - previousEntry.timestampMs)
        : (entry.timestamp === previousEntry?.timestamp ? 0 : Infinity);
      if (previousGroup && previousGroup.tool === entry.tool && distance <= 2000) {
        previousGroup.entries.push(entry);
      } else {
        groups.push({ tool: entry.tool, timestamp: entry.timestamp, entries: [entry] });
      }
    });

    groups.forEach(group => {
      const time = group.timestamp.match(/\b\d{2}:\d{2}(?::\d{2})?\b/)?.[0] || group.timestamp;
      const details = document.createElement('details');
      details.className = 'logs-entry';
      const summary = document.createElement('summary');
      summary.textContent = `${time} - ${group.tool}`;
      const body = document.createElement('div');
      body.className = 'logs-entry-body';

      group.entries.forEach((entry, index) => {
        const change = document.createElement('div');
        change.className = 'logs-change';
        if (group.entries.length > 1) {
          const label = document.createElement('strong');
          label.textContent = `Change ${index + 1}`;
          change.appendChild(label);
        }
        const information = document.createElement('div');
        information.textContent = entry.fields
          .filter(field => !field.startsWith('Tool: '))
          .join('\n');
        change.appendChild(information);
        body.appendChild(change);
      });
      details.append(summary, body);
      viewer.appendChild(details);
    });
  }

  async function loadCurrent() {
    const viewer = document.getElementById('logs-viewer');
    if (viewer) viewer.textContent = 'Loading current log...';
    try {
      await waitForWrites();
      const response = await fetch(`/api/logs?session_id=${encodeURIComponent(sessionId)}`, {
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      const currentViewer = document.getElementById('logs-viewer');
      if (currentViewer) render(currentViewer, result.content);
    } catch (error) {
      const currentViewer = document.getElementById('logs-viewer');
      if (currentViewer) currentViewer.textContent = `Could not load the log (${error.message}).`;
      console.warn('Could not load log:', error);
    }
  }

  async function openPopup() {
    showCustomPopup(
      'Session Logs',
      '<div id="logs-viewer" class="logs-viewer">Loading current log...</div>',
      [
        { text: 'Refresh', type: 'primary', keepOpen: true, onClick: () => loadCurrent() },
        { text: 'Close', type: 'secondary', onClick: () => {} }
      ]
    );
    document.getElementById('custom-popup')?.classList.add('custom-popup--logs');
    await loadCurrent();
  }

  window.QGasLogs = { ensureSessionStarted, queueEntries, flush, loadCurrent, openPopup };
  window.openLogsPopup = openPopup;
  window.loadCurrentLog = loadCurrent;
  window.addEventListener('beforeunload', () => flush(true));
})();
