/**
 * ================================================================================
 * QGas - Integrate Dataset Tool
 * ================================================================================
 *
 * Two top-level modes:
 *   1. Full Element Import
 *      a. QGas Project – import multiple layers from another project folder with
 *         a layer-mapping UI (merge into existing or add as new).
 *      b. Single Layer – add a single .geojson as a new permanent layer.
 *   2. Element Mapping Import – interactively link dataset features to existing
 *      pipelines and download an equivalence JSON.
 *
 * Development Information:
 *  - Authors: Marco Quantschnig, Yannick Werner, Sonja Wogrin and Thomas Klatzer
 *  - Institution: Institute of Electricity Economics and Energy Innovation (IEE), Graz University of Technology, Inffeldgasse 18, Graz, 8010, Austria
 *  - Created: August 2025 / Revised April 2026
 *  - License: See LICENSE file
 *
 * Public API:
 *  - activateIntegrateDatasetTool(): entry point called by tools.js
 * ================================================================================
 */

/* ─── Module-level state ─────────────────────────────────────────────────── */
let integrationMode           = false;
let equivalenceList           = [];
let selectedQGasElements      = new Set();
let integrationLayer          = null;
let currentIntegrationElement = null;
let selectedImportMode        = null; // 'full' | 'mapping'

/* ═══════════════════════════════════════════════════════════════════════════
 * ENTRY POINT
 * ═══════════════════════════════════════════════════════════════════════════ */
function activateIntegrateDatasetTool() {
  if (!checkContributorName || !checkContributorName()) return;
  deactivateAllModes();
  startDatasetIntegration();
}

function startDatasetIntegration() {
  const html = `
    <div style="display:flex; gap:12px; margin:15px 0;">
      <div onclick="selectImportMode('full')" id="mode-full"
        style="flex:1; border:2px solid #444; border-radius:8px; padding:14px 10px;
               cursor:pointer; text-align:center; transition:border 0.15s,background 0.15s;">
        <div style="font-size:26px;">📥</div>
        <div style="font-weight:bold; margin:6px 0;">Full Element Import</div>
        <div style="font-size:12px; color:#aaa;">Import a QGas project or a single layer into the active project.</div>
      </div>
      <div onclick="selectImportMode('mapping')" id="mode-mapping"
        style="flex:1; border:2px solid #444; border-radius:8px; padding:14px 10px;
               cursor:pointer; text-align:center; transition:border 0.15s,background 0.15s;">
        <div style="font-size:26px;">🔗</div>
        <div style="font-weight:bold; margin:6px 0;">Element Mapping Import</div>
        <div style="font-size:12px; color:#aaa;">Interactively map dataset elements to existing pipelines.</div>
      </div>
    </div>`;

  showCustomPopup('🔗 Integrate Dataset', html, [{
    text: 'Cancel', type: 'secondary', onClick: () => {
      selectedImportMode = null;
      currentMode = 'info';
      activateInfoMode();
      selectTool('info');
    }
  }]);
}

/* ─── Top-level mode selector ───────────────────────────────────────────── */
window.selectImportMode = function(mode) {
  selectedImportMode = mode;
  ['full', 'mapping'].forEach(m => {
    const el = document.getElementById(`mode-${m}`);
    if (!el) return;
    el.style.border     = m === mode ? '2px solid #28a745' : '2px solid #444';
    el.style.background = m === mode ? 'rgba(40,167,69,0.15)' : '';
  });
  if (mode === 'full') {
    setTimeout(showFullImportSubOptions, 80);
  } else {
    setTimeout(showMappingSourcePopup, 80);
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
 * FULL ELEMENT IMPORT – sub-option selection
 * ═══════════════════════════════════════════════════════════════════════════ */
function showFullImportSubOptions() {
  closeCustomPopup();
  const html = `
    <div style="display:flex; gap:12px; margin:15px 0;">
      <div onclick="selectFullSubMode('project')" id="fsub-project"
        style="flex:1; border:2px solid #444; border-radius:8px; padding:14px 10px;
               cursor:pointer; text-align:center; transition:border 0.15s,background 0.15s;">
        <div style="font-size:26px;">📂</div>
        <div style="font-weight:bold; margin:6px 0;">QGas Project</div>
        <div style="font-size:12px; color:#aaa;">Import all layers from another project folder with interactive layer mapping.</div>
      </div>
      <div onclick="selectFullSubMode('single')" id="fsub-single"
        style="flex:1; border:2px solid #444; border-radius:8px; padding:14px 10px;
               cursor:pointer; text-align:center; transition:border 0.15s,background 0.15s;">
        <div style="font-size:26px;">📄</div>
        <div style="font-weight:bold; margin:6px 0;">Single Layer</div>
        <div style="font-size:12px; color:#aaa;">Import a single .geojson file as a new project layer.</div>
      </div>
    </div>
    <div id="fsub-source-section" style="display:none; margin-top:10px;"></div>`;

  showCustomPopup('📥 Full Element Import', html, [
    { text: '← Back', type: 'secondary', onClick: () => startDatasetIntegration() },
    { text: 'Cancel',  type: 'secondary', onClick: () => {
      selectedImportMode = null;
      currentMode = 'info';
      activateInfoMode();
      selectTool('info');
    }}
  ]);
}

window.selectFullSubMode = function(subMode) {
  ['project', 'single'].forEach(m => {
    const el = document.getElementById(`fsub-${m}`);
    if (!el) return;
    el.style.border     = m === subMode ? '2px solid #28a745' : '2px solid #444';
    el.style.background = m === subMode ? 'rgba(40,167,69,0.15)' : '';
  });

  const section = document.getElementById('fsub-source-section');
  if (!section) return;
  section.style.display = 'block';

  if (subMode === 'project') {
    section.innerHTML = '<p style="text-align:center; color:#aaa; font-size:13px; padding:8px;">Loading available projects…</p>';
    fetch(`/api/list_projects?v=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        const projects = (data.projects || []).filter(p => p !== currentProject);
        if (projects.length === 0) {
          section.innerHTML = '<p style="color:#f77; text-align:center; padding:6px;">No other projects found in the Input folder.</p>';
          return;
        }
        let html = '<p style="margin:8px 0 4px;"><strong>Select project to import:</strong></p>';
        html += '<select id="import-project-select" style="width:100%; padding:8px; margin:4px 0; background:#222; color:white; border:1px solid #555; border-radius:4px;">';
        html += '<option value="">Choose project…</option>';
        projects.forEach(p => { html += `<option value="${p}">${p}</option>`; });
        html += '</select>';
        html += '<button onclick="loadProjectForMapping()" style="width:100%; padding:9px; margin:6px 0 0; background:#28a745; color:white; border:none; border-radius:4px; cursor:pointer; font-size:14px;">Load &amp; Map Layers →</button>';
        section.innerHTML = html;
      })
      .catch(() => {
        section.innerHTML = '<p style="color:#f77; text-align:center; padding:6px;">Could not load project list from server.</p>';
      });
  } else {
    /* Single layer: preloaded + file upload. */
    const loadedDatasets = Object.keys(additionalDatasets);
    let html = '';
    if (loadedDatasets.length > 0) {
      html += '<p style="margin:8px 0 4px;"><strong>Preloaded datasets:</strong></p>';
      html += '<select id="preloaded-select-full" style="width:100%; padding:8px; margin:4px 0; background:#222; color:white; border:1px solid #555; border-radius:4px;">';
      html += '<option value="">Select preloaded dataset…</option>';
      loadedDatasets.forEach(f => { html += `<option value="${f}">${f.replace('.geojson', '')}</option>`; });
      html += '</select>';
      html += '<button onclick="loadPreloadedSingleLayer()" style="width:100%; padding:8px; margin:4px 0; background:#28a745; color:white; border:none; border-radius:4px; cursor:pointer;">Use Preloaded</button>';
      html += '<hr style="margin:12px 0;">';
    }
    html += '<p style="margin:8px 0 4px;"><strong>Upload .geojson file:</strong></p>';
    html += '<input type="file" id="dataset-file-input-full" accept=".geojson" style="width:100%; padding:8px; margin:4px 0;">';
    html += '<button onclick="loadFileSingleLayer()" style="width:100%; padding:8px; margin:4px 0; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;">Upload &amp; Import</button>';
    section.innerHTML = html;
  }
};

/* ─── Load a preloaded dataset as single layer ──────────────────────────── */
window.loadPreloadedSingleLayer = function() {
  const sel = document.getElementById('preloaded-select-full');
  const filename = sel ? sel.value : '';
  if (!filename || !additionalDatasets[filename]) {
    showInfoPopup('Please select a dataset first.', '📥 Full Import');
    return;
  }
  const dataset = additionalDatasets[filename];
  closeCustomPopup();
  registerNewImportedLayer(filename.replace('.geojson', ''), dataset.data);
  updateLegendControl();
  selectedImportMode = null;
  showCustomPopup('✅ Import Complete',
    `<p style="text-align:center; margin:15px 0;"><strong>${filename.replace('.geojson', '')}</strong> has been added as a new layer.</p>`,
    [{ text: 'OK', type: 'primary', onClick: () => {} }]);
};

/* ─── Load a .geojson file as single layer ──────────────────────────────── */
window.loadFileSingleLayer = function() {
  const fileInput = document.getElementById('dataset-file-input-full');
  const file = fileInput ? fileInput.files[0] : null;
  if (!file) { showInfoPopup('Please select a file first.', '📥 Full Import'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      closeCustomPopup();
      registerNewImportedLayer(file.name.replace('.geojson', ''), data);
      updateLegendControl();
      selectedImportMode = null;
      showCustomPopup('✅ Import Complete',
        `<p style="text-align:center; margin:15px 0;"><strong>${file.name.replace('.geojson', '')}</strong> has been added as a new layer.</p>`,
        [{ text: 'OK', type: 'primary', onClick: () => {} }]);
    } catch (err) {
      showCustomPopup('❌ Error',
        `<p style="text-align:center; margin:15px 0;">Could not load file: ${err.message}</p>`,
        [{ text: 'OK', type: 'primary', onClick: () => {} }]);
    }
  };
  reader.readAsText(file);
};

/* ═══════════════════════════════════════════════════════════════════════════
 * QGAS PROJECT IMPORT – fetch file list → show mapping UI
 * ═══════════════════════════════════════════════════════════════════════════ */
window.loadProjectForMapping = function() {
  const sel = document.getElementById('import-project-select');
  const projectName = sel ? sel.value : '';
  if (!projectName) { showInfoPopup('Please select a project first.', '📥 Full Import'); return; }

  const section = document.getElementById('fsub-source-section');
  if (section) section.innerHTML = '<p style="text-align:center; color:#aaa; padding:8px;">Loading layer list…</p>';

  fetch(`/api/project_files?project=${encodeURIComponent(projectName)}&v=${Date.now()}`)
    .then(r => r.json())
    .then(data => {
      closeCustomPopup();
      showLayerMappingUI(projectName, data.files || []);
    })
    .catch(err => {
      showCustomPopup('❌ Error',
        `<p style="text-align:center;">Could not load files for project "<strong>${projectName}</strong>".<br><small>${err.message}</small></p>`,
        [{ text: 'OK', type: 'primary', onClick: () => {} }]);
    });
};

/* ─── Layer Mapping UI (full-screen overlay) ────────────────────────────── */
function showLayerMappingUI(importedProjectName, importedFiles) {
  const old = document.getElementById('layer-mapping-overlay');
  if (old) old.remove();

  /* Build list of current project layers that actually have a layer instance. */
  const currentLayers = (Array.isArray(layerConfig) ? layerConfig : []).map(c => {
    const ln = c.layerName ||
      (c.filename || '').replace(/[/\\]/g, '_').replace(/\.geojson$/i, '').replace(/[^a-zA-Z0-9_]/g, '') + 'Layer';
    return { legendName: c.legendName || c.filename || ln, layerName: ln };
  }).filter(l => l.layerName && dynamicLayers[l.layerName]);

  /* Naive auto-match: last filename segment vs legend name. */
  function bestMatchIdx(filename) {
    const base   = filename.replace('.geojson', '').toLowerCase();
    const tokens = base.split(/[_\-\s]+/);
    let best = -1, bestScore = 0;
    currentLayers.forEach((l, i) => {
      const ln = l.legendName.toLowerCase();
      const score = tokens.reduce((acc, t) => acc + (ln.includes(t) || base.includes(ln) ? 1 : 0), 0);
      if (score > bestScore) { bestScore = score; best = i; }
    });
    return bestScore > 0 ? best : -1;
  }

  const rows = importedFiles.map((f, i) => {
    const displayName = f.replace('.geojson', '');
    const matchIdx    = bestMatchIdx(f);
    let options = '<option value="__new__">+ Add as new layer</option>';
    currentLayers.forEach((l, li) => {
      const sel = li === matchIdx ? ' selected' : '';
      options += `<option value="${l.layerName}"${sel}>${l.legendName}</option>`;
    });
    return `
      <tr>
        <td style="padding:8px 10px; border-bottom:1px solid #2a2a2a; font-size:13px; white-space:nowrap;">
          <span style="color:#ff9900;">📄</span> ${displayName}
        </td>
        <td style="padding:8px 10px; border-bottom:1px solid #2a2a2a;">
          <select id="lmap-${i}" data-filename="${f}"
            style="width:100%; padding:5px; background:#1a1a1a; color:white; border:1px solid #555; border-radius:4px; font-size:13px;">
            ${options}
          </select>
        </td>
      </tr>`;
  }).join('');

  const overlay = document.createElement('div');
  overlay.id = 'layer-mapping-overlay';
  overlay.innerHTML = `
    <div style="position:fixed; inset:0; background:rgba(0,0,0,0.72); z-index:9000;
                display:flex; align-items:center; justify-content:center;">
      <div style="background:#1e1e1e; color:white; border-radius:12px; padding:24px;
                  width:min(700px,95vw); max-height:88vh; display:flex; flex-direction:column;
                  box-shadow:0 8px 32px rgba(0,0,0,0.7);">
        <h2 style="margin:0 0 4px; font-size:18px;">
          📥 Layer Mapping — <span style="color:#28a745;">${importedProjectName}</span>
        </h2>
        <p style="margin:0 0 14px; font-size:13px; color:#aaa;">
          Assign each imported layer to an existing layer (features will be merged while
          preserving all attributes) or add it as a new layer.
        </p>
        <div style="overflow-y:auto; flex:1; border:1px solid #333; border-radius:6px;">
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr style="background:#111; font-size:11px; text-transform:uppercase; color:#888; position:sticky; top:0;">
                <th style="padding:8px 10px; text-align:left; width:48%;">Imported Layer</th>
                <th style="padding:8px 10px; text-align:left;">Assign to / Action</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div style="display:flex; gap:10px; margin-top:16px;">
          <button onclick="executeProjectImport('${importedProjectName}')"
            style="flex:1; padding:11px; background:#28a745; color:white; border:none;
                   border-radius:6px; cursor:pointer; font-size:14px; font-weight:bold;">
            ✅ Import
          </button>
          <button onclick="cancelLayerMapping()"
            style="flex:1; padding:11px; background:#555; color:white; border:none;
                   border-radius:6px; cursor:pointer; font-size:14px;">
            Cancel
          </button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

window.cancelLayerMapping = function() {
  const overlay = document.getElementById('layer-mapping-overlay');
  if (overlay) overlay.remove();
  selectedImportMode = null;
  currentMode = 'info';
  activateInfoMode();
  selectTool('info');
};

/* ─── Execute the project import ────────────────────────────────────────── */
window.executeProjectImport = function(importedProjectName) {
  /* Collect mapping selections. */
  const mappings = [];
  let i = 0;
  while (true) {
    const sel = document.getElementById(`lmap-${i}`);
    if (!sel) break;
    mappings.push({ filename: sel.dataset.filename, targetLayerName: sel.value });
    i++;
  }

  /* Replace mapping table with progress indicator. */
  const overlay = document.getElementById('layer-mapping-overlay');
  if (overlay) {
    const inner = overlay.querySelector('div > div');
    if (inner) inner.innerHTML = `
      <div style="text-align:center; padding:40px 20px;">
        <div style="font-size:36px; margin-bottom:14px;">⏳</div>
        <p style="font-size:15px; margin:0 0 8px;">Importing layers from <strong>${importedProjectName}</strong>…</p>
        <p id="import-progress" style="color:#aaa; font-size:13px; margin:0;"></p>
      </div>`;
  }

  const results = { merged: 0, newLayers: 0, errors: [] };

  /* First, fetch and parse config.xlsx from the imported project to get styling
   * info for any layers that are added as new (not merged into an existing one). */
  const configUrl = `Input/${encodeURIComponent(importedProjectName)}/config.xlsx?v=${Date.now()}`;
  fetch(configUrl)
    .then(r => r.ok ? r.arrayBuffer() : null)
    .then(buf => {
      const importedStyleMap = {};
      if (buf && typeof XLSX !== 'undefined') {
        try {
          const wb   = XLSX.read(buf, { type: 'array' });
          if (wb.SheetNames.includes('Input_Files')) {
            const rows     = XLSX.utils.sheet_to_json(wb.Sheets['Input_Files'], { header: 1 });
            const startIdx = rows.findIndex(r => Array.isArray(r) && r.some(c => typeof c === 'string' && c.includes('.geojson')));
            for (let j = (startIdx >= 0 ? startIdx : 0); j < rows.length; j++) {
              const row = rows[j];
              if (!row) continue;
              let fn = null;
              for (let col = 0; col < row.length; col++) {
                if (row[col] && typeof row[col] === 'string' && row[col].includes('.geojson')) {
                  fn = row[col].replace(/^.*[\/]/, ''); // strip any leading path
                  break;
                }
              }
              if (!fn) continue;
              importedStyleMap[fn] = {
                legendName: row[1] || fn.replace('.geojson', ''),
                color:      (typeof row[2] === 'string' && row[2].trim().startsWith('#')) ? row[2].trim() : null,
                markerType: row[3] || null,
                size:       Number.isFinite(parseInt(row[4], 10)) ? parseInt(row[4], 10) : null,
                type:       typeof row[5] === 'string' ? row[5].trim() : ''
              };
            }
          }
          console.log('✅ Parsed imported config.xlsx:', importedStyleMap);
        } catch (e) {
          console.warn('Could not parse imported config.xlsx:', e);
        }
      }
      return importedStyleMap;
    })
    .catch(() => ({}))
    .then(importedStyleMap => {
      /* Sequential promise chain for individual layer files. */
      return mappings.reduce((chain, mapping) => {
        return chain.then(() => {
          const { filename, targetLayerName } = mapping;
          const progressEl = document.getElementById('import-progress');
          if (progressEl) progressEl.textContent = `Loading ${filename}…`;

          const url = `Input/${encodeURIComponent(importedProjectName)}/${encodeURIComponent(filename)}?v=${Date.now()}`;
          return fetch(url)
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then(data => {
              const features = data.features || [];
              if (targetLayerName === '__new__') {
                /* Use style from imported project config.xlsx when adding as new. */
                const styleHint = importedStyleMap[filename] || {};
                registerNewImportedLayer(filename.replace('.geojson', ''), data, styleHint);
                results.newLayers++;
              } else {
                const ok = mergeIntoExistingLayer(targetLayerName, features);
                if (ok) { results.merged++; }
                else {
                  /* Fallback: add as new layer, still apply imported style. */
                  const styleHint = importedStyleMap[filename] || {};
                  registerNewImportedLayer(filename.replace('.geojson', ''), data, styleHint);
                  results.newLayers++;
                }
              }
            })
            .catch(err => {
              console.error(`Failed to import ${filename}:`, err);
              results.errors.push(filename);
            });
        });
      }, Promise.resolve());
    })
    .then(() => {
      const oldOverlay = document.getElementById('layer-mapping-overlay');
      if (oldOverlay) oldOverlay.remove();
      updateLegendControl();
      selectedImportMode = null;

      const errHtml = results.errors.length > 0
        ? `<p style="color:#f77; margin:4px 0;">⚠️ Errors (${results.errors.length}): ${results.errors.join(', ')}</p>`
        : '';
      showCustomPopup('✅ Import Complete',
        `<div style="text-align:center; padding:10px 0;">
          <p style="font-size:15px; margin:0 0 10px;">
            Project <strong>${importedProjectName}</strong> imported.
          </p>
          <p style="margin:4px 0;">🔀 Merged into existing layers: <strong>${results.merged}</strong></p>
          <p style="margin:4px 0;">🆕 Added as new layers: <strong>${results.newLayers}</strong></p>
          ${errHtml}
        </div>`,
        [{ text: 'OK', type: 'primary', onClick: () => {} }]);
    });
};

/* ═══════════════════════════════════════════════════════════════════════════
 * LAYER REGISTRATION  –  new layer, fully editable + exportable
 * ═══════════════════════════════════════════════════════════════════════════ */
function registerNewImportedLayer(label, data, configHint = {}) {
  const safeName  = label.replace(/[^a-zA-Z0-9]/g, '_');
  const layerName = safeName + '_imported';

  const features  = (data && data.features) || [];
  const firstGeom = features.length > 0 ? (features[0].geometry || {}).type : '';
  const isLine    = ['LineString', 'MultiLineString'].includes(firstGeom);
  const geomClass = isLine ? 'line' : 'point';

  const color      = configHint.color      || (isLine ? '#ff6600' : '#ff7800');
  const size       = configHint.size       || (isLine ? 3 : 8);
  const markerType = configHint.markerType || (isLine ? 'line' : 'circle');

  const config = {
    /* Use layerName-based filename so this entry never collides with an
     * existing layer config that shares the original filename
     * (e.g. importing PL_Pipelines.geojson must not overwrite the
     * original PL_Pipelines layer in the legend). */
    filename:      layerName + '.geojson',
    legendName:    configHint.legendName || label,
    color,
    size,
    type:          isLine ? 'Line' : 'Point',
    markerType,
    elementKey:    safeName,
    geometryClass: geomClass,
    layerName
  };

  const metadata = registerLayerMetadata(layerName, config);

  const geojsonOptions = {
    onEachFeature: (feat, lyr) => {
      assignMetadataToLayer(lyr, metadata);
      handleFeature(feat, lyr);
      /* Capture original style so resetPipelineStyle can restore after highlight. */
      if (typeof lyr.getLatLngs === 'function') {
        lyr._originalColor    = lyr.options.color;
        lyr._originalWeight   = lyr.options.weight;
        lyr._originalOpacity  = typeof lyr.options.opacity === 'number' ? lyr.options.opacity : 0.8;
        lyr._originalDashArray = lyr.options.dashArray || null;
      }
    }
  };

  /* Derive the correct Leaflet pane for new standalone imported layers. */
  const importedPane = (() => {
    const hint = (config.filename || '').toLowerCase();
    if (hint.match(/\bpl_|pipeline/)) return 'pipelinePane';
    if (hint.match(/\bn_|\bnode/))    return 'nodePane';
    return 'overlayPane';
  })();

  if (isLine) {
    geojsonOptions.pane  = importedPane;
    geojsonOptions.style = () => ({
      color, weight: size, opacity: 0.8, lineCap: 'round', lineJoin: 'round'
    });
  } else {
    geojsonOptions.pointToLayer = (feat, latlng) => {
      const marker = createShapedMarker(latlng, {
        shape: markerType, size, color, pane: importedPane
      });
      marker.feature = feat;
      if (typeof captureOriginalMarkerStyle === 'function') captureOriginalMarkerStyle(marker, 'default');
      return marker;
    };
  }

  const layer = L.geoJSON(data, geojsonOptions).addTo(map);
  assignMetadataToLayer(layer, metadata);
  rememberLayerInstanceForElementKey(metadata.elementKey, layer);
  dynamicLayers[layerName] = layer;
  dynamicLayers[label]     = layer; // also under the human-readable name

  /* Register in window.customLayers so exportCompleteDataset picks it up. */
  if (!window.customLayers) window.customLayers = {};
  window.customLayers[label] = layer;
  layer._customLayerSettings = { filename: layerName + '.geojson', color, name: label };

  upsertLayerConfigEntry(config, metadata);
  if (typeof invalidateStyleableLayerRegistry === 'function') invalidateStyleableLayerRegistry();

  console.log(`✅ Registered new imported layer: ${label} (${features.length} features)`);
  return layer;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LAYER MERGING  –  merge imported features into an existing layer
 * ═══════════════════════════════════════════════════════════════════════════ */
function mergeIntoExistingLayer(targetLayerName, importedFeatures) {
  const targetLayer = dynamicLayers[targetLayerName];
  if (!targetLayer) {
    console.error('Target layer not found for merge:', targetLayerName);
    return false;
  }

  const metadata = targetLayer._qgasMeta || layerMetadataRegistry[targetLayerName];

  /* Look up the target layer's style from layerConfig so imported features
   * get the exact same colour, weight, and marker shape as the existing ones. */
  const targetConfig = (Array.isArray(layerConfig) ? layerConfig : []).find(c => c.layerName === targetLayerName);

  /* Detect the Leaflet pane of the target layer by sampling an existing
   * sub-layer. Merged features MUST land in the same pane as the originals
   * so they don't float into overlayPane (z-index 400) and block clicks on
   * nodes in nodePane (z-index 360) or pipelinePane (z-index 350). */
  let targetPane = null;
  targetLayer.eachLayer(l => {
    if (targetPane) return;
    if (l.options && l.options.pane) targetPane = l.options.pane;
  });
  if (!targetPane) {
    /* Fallback: infer from the layer name or config filename. */
    const hint = (targetLayerName + ' ' + (targetConfig?.filename || '')).toLowerCase();
    if (hint.match(/\bpl_|pipeline/)) targetPane = 'pipelinePane';
    else if (hint.match(/\bn_|\bnode/)) targetPane = 'nodePane';
    else targetPane = 'overlayPane';
  }

  /* ── 1. Build unified attribute key set (union of existing + incoming). */
  const allKeys = new Set();
  targetLayer.eachLayer(l => {
    if (l.feature && l.feature.properties) {
      Object.keys(l.feature.properties).forEach(k => allKeys.add(k));
    }
  });
  importedFeatures.forEach(f => {
    if (f.properties) Object.keys(f.properties).forEach(k => allKeys.add(k));
  });

  /* ── 2. Back-fill missing keys in existing features with null. */
  targetLayer.eachLayer(l => {
    if (l.feature && l.feature.properties) {
      allKeys.forEach(k => {
        if (!(k in l.feature.properties)) l.feature.properties[k] = null;
      });
    }
  });

  /* ── 3. Add each imported feature with unified schema + full interactivity. */
  importedFeatures.forEach(feature => {
    /* Build unified properties. */
    const unifiedProps = {};
    allKeys.forEach(k => {
      unifiedProps[k] = (feature.properties && k in feature.properties)
        ? feature.properties[k]
        : null;
    });

    const unifiedFeature = {
      type: 'Feature',
      geometry:   feature.geometry,
      properties: unifiedProps
    };

    const tmpOptions = {
      onEachFeature: (feat, lyr) => {
        if (metadata) assignMetadataToLayer(lyr, metadata);
        handleFeature(feat, lyr);
        /* Capture original style so resetPipelineStyle can restore after highlight. */
        if (typeof lyr.getLatLngs === 'function') {
          lyr._originalColor    = lyr.options.color;
          lyr._originalWeight   = lyr.options.weight;
          lyr._originalOpacity  = typeof lyr.options.opacity === 'number' ? lyr.options.opacity : 0.8;
          lyr._originalDashArray = lyr.options.dashArray || null;
        }
      }
    };

    /* Inherit style from the target layer's layerConfig entry. */
    const geomType = (feature.geometry || {}).type;
    if (geomType === 'LineString' || geomType === 'MultiLineString') {
      /* Lines: use config colour + weight; fall back to sub-layer inspection. */
      let color = '#3388ff', weight = 3;
      if (targetConfig) {
        color  = targetConfig.color || color;
        weight = targetConfig.size  || weight;
      } else {
        targetLayer.eachLayer(l => {
          if (l.options) {
            if (l.options.color)  color  = l.options.color;
            if (l.options.weight) weight = l.options.weight;
          }
        });
      }
      /* pane must be in the GeoJSON root options (not in style()) because
       * L.Path ignores pane changes after construction. */
      tmpOptions.pane  = targetPane;
      tmpOptions.style = () => ({ color, weight, opacity: 0.8, lineCap: 'round', lineJoin: 'round' });
    } else {
      /* Points: use createShapedMarker with the target layer's config. */
      let color = '#ff7800', size = 8, shape = 'circle';
      if (targetConfig) {
        color = targetConfig.color      || color;
        size  = targetConfig.size       || size;
        shape = targetConfig.markerType || shape;
      } else {
        /* Fall back: inspect existing markers for style hints. */
        targetLayer.eachLayer(l => {
          const s = l._customMarkerStyle || l.options;
          if (s) {
            if (s.color)      color = s.color;
            if (s.size)       size  = s.size;
            if (s.markerType) shape = s.markerType;
          }
        });
      }
      tmpOptions.pointToLayer = (feat, latlng) => {
        const marker = createShapedMarker(latlng, { shape, size, color, pane: targetPane });
        marker.feature = feat;
        if (typeof captureOriginalMarkerStyle === 'function') captureOriginalMarkerStyle(marker, 'default');
        return marker;
      };
    }

    const tmpLayer = L.geoJSON(unifiedFeature, tmpOptions);
    tmpLayer.eachLayer(lyr => targetLayer.addLayer(lyr));
  });

  console.log(`✅ Merged ${importedFeatures.length} features into ${targetLayerName}`);
  return true;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * ELEMENT MAPPING MODE  –  popup with source selection
 * ═══════════════════════════════════════════════════════════════════════════ */
function showMappingSourcePopup() {
  closeCustomPopup();

  const loadedDatasets = Object.keys(additionalDatasets);
  let html = '';

  if (loadedDatasets.length > 0) {
    html += '<p style="margin:8px 0 4px;"><strong>Preloaded datasets:</strong></p>';
    html += '<select id="preloaded-select" style="width:100%; padding:8px; margin:4px 0; background:#222; color:white; border:1px solid #555; border-radius:4px;">';
    html += '<option value="">Select preloaded dataset…</option>';
    loadedDatasets.forEach(f => { html += `<option value="${f}">${f.replace('.geojson', '')}</option>`; });
    html += '</select>';
    html += '<button onclick="loadPreloadedDataset()" style="width:100%; padding:8px; margin:4px 0; background:#28a745; color:white; border:none; border-radius:4px; cursor:pointer;">Use Preloaded</button>';
    html += '<hr style="margin:12px 0;">';
  }

  html += '<p style="margin:8px 0 4px;"><strong>Or upload your own .geojson file:</strong></p>';
  html += '<input type="file" id="dataset-file-input" accept=".geojson" style="width:100%; padding:8px; margin:4px 0;">';
  html += '<button onclick="loadFileDataset()" style="width:100%; padding:8px; margin:4px 0; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;">Upload &amp; Use File</button>';

  showCustomPopup('🔗 Element Mapping Import', html, [
    { text: '← Back', type: 'secondary', onClick: () => startDatasetIntegration() },
    { text: 'Cancel', type: 'secondary', onClick: () => {
      selectedImportMode = null;
      currentMode = 'info';
      activateInfoMode();
      selectTool('info');
    }}
  ]);
}

/* Legacy alias kept in case anything still calls the old name. */
function showMappingSourceSection() { showMappingSourcePopup(); }

window.loadPreloadedDataset = function() {
  const select = document.getElementById('preloaded-select');
  const selectedFile = select ? select.value : '';
  if (selectedFile && additionalDatasets[selectedFile]) {
    setupIntegrationModeWithPreloaded(selectedFile);
  } else {
    showInfoPopup('Please select a dataset first.', '🔗 Integrate Dataset');
  }
};

window.loadFileDataset = function() {
  const fileInput = document.getElementById('dataset-file-input');
  const file = fileInput ? fileInput.files[0] : null;
  if (!file) { showInfoPopup('Please select a file first.', '🔗 Integrate Dataset'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      const tempFilename = file.name;
      createDatasetLayer(tempFilename, data);
      setTimeout(() => setupIntegrationModeWithPreloaded(tempFilename), 500);
    } catch (err) {
      showCustomPopup('❌ Error',
        `<p style="text-align:center; margin:15px 0;">Could not load file: ${err.message}</p>`,
        [{ text: 'OK', type: 'primary', onClick: () => {} }]);
    }
  };
  reader.readAsText(file);
};

/* ─── Integration mode setup ────────────────────────────────────────────── */
function setupIntegrationModeWithPreloaded(filename) {
  const dataset = additionalDatasets[filename];
  if (!dataset) {
    showCustomPopup('❌ Error',
      '<p style="text-align:center; margin:15px 0;">Dataset not found or not loaded properly.</p>',
      [{ text: 'OK', type: 'primary', onClick: () => {} }]);
    return;
  }

  integrationMode = true;
  equivalenceList = [];
  selectedQGasElements.clear();
  integrationLayer = dataset.layer;

  /* Hide non-pipeline layers. */
  [powerplantsLayer, compressorsLayer, storageLayer, lngLayer, nodeLayer, consumptionLayer]
    .forEach(l => { if (l && map && map.hasLayer(l)) map.removeLayer(l); });

  /* Ensure pipelines visible. */
  if (typeof pipelineLayer !== 'undefined' && pipelineLayer && !map.hasLayer(pipelineLayer)) {
    pipelineLayer.addTo(map);
  }

  integrationLayer.setStyle({ color: '#ff6600', weight: 4, opacity: 0.8, fillOpacity: 0.1 });

  integrationLayer.eachLayer(layer => {
    layer.off('click');
    layer.on('click', function(e) {
      if (integrationMode) { selectIntegrationElement(layer.feature, layer); e.stopPropagation(); }
    });
  });

  /* Bind selection handler to ALL line layers so info-mode popups can't fire. */
  const allLineLayers = (typeof getAllLineLayers === 'function') ? getAllLineLayers() : (pipelineLayer ? [pipelineLayer] : []);
  allLineLayers.forEach(lineLayer => {
    if (!lineLayer || lineLayer === integrationLayer) return;
    lineLayer.eachLayer(layer => {
      layer.off('click');
      layer.on('click', function(e) {
        if (integrationMode) { selectPipelineElement(layer.feature, layer); e.stopPropagation(); }
      });
    });
  });

  closeCustomPopup();
  showIntegrationControls(filename);
}

function selectPipelineElement(feature, layer) {
  if (!feature) return;
  const id = feature.properties.ID;
  if (selectedQGasElements.has(id)) {
    selectedQGasElements.delete(id);
    layer.setStyle({ color: '#3388ff', weight: 3 });
  } else {
    selectedQGasElements.add(id);
    layer.setStyle({ color: '#00ff88', weight: 5 });
  }
  const selEl = document.getElementById('integration-selected');
  if (selEl) selEl.textContent = selectedQGasElements.size;
}

function selectIntegrationElement(feature, layer) {
  if (!feature) return;
  currentIntegrationElement = { feature, layer };
  layer.setStyle({ color: '#ff0000', weight: 6 });
  setTimeout(() => layer.setStyle({ color: '#ff6600', weight: 4 }), 300);

  if (selectedQGasElements.size === 0) {
    showInfoPopup('Please select at least one QGas pipeline element first.', '🔗 Integrate Dataset');
    return;
  }

  const qgasIds        = Array.from(selectedQGasElements);
  const datasetIdField = detectIdField(feature.properties);
  const datasetId      = datasetIdField ? feature.properties[datasetIdField] : 'unknown';

  equivalenceList.push({ datasetElement: datasetId, qgasElements: qgasIds });

  /* Mark linked pipelines orange, unlinked back to default blue. */
  if (pipelineLayer) {
    pipelineLayer.eachLayer(l => {
      const lid = l.feature && l.feature.properties && l.feature.properties.ID;
      const isLinked = equivalenceList.some(e => e.qgasElements.includes(lid));
      l.setStyle(isLinked ? { color: '#ff9900', weight: 4 } : { color: '#3388ff', weight: 3 });
    });
  }
  selectedQGasElements.clear();
  const selEl = document.getElementById('integration-selected');
  if (selEl) selEl.textContent = 0;
  updateIntegrationCount();
  showInfoPopup(`Linked dataset element ${datasetId} to ${qgasIds.length} QGas elements.`, '🔗 Integration');
}

function detectIdField(properties) {
  const candidates = ['id', 'ID', 'Project_ID', 'project_id', 'element_id', 'Element_ID'];
  for (const f of candidates) {
    if (Object.prototype.hasOwnProperty.call(properties, f)) return f;
  }
  for (const key in properties) {
    if (key.toLowerCase().includes('id')) return key;
  }
  return null;
}

function showIntegrationControls(filename) {
  const controlDiv = document.createElement('div');
  controlDiv.id = 'integration-controls';
  controlDiv.innerHTML = `
    <div style="position:fixed; bottom:20px; left:50%; transform:translateX(-50%); z-index:2000;
                background:rgba(0,0,0,0.9); color:white; padding:15px 25px; border-radius:10px;
                box-shadow:0 4px 15px rgba(0,0,0,0.5);">
      <h3 style="margin:0 0 10px; text-align:center;">Integration Mode: ${filename}</h3>
      <p style="margin:5px 0; font-size:13px; text-align:center;">
        1. Select QGas pipelines <span style="color:#00ff88;">●</span> (click to toggle)<br>
        2. Click dataset element <span style="color:#ff6600;">●</span> to link<br>
        Selected: <span id="integration-selected">0</span> &nbsp;|&nbsp;
        Links created: <span id="integration-count">0</span>
      </p>
      <div style="display:flex; gap:10px; margin-top:10px;">
        <button onclick="finishIntegration()"
          style="flex:1; padding:8px; background:#28a745; color:white; border:none; border-radius:5px; cursor:pointer;">Finish</button>
        <button onclick="cancelIntegration()"
          style="flex:1; padding:8px; background:#dc3545; color:white; border:none; border-radius:5px; cursor:pointer;">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(controlDiv);
  updateIntegrationCount();
}

function updateIntegrationCount() {
  const el = document.getElementById('integration-count');
  if (el) el.textContent = equivalenceList.length;
}

window.finishIntegration = function() {
  const dataStr  = JSON.stringify(equivalenceList, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url  = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href  = url;
  link.download = 'integration_equivalences.json';
  link.click();
  const count = equivalenceList.length;
  cleanupIntegrationMode();
  showCustomPopup('✅ Integration Complete',
    `<p style="text-align:center; margin:15px 0;">Created ${count} links.<br>Equivalence list downloaded.</p>`,
    [{ text: 'OK', type: 'primary', onClick: () => {} }]);
};

window.cancelIntegration = function() {
  cleanupIntegrationMode();
  showInfoPopup('Integration cancelled.', '🔗 Integration');
};

function cleanupIntegrationMode() {
  integrationMode = false;
  equivalenceList = [];
  selectedQGasElements.clear();
  currentIntegrationElement = null;

  if (integrationLayer && map.hasLayer(integrationLayer)) map.removeLayer(integrationLayer);
  integrationLayer = null;

  const controlDiv = document.getElementById('integration-controls');
  if (controlDiv) controlDiv.remove();

  /* Restore hidden layers. */
  [powerplantsLayer, compressorsLayer, storageLayer, lngLayer, nodeLayer, consumptionLayer]
    .forEach(l => { if (l) { try { l.addTo(map); } catch (e) { /* already added */ } } });

  /* Strip integration click handlers from all line layers; activateInfoMode(true) will rebind info-mode ones. */
  const allLineLayers = (typeof getAllLineLayers === 'function') ? getAllLineLayers() : (pipelineLayer ? [pipelineLayer] : []);
  allLineLayers.forEach(lineLayer => {
    if (!lineLayer) return;
    lineLayer.eachLayer(layer => { layer.off('click'); });
  });

  currentMode = 'info';
  activateInfoMode(true);
  selectTool('info');
}
