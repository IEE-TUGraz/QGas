/**
 * QGas Selective Undo Module
 *
 * Keeps up to 50 committed actions (maximum 25 MB of feature snapshots) in
 * memory. Only affected features are retained; complete map layers are never
 * copied. Multi-feature tool operations are grouped into one selectable step.
 */
(function () {
  const MAX_ACTIONS = 50;
  const MAX_BYTES = 25 * 1024 * 1024;
  const GROUP_WINDOW_MS = 2000;
  const actions = [];
  let totalBytes = 0;
  let applyingUndo = false;
  let actionSequence = 0;

  const clone = value => {
    if (value === undefined) return null;
    try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; }
  };

  function estimateBytes(value) {
    try { return new Blob([JSON.stringify(value)]).size; } catch (error) { return 0; }
  }

  function featureId(feature, snapshot) {
    const properties = feature?.properties || snapshot?.properties || {};
    return properties.id || properties.name || properties.Name || 'Unknown';
  }

  function walkLayer(layer, parent, callback, visited) {
    if (!layer || visited.has(layer)) return;
    visited.add(layer);
    callback(layer, parent);
    if (typeof layer.eachLayer === 'function') {
      layer.eachLayer(child => walkLayer(child, layer, callback, visited));
    }
  }

  function findLayerContexts(feature) {
    const contexts = [];
    if (typeof map === 'undefined' || !map || !feature) return contexts;
    const visited = new Set();
    map.eachLayer(root => walkLayer(root, map, (layer, parent) => {
      if (layer?.feature === feature) {
        contexts.push({
          layer,
          parent,
          style: clone({
            color: layer.options?.color,
            weight: layer.options?.weight,
            opacity: layer.options?.opacity,
            fillColor: layer.options?.fillColor,
            fillOpacity: layer.options?.fillOpacity,
            radius: layer.options?.radius,
            dashArray: layer.options?.dashArray
          })
        });
      }
    }, visited));
    return contexts;
  }

  function findCurrentContexts(change) {
    const direct = findLayerContexts(change.feature);
    if (direct.length) return direct;
    const targetId = featureId(change.feature, change.after || change.before);
    const contexts = [];
    if (typeof map === 'undefined' || !map) return contexts;
    const visited = new Set();
    map.eachLayer(root => walkLayer(root, map, (layer, parent) => {
      const properties = layer?.feature?.properties || {};
      const id = properties.id || properties.name || properties.Name;
      if (String(id) === String(targetId)) contexts.push({ layer, parent });
    }, visited));
    return contexts;
  }

  function trimHistory() {
    while (actions.length > MAX_ACTIONS || totalBytes > MAX_BYTES) {
      const removed = actions.shift();
      totalBytes -= removed?.bytes || 0;
    }
  }

  function recordChange(change) {
    if (applyingUndo || !change || !change.feature) return;
    const now = Date.now();
    const tool = change.tool || 'Unknown';
    const before = clone(change.before);
    const after = clone(change.after);
    ['element_key', '__elementKey'].forEach(key => {
      if (change.feature.properties?.[key] !== undefined) {
        if (before?.properties && before.properties[key] === undefined) before.properties[key] = clone(change.feature.properties[key]);
        if (after?.properties && after.properties[key] === undefined) after.properties[key] = clone(change.feature.properties[key]);
      }
    });
    const storedChange = {
      feature: change.feature,
      before,
      after,
      operation: change.operation || 'update',
      elementId: featureId(change.feature, change.after || change.before),
      contexts: Array.isArray(change.contexts) ? change.contexts : findLayerContexts(change.feature),
      descriptions: Array.isArray(change.entries)
        ? change.entries.map(entry => `${entry.change_type}: ${entry.description}`)
        : []
    };
    const bytes = estimateBytes({ before: storedChange.before, after: storedChange.after });
    const previous = actions[actions.length - 1];
    if (previous && previous.tool === tool && now - previous.lastChangeAt <= GROUP_WINDOW_MS) {
      previous.changes.push(storedChange);
      previous.lastChangeAt = now;
      previous.bytes += bytes;
      totalBytes += bytes;
    } else {
      const timestamp = new Date();
      const action = {
        id: `UNDO_${++actionSequence}`,
        tool,
        createdAt: timestamp,
        lastChangeAt: now,
        changes: [storedChange],
        bytes
      };
      actions.push(action);
      totalBytes += bytes;
    }
    trimHistory();
  }

  function latLngsFromCoordinates(coordinates) {
    if (!Array.isArray(coordinates)) return coordinates;
    if (coordinates.length >= 2 && typeof coordinates[0] === 'number') {
      return [coordinates[1], coordinates[0]];
    }
    return coordinates.map(latLngsFromCoordinates);
  }

  function applySnapshotToFeature(feature, snapshot) {
    if (!feature || !snapshot) return;
    feature.properties = clone(snapshot.properties || {});
    feature.geometry = clone(snapshot.geometry || null);
  }

  function applySnapshotToLayer(layer, feature, snapshot) {
    if (!layer || !snapshot) return;
    applySnapshotToFeature(feature, snapshot);
    layer.feature = feature;
    const geometry = snapshot.geometry;
    if (geometry?.type === 'Point' && typeof layer.setLatLng === 'function') {
      layer.setLatLng(latLngsFromCoordinates(geometry.coordinates));
    } else if ((geometry?.type === 'LineString' || geometry?.type === 'MultiLineString') &&
               typeof layer.setLatLngs === 'function') {
      layer.setLatLngs(latLngsFromCoordinates(geometry.coordinates));
    }
    if (typeof layer.redraw === 'function') layer.redraw();
  }

  function removeContexts(contexts) {
    contexts.forEach(({ layer, parent }) => {
      if (parent && parent !== map && typeof parent.removeLayer === 'function') parent.removeLayer(layer);
      else if (typeof map !== 'undefined' && map?.hasLayer(layer)) map.removeLayer(layer);
    });
  }

  function restoreContexts(change) {
    const contexts = change.contexts || [];
    applySnapshotToFeature(change.feature, change.before);
    contexts.forEach(({ layer, parent }) => {
      applySnapshotToLayer(layer, change.feature, change.before);
      const context = contexts.find(candidate => candidate.layer === layer);
      if (context?.style && typeof layer.setStyle === 'function') layer.setStyle(context.style);
      if (context?.style?.radius !== undefined && typeof layer.setRadius === 'function') layer.setRadius(context.style.radius);
      if (parent && parent !== map && typeof parent.addLayer === 'function' && !parent.hasLayer?.(layer)) {
        parent.addLayer(layer);
      } else if (parent === map && !map.hasLayer(layer)) {
        layer.addTo(map);
      }
    });
    if (!contexts.length) {
      const current = findCurrentContexts(change);
      current.forEach(({ layer }) => applySnapshotToLayer(layer, change.feature, change.before));
    }
    if (typeof restoreDeletedFeatureIdentity === 'function') {
      restoreDeletedFeatureIdentity(change.feature);
    }
    change.feature.properties.last_changed = document.getElementById('contributor-input')?.value?.trim() || 'Unknown';
    window.refreshFeatureChangeSnapshot?.(change.feature);
  }

  function undoChange(change) {
    const currentContexts = findCurrentContexts(change);
    if (change.operation === 'create') {
      removeContexts(currentContexts.length ? currentContexts : change.contexts);
      return;
    }
    if (change.operation === 'delete') {
      restoreContexts(change);
      return;
    }
    if (change.operation === 'move') {
      removeContexts(currentContexts);
      restoreContexts(change);
      return;
    }
    const contexts = currentContexts.length ? currentContexts : change.contexts;
    applySnapshotToFeature(change.feature, change.before);
    contexts.forEach(({ layer }) => applySnapshotToLayer(layer, change.feature, change.before));
    change.feature.properties.last_changed = document.getElementById('contributor-input')?.value?.trim() || 'Unknown';
    window.refreshFeatureChangeSnapshot?.(change.feature);
  }

  function actionTimestamp(action) {
    return action.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function locateAction(action) {
    const change = action.changes[0];
    const context = findCurrentContexts(change)[0] || change.contexts?.[0];
    const layer = context?.layer;
    if (!layer || typeof map === 'undefined') return;
    if (typeof layer.getBounds === 'function') {
      const bounds = layer.getBounds();
      if (bounds?.isValid?.()) map.fitBounds(bounds, { maxZoom: 14, padding: [30, 30] });
    } else if (typeof layer.getLatLng === 'function') {
      map.setView(layer.getLatLng(), Math.max(map.getZoom(), 14));
    }
    try {
      if (layer.feature?.geometry?.type === 'LineString' && typeof highlightPipeline === 'function') highlightPipeline(layer);
      else if (typeof highlightElement === 'function') highlightElement(layer);
    } catch (error) {
      console.warn('Could not highlight undo target:', error);
    }
  }

  function renderList() {
    const container = document.getElementById('undo-action-list');
    const confirmButton = document.getElementById('undo-selected-btn');
    if (!container) return;
    container.replaceChildren();
    if (!actions.length) {
      const empty = document.createElement('p');
      empty.className = 'undo-empty';
      empty.textContent = 'No reversible changes are available in this session.';
      container.appendChild(empty);
      if (confirmButton) confirmButton.disabled = true;
      return;
    }

    [...actions].reverse().forEach(action => {
      const details = document.createElement('details');
      details.className = 'undo-action';
      details.dataset.actionId = action.id;
      const summary = document.createElement('summary');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'undo-action-checkbox';
      checkbox.dataset.actionId = action.id;
      checkbox.addEventListener('click', event => event.stopPropagation());
      checkbox.addEventListener('change', updateConfirmState);
      const label = document.createElement('span');
      label.textContent = `${actionTimestamp(action)} - ${action.tool}`;
      summary.append(checkbox, label);
      summary.addEventListener('click', () => locateAction(action));

      const body = document.createElement('div');
      body.className = 'undo-action-body';
      action.changes.forEach(change => {
        const item = document.createElement('div');
        item.className = 'undo-change-item';
        const descriptions = change.descriptions.length
          ? change.descriptions.join('\n')
          : `${change.operation} ${change.elementId}`;
        item.textContent = `Element: ${change.elementId}\n${descriptions}`;
        body.appendChild(item);
      });
      details.append(summary, body);
      container.appendChild(details);
    });
    updateConfirmState();
  }

  function updateConfirmState() {
    const button = document.getElementById('undo-selected-btn');
    if (button) button.disabled = !document.querySelector('.undo-action-checkbox:checked');
  }

  function auditUndo(action) {
    const now = new Date();
    const pad = value => String(value).padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const entries = [];
    action.changes.forEach(change => {
      const descriptions = change.descriptions.length
        ? change.descriptions
        : [`${change.operation} ${change.elementId}`];
      descriptions.forEach(description => entries.push({
        timestamp,
        change_type: 'Undo Change',
        element_id: change.elementId,
        tool: 'Undo Changes',
        description: `Reverted ${action.tool}: ${description}`
      }));
    });
    window.QGasAuditLog?.queueEntries(entries);
  }

  function undoSelected() {
    const selectedIds = new Set(Array.from(
      document.querySelectorAll('.undo-action-checkbox:checked'), checkbox => checkbox.dataset.actionId
    ));
    if (!selectedIds.size) return;
    applyingUndo = true;
    try {
      [...actions].reverse().filter(action => selectedIds.has(action.id)).forEach(action => {
        [...action.changes].reverse().forEach(undoChange);
        auditUndo(action);
      });
      for (let index = actions.length - 1; index >= 0; index -= 1) {
        if (!selectedIds.has(actions[index].id)) continue;
        totalBytes -= actions[index].bytes || 0;
        actions.splice(index, 1);
      }
      if (typeof window.hasUnsavedChanges !== 'undefined') window.hasUnsavedChanges = true;
      renderList();
    } finally {
      applyingUndo = false;
    }
  }

  function openPopup() {
    showCustomPopup(
      'Undo changes',
      '<div id="undo-action-list" class="undo-action-list"></div>',
      [
        { text: 'Undo Changes', type: 'danger', keepOpen: true, onClick: undoSelected },
        { text: 'Close', type: 'secondary', onClick: () => {} }
      ]
    );
    document.getElementById('custom-popup')?.classList.add('custom-popup--undo');
    const buttons = document.getElementById('custom-popup-buttons');
    const undoButton = buttons?.querySelector('.danger');
    if (undoButton) undoButton.id = 'undo-selected-btn';
    renderList();
  }

  window.QGasUndo = {
    recordChange,
    captureContexts: findLayerContexts,
    openPopup,
    undoSelected,
    get isApplying() { return applyingUndo; },
    get actionCount() { return actions.length; }
  };
  window.openUndoChangesPopup = openPopup;
})();
