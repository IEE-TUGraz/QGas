/**
 * QGas - Statistics Module
 *
 * Module Description:
 * Computes and displays infrastructure statistics in a modal dialog,
 * including counts and aggregated metrics.
 *
 * Authors: Marco Quantschnig, Yannick Werner, Sonja Wogrin and Thomas Klatzer
 * Institution: Institute of Electricity Economics and Energy Innovation (IEE), Graz University of Technology, Inffeldgasse 18, Graz, 8010, Austria
 * Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - Map layers and feature properties for aggregation.
 * - DOM elements for statistics modal and charts.
 *
 * Public API:
 * - openStatisticsModal(): Show the statistics modal.
 * - closeStatisticsModal(): Hide the statistics modal.
 * - updateStatistics(): Recompute and render statistics.
 */
  /**
   * Open the statistics modal dialog.
   *
   * Triggers a full recomputation of infrastructure statistics via
   * {@link updateStatistics} before making the modal visible. This ensures
   * that all displayed values reflect the current map state at the time of
   * opening.
   *
   * @returns {void}
   */
  function openStatisticsModal() {
    updateStatistics();
    document.getElementById('statistics-modal').style.display = 'flex';
  }

  /**
   * Close the statistics modal dialog.
   *
   * Hides the statistics modal by setting its CSS display property to
   * {@code none}. No statistical data is cleared; subsequent calls to
   * {@link openStatisticsModal} will recompute and re-display updated values.
   *
   * @returns {void}
   */
  function closeStatisticsModal() {
    document.getElementById('statistics-modal').style.display = 'none';
  }

  /*
   * Robust click handler: the Statistics button is injected dynamically by the legend.
   * Uses event delegation so it works regardless of legend render timing.
   */
  document.addEventListener('click', (e) => {
    const t = e && e.target;
    if (!t) return;
    if (t.id === 'statistics-btn') {
      try {
        openStatisticsModal();
      } catch (err) {
        console.error('Failed to open statistics modal:', err);
      }
    }
  });

  /* Global statistics cache. */
  let currentStatistics = null;

  /**
   * Recompute and render all infrastructure statistics.
   *
   * Calculates aggregate metrics (pipeline counts, total lengths, node
   * counts, storage capacities, etc.) from the current map layers and
   * renders the results into the statistics modal. The computed statistics
   * object is also cached in {@link window.cachedStatistics} for subsequent
   * use by other modules without redundant recalculation.
   *
   * @returns {void}
   */
  function updateStatistics() {
    const stats = calculateStatistics();
    displayStatistics(stats);
    
    /* Cache the statistics globally for performance. */
    window.cachedStatistics = stats;
  }

  function calculateStatistics() {
    let stats = {
      pipelineElements: 0,
      totalLength: 0,
      storages: 0,
      lngTerminals: 0,
      powerplants: 0,
      compressors: 0,
      nodes: 0,
      nodesBase: 0,
      nodesSublayer: 0,
      nodeLayerStats: {},
      borderpoints: 0,
      demands: 0,
      productions: 0,
      hydrogenPipes: 0,
      electrolyzers: 0,
      pipelineSources: {},
      pipelineSourcesByCount: {},
      pipelineDiameter: { available: 0, total: 0, lengthAvailable: 0, totalLength: 0 },
      pipelineName: { available: 0, total: 0, lengthAvailable: 0, totalLength: 0 },
      pipelinePressure: { available: 0, total: 0, lengthAvailable: 0, totalLength: 0 },
      lineLayerStats: {}
    };

    const lineGroups = (typeof getLineLayerGroupsForDirectionMode === 'function')
      ? [...getLineLayerGroupsForDirectionMode()]
      : [];
    if (!lineGroups.length && pipelineLayer) {
      lineGroups.push(pipelineLayer);
    }

    const processedLineIds = new Set();
    let fallbackLineCounter = 0;
    const getLineIdentifier = (layer) => {
      if (!layer) {
        fallbackLineCounter += 1;
        return `line-${fallbackLineCounter}`;
      }
      if (typeof L !== 'undefined' && typeof L.stamp === 'function') {
        return L.stamp(layer);
      }
      if (typeof layer._leaflet_id !== 'undefined') {
        return layer._leaflet_id;
      }
      fallbackLineCounter += 1;
      return `line-${fallbackLineCounter}`;
    };

    const hasValue = (value) => value !== undefined && value !== null && value !== '';

    const measureLineString = (coords) => {
      if (!Array.isArray(coords) || coords.length < 2) return 0;
      let length = 0;
      for (let i = 1; i < coords.length; i++) {
        const prev = coords[i - 1];
        const curr = coords[i];
        if (!Array.isArray(prev) || !Array.isArray(curr)) continue;
        const [lon1, lat1] = prev;
        const [lon2, lat2] = curr;
        if (
          typeof lon1 !== 'number' || typeof lat1 !== 'number' ||
          typeof lon2 !== 'number' || typeof lat2 !== 'number'
        ) {
          continue;
        }
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        length += 6371 * c;
      }
      return length;
    };

    const measureGeometryLength = (geometry) => {
      if (!geometry || !geometry.type) return 0;
      if (geometry.type === 'LineString') {
        return measureLineString(geometry.coordinates);
      }
      if (geometry.type === 'MultiLineString') {
        return (geometry.coordinates || []).reduce((total, segment) => total + measureLineString(segment), 0);
      }
      return 0;
    };

    let hasAnySourceAttribute = false;
    lineGroups.forEach(layerGroup => {
      forEachPolylineFeature(layerGroup, layer => {
        const lineId = getLineIdentifier(layer);
        if (processedLineIds.has(lineId)) {
          return;
        }
        processedLineIds.add(lineId);
        if (!layer || !layer.feature || !layer.feature.properties) {
          return;
        }

        /* Prefer layer metadata over group metadata for naming. */
        const layerName = layer?._qgasMeta?.legendName || 
                          layer?.feature?.properties?.__elementKey || 
                          layerGroup?._qgasMeta?.legendName || 
                          layerGroup?._customLayerName || 
                          'Pipelines';
        
        /* Initialize stats for this layer if missing. */
        if (!stats.lineLayerStats[layerName]) {
          stats.lineLayerStats[layerName] = {
            count: 0,
            totalLength: 0
          };
        }

        const props = layer.feature.properties;
        const length = measureGeometryLength(layer.feature.geometry || null);
        stats.pipelineElements++;
        stats.totalLength += length;
        
        /* Add to layer-specific stats. */
        stats.lineLayerStats[layerName].count++;
        stats.lineLayerStats[layerName].totalLength += length;

        if (props.Source !== undefined && props.Source !== null) {
          hasAnySourceAttribute = true;
        }

        stats.pipelineDiameter.total++;
        stats.pipelineDiameter.totalLength += length;
        const diameterValue = props.Diameter_mm ?? props.diameter_mm;
        if (hasValue(diameterValue)) {
          stats.pipelineDiameter.available++;
          stats.pipelineDiameter.lengthAvailable += length;
        }

        stats.pipelineName.total++;
        stats.pipelineName.totalLength += length;
        const nameValue = props.Name ?? props.name;
        if (hasValue(nameValue)) {
          stats.pipelineName.available++;
          stats.pipelineName.lengthAvailable += length;
        }

        stats.pipelinePressure.total++;
        stats.pipelinePressure.totalLength += length;
        const pressureValue = props.Pressure_bar ?? props.max_pressure_bar;
        if (hasValue(pressureValue)) {
          stats.pipelinePressure.available++;
          stats.pipelinePressure.lengthAvailable += length;
        }

        const source = hasValue(props.Source) ? props.Source : 'No technical attributes';
        if (!stats.pipelineSources[source]) {
          stats.pipelineSources[source] = 0;
        }
        if (!stats.pipelineSourcesByCount[source]) {
          stats.pipelineSourcesByCount[source] = 0;
        }
        stats.pipelineSources[source] += length;
        stats.pipelineSourcesByCount[source]++;
      });
    });

    /* If no pipeline has Source attribute, replace the placeholder label. */
    if (!hasAnySourceAttribute && stats.pipelineSources['No technical attributes']) {
      stats.pipelineSources['SciGrid_gas'] = stats.pipelineSources['No technical attributes'];
      stats.pipelineSourcesByCount['SciGrid_gas'] = stats.pipelineSourcesByCount['No technical attributes'];
      delete stats.pipelineSources['No technical attributes'];
      delete stats.pipelineSourcesByCount['No technical attributes'];
    }

    /* Count other infrastructure. */
    if (storageLayer) {
      storageLayer.eachLayer(layer => {
        if (layer.feature) stats.storages++;
      });
    }
    if (lngLayer) {
      lngLayer.eachLayer(layer => {
        if (layer.feature) stats.lngTerminals++;
      });
    }
    if (powerplantsLayer) {
      powerplantsLayer.eachLayer(layer => {
        if (layer.feature) stats.powerplants++;
      });
    }
    if (compressorsLayer) {
      compressorsLayer.eachLayer(layer => {
        if (layer.feature) stats.compressors++;
      });
    }
    const resolveNodeLayerConfig = (meta, layerGroup) => {
      if (!Array.isArray(layerConfig) || !layerConfig.length) return null;
      const metaFilename = meta?.filename || '';
      const metaLayerName = meta?.layerName || '';
      const metaLegend = meta?.legendName || '';
      const normalizeName = (value) => {
        if (typeof normalizeFilenameReference === 'function') {
          return normalizeFilenameReference(value || '');
        }
        return String(value || '').trim().toLowerCase();
      };
      const normalizedMetaFilename = normalizeName(metaFilename);
      return layerConfig.find(cfg => {
        if (!cfg) return false;
        const cfgFilename = normalizeName(cfg.filename || cfg.Filename || '');
        if (normalizedMetaFilename && cfgFilename && normalizedMetaFilename === cfgFilename) return true;
        if (metaLayerName && cfg.layerName && metaLayerName === cfg.layerName) return true;
        if (metaLegend && cfg.legendName && metaLegend === cfg.legendName) return true;
        if (layerGroup?._customLayerName && cfg.legendName && layerGroup._customLayerName === cfg.legendName) return true;
        return false;
      }) || null;
    };

    getAllNodeLayers().forEach(layerGroup => {
      if (!layerGroup || typeof layerGroup.eachLayer !== 'function') return;
      let meta = null;
      if (typeof resolveLayerMetadata === 'function') {
        meta = resolveLayerMetadata(layerGroup);
      }
      if (!meta) {
        meta = layerGroup._qgasMeta || layerGroup._customLayerSettings || null;
      }
      const config = resolveNodeLayerConfig(meta, layerGroup);
      const isSublayer = !!(
        (meta && (meta.isSublayer || meta.parentFilename)) ||
        (config && (config.isSublayer || config.parentFilename))
      );
      const layerLabel = (meta && (meta.legendName || meta.layerName)) ||
        (config && (config.legendName || config.layerName)) ||
        layerGroup._customLayerName ||
        'Nodes';
      if (!stats.nodeLayerStats[layerLabel]) {
        stats.nodeLayerStats[layerLabel] = { count: 0, isSublayer };
      }
      layerGroup.eachLayer(layer => {
        if (!layer || !layer.feature) return;
        stats.nodes++;
        if (isSublayer) {
          stats.nodesSublayer++;
        } else {
          stats.nodesBase++;
        }
        stats.nodeLayerStats[layerLabel].count++;
      });
    });
    if (borderpointsLayer) {
      borderpointsLayer.eachLayer(layer => {
        if (layer.feature) stats.borderpoints++;
      });
    }
    if (demandsLayer) {
      demandsLayer.eachLayer(layer => {
        if (layer.feature) stats.demands++;
      });
    }
    if (productionsLayer) {
      productionsLayer.eachLayer(layer => {
        if (layer.feature) stats.productions++;
      });
    }
    if (hydrogenPipeLayer) {
      hydrogenPipeLayer.eachLayer(layer => {
        if (layer.feature) stats.hydrogenPipes++;
      });
    }
    if (electrolyzersLayer) {
      electrolyzersLayer.eachLayer(layer => {
        if (layer.feature) stats.electrolyzers++;
      });
    }

    return stats;
  }

  function displayStatistics(stats) {
    /* Calculate percentages. */
    const diameterPercentLengthwise = stats.pipelineDiameter.totalLength > 0 ? 
      (stats.pipelineDiameter.lengthAvailable / stats.pipelineDiameter.totalLength * 100) : 0;
    const diameterPercentElementwise = stats.pipelineDiameter.total > 0 ? 
      (stats.pipelineDiameter.available / stats.pipelineDiameter.total * 100) : 0;
    const namePercent = stats.pipelineName.total > 0 ? 
      (stats.pipelineName.available / stats.pipelineName.total * 100) : 0;
    const namePercentLengthwise = stats.pipelineName.totalLength > 0 ? 
      (stats.pipelineName.lengthAvailable / stats.pipelineName.totalLength * 100) : 0;
    const pressurePercentLengthwise = stats.pipelinePressure.totalLength > 0 ? 
      (stats.pipelinePressure.lengthAvailable / stats.pipelinePressure.totalLength * 100) : 0;
    const pressurePercentElementwise = stats.pipelinePressure.total > 0 ? 
      (stats.pipelinePressure.available / stats.pipelinePressure.total * 100) : 0;

    /* Generate HTML content. */
    let content = '';

    /* Line layers statistics section. */
    if (Object.keys(stats.lineLayerStats).length > 0) {
      content += `
      <h3 style="margin-top: 0; color: #495057;">Line Layers</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
        <thead>
          <tr>
            <th style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; text-align: left; font-weight: bold;">Layer Name</th>
            <th style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; text-align: right; font-weight: bold;">Element Count</th>
            <th style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; text-align: right; font-weight: bold;">Total Length (km)</th>
          </tr>
        </thead>
        <tbody>`;
      
      /* Add rows for each line layer. */
      Object.entries(stats.lineLayerStats).forEach(([layerName, layerStats]) => {
        content += `
          <tr>
            <td style="padding: 4px 8px; border: 1px solid #dee2e6; font-weight: bold;">${layerName}</td>
            <td style="padding: 4px 8px; border: 1px solid #dee2e6; text-align: right;">${layerStats.count.toLocaleString('en-US')}</td>
            <td style="padding: 4px 8px; border: 1px solid #dee2e6; text-align: right;">${Math.round(layerStats.totalLength).toLocaleString('en-US')}</td>
          </tr>`;
      });
      
      content += `
        </tbody>
      </table>`;
    }

    /* Define infrastructure items with their counts. */
    const infrastructureItems = [
      { name: 'nodes (base layers)', count: stats.nodesBase || 0 },
      { name: 'nodes (sublayers)', count: stats.nodesSublayer || 0 },
      { name: 'storages', count: stats.storages },
      { name: 'LNG terminals', count: stats.lngTerminals },
      { name: 'power plants', count: stats.powerplants },
      { name: 'compressors', count: stats.compressors },
      { name: 'border points', count: stats.borderpoints },
      { name: 'demands', count: stats.demands },
      { name: 'productions', count: stats.productions },
      { name: 'hydrogen pipes', count: stats.hydrogenPipes },
      { name: 'electrolyzers', count: stats.electrolyzers }
    ];

    /* Filter to show only loaded items (count > 0). */
    const visibleItems = infrastructureItems.filter(item => item.count > 0);

    /* Add infrastructure section only if items are visible. */
    if (visibleItems.length > 0) {
      /* Generate table rows. */
      const tableRows = visibleItems.map(item => `
        <tr>
          <td style="padding: 4px 8px; border: 1px solid #dee2e6; font-weight: bold; background-color: #f8f9fa;">Number of ${item.name}</td>
          <td style="padding: 4px 8px; border: 1px solid #dee2e6; text-align: right;">${item.count}</td>
        </tr>
      `).join('');

      content += `
      <h3 style="color: #495057;">Infrastructure Counts</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
        <tbody>
          ${tableRows}
        </tbody>
      </table>`;
    }

    const nodeLayerEntries = Object.entries(stats.nodeLayerStats || {})
      .filter(([, entry]) => entry && entry.count > 0 && entry.isSublayer)
      .sort((a, b) => a[0].localeCompare(b[0]));

    if (nodeLayerEntries.length > 0) {
      const nodeLayerRows = nodeLayerEntries.map(([layerName, entry]) => `
        <tr>
          <td style="padding: 4px 8px; border: 1px solid #dee2e6; font-weight: bold;">${layerName}</td>
          <td style="padding: 4px 8px; border: 1px solid #dee2e6; text-align: right;">${entry.count}</td>
        </tr>
      `).join('');

      content += `
      <h3 style="color: #495057;">Node Sublayer Breakdown</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
        <thead>
          <tr>
            <th style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; text-align: left; font-weight: bold;">Sublayer</th>
            <th style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; text-align: right; font-weight: bold;">Node Count</th>
          </tr>
        </thead>
        <tbody>
          ${nodeLayerRows}
        </tbody>
      </table>`;
    }

    /* Add pipeline data completeness section only if pipelines are loaded. */
    if (stats.pipelineElements > 0) {
      content += `
      
      <h3 style="color: #495057;">Pipeline Data Completeness</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
        <thead>
          <tr>
            <th style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; text-align: left; font-weight: bold;">Attribute</th>
            <th style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; text-align: center; font-weight: bold;">Lengthwise</th>
            <th style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; text-align: center; font-weight: bold;">Elementwise</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 4px 8px; border: 1px solid #dee2e6; font-weight: bold;">Diameter</td>
            <td style="padding: 4px 8px; border: 1px solid #dee2e6; text-align: center;">${diameterPercentLengthwise.toFixed(1)}%</td>
            <td style="padding: 4px 8px; border: 1px solid #dee2e6; text-align: center;">${diameterPercentElementwise.toFixed(1)}%</td>
          </tr>
          <tr>
            <td style="padding: 4px 8px; border: 1px solid #dee2e6; font-weight: bold;">Name</td>
            <td style="padding: 4px 8px; border: 1px solid #dee2e6; text-align: center;">${namePercentLengthwise.toFixed(1)}%</td>
            <td style="padding: 4px 8px; border: 1px solid #dee2e6; text-align: center;">${namePercent.toFixed(1)}%</td>
          </tr>
          <tr>
            <td style="padding: 4px 8px; border: 1px solid #dee2e6; font-weight: bold;">Maximum Pressure</td>
            <td style="padding: 4px 8px; border: 1px solid #dee2e6; text-align: center;">${pressurePercentLengthwise.toFixed(1)}%</td>
            <td style="padding: 4px 8px; border: 1px solid #dee2e6; text-align: center;">${pressurePercentElementwise.toFixed(1)}%</td>
          </tr>
        </tbody>
      </table>
      
      <h3 style="color: #495057;">Pipeline Data Sources:</h3>
      <div style="margin-bottom: 15px;">
        <div style="display: flex; gap: 20px; align-items: stretch; margin-bottom: 15px;">
          <div style="flex: 1; display: flex; flex-direction: column;">
            <div style="position: relative; flex: 1; min-height: 200px;">
              <canvas id="pipelineSourcesChartElements" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></canvas>
            </div>
            <div style="text-align: center; margin-top: 5px; font-size: 14px; color: #495057; font-weight: bold;">By element count</div>
          </div>
          <div style="flex: 1; display: flex; flex-direction: column;">
            <div style="position: relative; flex: 1; min-height: 200px;">
              <canvas id="pipelineSourcesChartLength" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></canvas>
            </div>
            <div style="text-align: center; margin-top: 5px; font-size: 14px; color: #495057; font-weight: bold;">By length (km)</div>
          </div>
        </div>
        <div id="charts-legend" style="text-align: center; margin-top: 10px;"></div>
      </div>`;
    }

    document.getElementById('statistics-content').innerHTML = content;
    
    /* Create pipeline charts only if pipelines are loaded. */
    if (stats.pipelineElements > 0) {
      /* Destroy existing charts if they exist. */
      const existingChartElements = Chart.getChart('pipelineSourcesChartElements');
      if (existingChartElements) {
        existingChartElements.destroy();
      }
      const existingChartLength = Chart.getChart('pipelineSourcesChartLength');
      if (existingChartLength) {
        existingChartLength.destroy();
      }
      
      /* Create pipeline sources pie charts. */
      const sourceLabels = Object.keys(stats.pipelineSources);
      
      /* Generate colors for the chart; white denotes missing technical attributes. */
      const defaultColors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
        '#FF9F40', '#C9CBCF', '#9966FF', '#4BC0C0', '#FF9F40'
      ];
      
      const backgroundColors = sourceLabels.map((label, index) => 
        label === 'No technical attributes' ? '#FFFFFF' : defaultColors[index % defaultColors.length]
      );
      
      const borderColors = sourceLabels.map((label, index) => 
        label === 'No technical attributes' ? '#CCCCCC' : defaultColors[index % defaultColors.length].replace('0.2', '1')
      );
      
      /* Chart for element count. */
      const ctxElements = document.getElementById('pipelineSourcesChartElements').getContext('2d');
      const sourceDataElements = Object.values(stats.pipelineSourcesByCount);
      
      new Chart(ctxElements, {
        type: 'pie',
        data: {
          labels: sourceLabels,
          datasets: [{
            data: sourceDataElements,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return label + ': ' + value + ' elements (' + percentage + '%)';
                }
              }
            }
          }
        }
      });
      
      /* Chart for length. */
      const ctxLength = document.getElementById('pipelineSourcesChartLength').getContext('2d');
      const sourceDataLength = Object.values(stats.pipelineSources);
      
      new Chart(ctxLength, {
        type: 'pie',
        data: {
          labels: sourceLabels,
          datasets: [{
            data: sourceDataLength,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return label + ': ' + value.toFixed(2) + ' km (' + percentage + '%)';
                }
              }
            }
          }
        }
      });
      
      /* Create shared legend. */
      const legendContainer = document.getElementById('charts-legend');
      legendContainer.innerHTML = '<div style="display: inline-flex; flex-wrap: wrap; justify-content: center; gap: 15px; margin-top: 10px;">';
      
      sourceLabels.forEach((label, index) => {
        const color = label === 'No technical attributes' ? '#FFFFFF' : defaultColors[index % defaultColors.length];
        const borderColor = label === 'No technical attributes' ? '#CCCCCC' : defaultColors[index % defaultColors.length].replace('0.2', '1');
        
        legendContainer.innerHTML += `
          <div style="display: flex; align-items: center; gap: 5px;">
            <div style="width: 12px; height: 12px; background-color: ${color}; border: 1px solid ${borderColor}; border-radius: 2px;"></div>
            <span style="font-size: 11px; color: #495057;">${label}</span>
          </div>
        `;
      });
      
      legendContainer.innerHTML += '</div>';
    }
  }

