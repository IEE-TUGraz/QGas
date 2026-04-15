/**
 * ================================================================================
 * QGas - Topology Check Tool
 * ================================================================================
 *
 * Analyzes network connectivity to identify unconnected nodes, unconnected lines,
 * and disconnected network islands. Provides clickable results that focus the map
 * on the selected element or isolate a specific network component.
 *
 * Development Information:
 * - Authors: Marco Quantschnig, Yannick Werner, Sonja Wogrin and Thomas Klatzer
 * - Institution: Institute of Electricity Economics and Energy Innovation (IEE), Graz University of Technology, Inffeldgasse 18, Graz, 8010, Austria
 * - Created: March 2026
 * - License: See LICENSE file
 * - Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Public API:
 * - activateTopologyCheckTool(): Run topology analysis and open results popup.
 *
 * ================================================================================
 */

(function () {
  const topologyState = {
    hiddenMarkers: new Map(),
    hiddenLines: new Map(),
    filterActive: false,
    results: null
  };

  function normalizeId(value) {
    if (value === null || typeof value === 'undefined') return '';
    return String(value).trim().toLowerCase();
  }

  function escapeHtml(value) {
    if (value === null || typeof value === 'undefined') return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getNodeId(marker) {
    const props = marker?.feature?.properties || {};
    return props.ID || props.Id || props.id || props.Name || props.name || '';
  }

  function getPropertyValueCaseInsensitive(props, keys) {
    if (!props || !keys || !keys.length) return '';
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(props, key)) {
        const value = props[key];
        if (value !== undefined && value !== null && String(value).trim()) {
          return String(value).trim();
        }
      }
    }
    return '';
  }

  function collectLineLayerGroups() {
    const groups = [];
    const seen = new Set();
    const add = (layer) => {
      if (!layer || seen.has(layer)) return;
      seen.add(layer);
      groups.push(layer);
    };

    try {
      const discovered = (typeof getAllLineLayers === 'function') ? getAllLineLayers() : [];
      discovered.forEach(add);
    } catch (e) {}

    [
      window.pipelineLayer,
      window.estimatedPipelinesLayer,
      window.shortPipeLayer,
      window.hydrogenPipeLayer,
      window.drawnItems
    ].forEach(add);

    if (window.dynamicLayers) {
      Object.values(window.dynamicLayers).forEach(layer => {
        const hint = (typeof getLayerGeometryClassHint === 'function' ? getLayerGeometryClassHint(layer) : '').toLowerCase();
        if (hint === 'line') add(layer);
      });
    }

    if (window.customLayers) {
      Object.values(window.customLayers).forEach(layer => {
        const hint = (typeof getLayerGeometryClassHint === 'function' ? getLayerGeometryClassHint(layer) : '').toLowerCase();
        if (hint === 'line') add(layer);
      });
    }

    return groups;
  }

  function collectInlineLayerGroups() {
    if (typeof getAllInlineLayers === 'function') {
      try {
        return getAllInlineLayers() || [];
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  function traverseLineLayers(groups, callback) {
    if (!Array.isArray(groups) || typeof callback !== 'function') return;
    groups.forEach(group => {
      if (!group) return;
      if (typeof forEachPolylineFeature === 'function') {
        forEachPolylineFeature(group, layer => callback(layer, group));
        return;
      }
      if (typeof group.eachLayer === 'function') {
        group.eachLayer(layer => {
          if (!layer?.feature?.geometry) return;
          const geomType = layer.feature.geometry.type;
          if (geomType !== 'LineString' && geomType !== 'MultiLineString') return;
          callback(layer, group);
        });
      }
    });
  }

  function traversePointLayers(groups, callback) {
    if (!Array.isArray(groups) || typeof callback !== 'function') return;
    groups.forEach(group => {
      if (!group || typeof group.eachLayer !== 'function') return;
      group.eachLayer(layer => {
        if (!layer?.feature?.geometry) return;
        const geomType = layer.feature.geometry.type;
        if (geomType !== 'Point' && geomType !== 'MultiPoint') return;
        callback(layer, group);
      });
    });
  }

  function buildTopologyAnalysis() {
    const nodeMap = new Map();
    const nodeList = [];
    const lineList = [];
    const lineMap = new Map();
    const unconnectedLines = [];
    const referencedNodes = new Set();
    const adjacency = new Map();

    const startKeys = Array.isArray(window.START_NODE_KEYS) ? window.START_NODE_KEYS : ['Start_Node', 'start_node', 'StartNode', 'startnode', 'START_NODE'];
    const endKeys = Array.isArray(window.END_NODE_KEYS) ? window.END_NODE_KEYS : ['End_Node', 'end_node', 'EndNode', 'endnode', 'END_NODE'];

    forEachNodeMarker(marker => {
      const id = getNodeId(marker);
      if (!id) return;
      const normId = normalizeId(id);
      if (!normId) return;
      if (!nodeMap.has(normId)) {
        const layerName = (typeof getLayerGroupDisplayName === 'function') ? getLayerGroupDisplayName(marker._parentNodeLayer) : '';
        const entry = { id, normId, marker, layerName };
        nodeMap.set(normId, entry);
        nodeList.push(entry);
      }
    });

    const lineGroups = collectLineLayerGroups();
    const inlineGroups = collectInlineLayerGroups();
    let lineIndex = 1;
    traverseLineLayers(lineGroups, (layer, group) => {
      const props = layer?.feature?.properties || {};
      const id = props.ID || props.Id || props.id || props.Name || props.name || `Line ${lineIndex}`;
      const startIdRaw = getPropertyValueCaseInsensitive(props, startKeys);
      const endIdRaw = getPropertyValueCaseInsensitive(props, endKeys);
      const nodeIdRaw = getPropertyValueCaseInsensitive(props, ['Node', 'node', 'NODE']);
      const startNorm = normalizeId(startIdRaw);
      const endNorm = normalizeId(endIdRaw);
      const nodeNorm = normalizeId(nodeIdRaw);
      if (startNorm) referencedNodes.add(startNorm);
      if (endNorm) referencedNodes.add(endNorm);
      if (nodeNorm) referencedNodes.add(nodeNorm);

      const hasStart = startNorm && nodeMap.has(startNorm);
      const hasEnd = endNorm && nodeMap.has(endNorm);
      const hasNode = nodeNorm && nodeMap.has(nodeNorm);
      const isConnected = Boolean(hasStart && hasEnd);

      const key = `line-${lineIndex}`;
      const layerName = (typeof getLayerGroupDisplayName === 'function') ? getLayerGroupDisplayName(group) : '';
      const label = `${id}`;
      const lineEntry = {
        key,
        id,
        label,
        layer,
        group,
        layerName,
        startIdRaw,
        endIdRaw,
        nodeIdRaw,
        startNorm,
        endNorm,
        nodeNorm,
        isConnected,
        isInline: false
      };

      lineList.push(lineEntry);
      lineMap.set(key, lineEntry);

      if (!isConnected) {
        const reasons = [];
        if (!startIdRaw) {
          reasons.push('missing start node');
        } else if (!hasStart) {
          reasons.push(`start node not found: ${startIdRaw}`);
        }
        if (!endIdRaw) {
          reasons.push('missing end node');
        } else if (!hasEnd) {
          reasons.push(`end node not found: ${endIdRaw}`);
        }
        unconnectedLines.push({
          key,
          label,
          layerName,
          reason: reasons.join(', ') || 'missing node connection'
        });
      } else {
        if (!adjacency.has(startNorm)) adjacency.set(startNorm, new Set());
        if (!adjacency.has(endNorm)) adjacency.set(endNorm, new Set());
        adjacency.get(startNorm).add(endNorm);
        adjacency.get(endNorm).add(startNorm);
      }

      lineIndex += 1;
    });

    const inlineLayerSet = new Set();

    const addInlineEntry = (marker, group) => {
      const props = marker?.feature?.properties || {};
      const id = props.ID || props.Id || props.id || props.Name || props.name || `Inline ${lineIndex}`;
      const startIdRaw = getPropertyValueCaseInsensitive(props, startKeys);
      const endIdRaw = getPropertyValueCaseInsensitive(props, endKeys);
      const subStartIdRaw = getPropertyValueCaseInsensitive(props, ['SubNode_A', 'Subnode_A', 'SubNodeA', 'SubnodeA', 'Sub_Node_A', 'subnode_a', 'sub_node_a']);
      const subEndIdRaw = getPropertyValueCaseInsensitive(props, ['SubNode_B', 'Subnode_B', 'SubNodeB', 'SubnodeB', 'Sub_Node_B', 'subnode_b', 'sub_node_b']);
      const nodeIdRaw = getPropertyValueCaseInsensitive(props, ['Node', 'node', 'NODE']);
      const startNorm = normalizeId(startIdRaw);
      const endNorm = normalizeId(endIdRaw);
      const subStartNorm = normalizeId(subStartIdRaw);
      const subEndNorm = normalizeId(subEndIdRaw);
      const nodeNorm = normalizeId(nodeIdRaw);

      const hasStart = startNorm && nodeMap.has(startNorm);
      const hasEnd = endNorm && nodeMap.has(endNorm);
      const hasNode = nodeNorm && nodeMap.has(nodeNorm);

      let effectiveStartRaw = startIdRaw;
      let effectiveEndRaw = endIdRaw;
      let effectiveStartNorm = startNorm;
      let effectiveEndNorm = endNorm;

      if (subStartIdRaw || subEndIdRaw) {
        effectiveStartRaw = subStartIdRaw;
        effectiveEndRaw = subEndIdRaw;
        effectiveStartNorm = subStartNorm;
        effectiveEndNorm = subEndNorm;
      }

      const effectiveHasStart = effectiveStartNorm && nodeMap.has(effectiveStartNorm);
      const effectiveHasEnd = effectiveEndNorm && nodeMap.has(effectiveEndNorm);

      if (effectiveStartNorm) referencedNodes.add(effectiveStartNorm);
      if (effectiveEndNorm) referencedNodes.add(effectiveEndNorm);
      if (nodeNorm) referencedNodes.add(nodeNorm);

      const isConnected = Boolean((effectiveHasStart && effectiveHasEnd) || hasNode);

      const key = `inline-${lineIndex}`;
      const layerName = (typeof getLayerGroupDisplayName === 'function') ? getLayerGroupDisplayName(group) : '';
      const label = `${id}`;
      const lineEntry = {
        key,
        id,
        label,
        marker,
        layer: marker,
        group,
        layerName,
        startIdRaw: effectiveStartRaw,
        endIdRaw: effectiveEndRaw,
        nodeIdRaw,
        startNorm: effectiveStartNorm,
        endNorm: effectiveEndNorm,
        nodeNorm,
        isConnected,
        isInline: true
      };

      lineList.push(lineEntry);
      lineMap.set(key, lineEntry);

      if (!isConnected) {
        const reasons = [];
        if (!effectiveStartRaw && !effectiveEndRaw && !nodeIdRaw) {
          reasons.push('missing node reference');
        } else {
          if (effectiveStartRaw && !effectiveHasStart) reasons.push(`start node not found: ${effectiveStartRaw}`);
          if (effectiveEndRaw && !effectiveHasEnd) reasons.push(`end node not found: ${effectiveEndRaw}`);
          if (nodeIdRaw && !hasNode) reasons.push(`node not found: ${nodeIdRaw}`);
        }
        unconnectedLines.push({
          key,
          label,
          layerName,
          reason: reasons.join(', ') || 'missing node connection'
        });
      } else if (effectiveHasStart && effectiveHasEnd) {
        if (!adjacency.has(effectiveStartNorm)) adjacency.set(effectiveStartNorm, new Set());
        if (!adjacency.has(effectiveEndNorm)) adjacency.set(effectiveEndNorm, new Set());
        adjacency.get(effectiveStartNorm).add(effectiveEndNorm);
        adjacency.get(effectiveEndNorm).add(effectiveStartNorm);
      }

      lineIndex += 1;
    };

    inlineGroups.forEach(group => {
      if (!group || typeof group.eachLayer !== 'function') return;
      group.eachLayer(marker => {
        inlineLayerSet.add(marker);
        addInlineEntry(marker, group);
      });
    });

    const isInlineCandidate = (props) => {
      if (!props) return false;
      if (getPropertyValueCaseInsensitive(props, startKeys) || getPropertyValueCaseInsensitive(props, endKeys)) return true;
      if (getPropertyValueCaseInsensitive(props, ['SubNode_A', 'Subnode_A', 'SubNodeA', 'SubnodeA', 'Sub_Node_A', 'subnode_a', 'sub_node_a'])) return true;
      if (getPropertyValueCaseInsensitive(props, ['SubNode_B', 'Subnode_B', 'SubNodeB', 'SubnodeB', 'Sub_Node_B', 'subnode_b', 'sub_node_b'])) return true;
      if (getPropertyValueCaseInsensitive(props, ['Node', 'node', 'NODE'])) return true;
      const typeValue = String(props.Type || props.type || '').toLowerCase();
      return typeValue.includes('inline') || typeValue.includes('in-line');
    };

    traversePointLayers(lineGroups, (marker, group) => {
      if (inlineLayerSet.has(marker)) return;
      const props = marker?.feature?.properties || {};
      if (!isInlineCandidate(props)) return;
      inlineLayerSet.add(marker);
      addInlineEntry(marker, group);
    });

    const unconnectedNodes = nodeList
      .filter(entry => !referencedNodes.has(entry.normId))
      .map(entry => ({ id: entry.id, normId: entry.normId, layerName: entry.layerName, marker: entry.marker }));

    const networks = [];
    const visited = new Set();

    adjacency.forEach((_, nodeId) => {
      if (visited.has(nodeId)) return;
      const queue = [nodeId];
      const component = new Set();
      visited.add(nodeId);

      while (queue.length) {
        const current = queue.shift();
        component.add(current);
        const neighbors = adjacency.get(current) || new Set();
        neighbors.forEach(next => {
          if (!visited.has(next)) {
            visited.add(next);
            queue.push(next);
          }
        });
      }

      if (component.size) {
        const lineKeys = new Set();
        lineList.forEach(lineEntry => {
          if (!lineEntry.isConnected) return;
          if (lineEntry.isInline) {
            if (lineEntry.nodeNorm && component.has(lineEntry.nodeNorm)) {
              lineKeys.add(lineEntry.key);
              return;
            }
          }
          if (lineEntry.startNorm && lineEntry.endNorm && component.has(lineEntry.startNorm) && component.has(lineEntry.endNorm)) {
            lineKeys.add(lineEntry.key);
          }
        });
        networks.push({
          nodeIds: component,
          lineKeys,
          nodeCount: component.size,
          lineCount: lineKeys.size
        });
      }
    });

    return {
      nodeMap,
      nodeList,
      lineList,
      lineMap,
      unconnectedNodes,
      unconnectedLines,
      networks
    };
  }

  function snapshotMarkerStyle(marker) {
    if (!marker) return null;
    if (typeof marker.getLatLng === 'function' && typeof marker.setStyle === 'function') {
      if (typeof captureOriginalMarkerStyle === 'function' && !marker._defaultMarkerStyle) {
        captureOriginalMarkerStyle(marker, 'default');
      }
      const style = marker._defaultMarkerStyle || {
        color: marker.options?.color,
        weight: marker.options?.weight,
        fillColor: marker.options?.fillColor,
        fillOpacity: marker.options?.fillOpacity,
        opacity: marker.options?.opacity,
        radius: marker.options?.radius
      };
      return { type: 'circle', style };
    }
    if (typeof marker.setOpacity === 'function') {
      return { type: 'marker', opacity: marker.options?.opacity ?? 1 };
    }
    return null;
  }

  function hideMarker(marker) {
    if (!marker || topologyState.hiddenMarkers.has(marker)) return;
    const snapshot = snapshotMarkerStyle(marker);
    if (snapshot) topologyState.hiddenMarkers.set(marker, snapshot);
    if (typeof marker.setStyle === 'function') {
      marker.setStyle({ opacity: 0, fillOpacity: 0 });
    } else if (typeof marker.setOpacity === 'function') {
      marker.setOpacity(0);
    }
  }

  function restoreMarker(marker) {
    const snapshot = topologyState.hiddenMarkers.get(marker);
    if (!snapshot) return;
    if (snapshot.type === 'circle' && typeof marker.setStyle === 'function') {
      marker.setStyle(snapshot.style);
      if (typeof marker.setRadius === 'function' && snapshot.style?.radius !== undefined) {
        marker.setRadius(snapshot.style.radius);
      }
    } else if (snapshot.type === 'marker' && typeof marker.setOpacity === 'function') {
      marker.setOpacity(snapshot.opacity);
    }
    topologyState.hiddenMarkers.delete(marker);
  }

  function snapshotLineStyle(layer) {
    if (!layer) return null;
    if (typeof getPathStyleSnapshot === 'function') {
      return getPathStyleSnapshot(layer);
    }
    const opts = layer.options || {};
    return {
      color: opts.color || layer._originalColor || '#3388ff',
      weight: typeof opts.weight === 'number' ? opts.weight : (layer._originalWeight ?? 3),
      opacity: typeof opts.opacity === 'number' ? opts.opacity : (layer._originalOpacity ?? 0.8),
      dashArray: Object.prototype.hasOwnProperty.call(opts, 'dashArray') ? opts.dashArray : (layer._originalDashArray ?? null)
    };
  }

  function hideLine(layer) {
    if (!layer || topologyState.hiddenLines.has(layer)) return;
    const snapshot = snapshotLineStyle(layer);
    topologyState.hiddenLines.set(layer, snapshot);
    if (typeof layer.setStyle === 'function') {
      layer.setStyle({ opacity: 0, weight: 0, dashArray: null, color: 'transparent' });
    }
    if (layer._path) {
      layer._path.style.opacity = '0';
      layer._path.style.stroke = 'transparent';
      layer._path.style.strokeWidth = '0px';
    }
    if (layer._clickLayer && layer._clickLayer.getLayers) {
      const clickLayer = layer._clickLayer.getLayers()[0];
      if (clickLayer?.setStyle) {
        clickLayer.setStyle({ opacity: 0, weight: 0, color: 'transparent' });
      }
    }
  }

  function restoreLine(layer) {
    const snapshot = topologyState.hiddenLines.get(layer);
    if (!snapshot) return;
    if (typeof layer.setStyle === 'function') {
      layer.setStyle(snapshot);
    }
    if (typeof syncPathStyle === 'function') {
      syncPathStyle(layer, snapshot);
    }
    if (layer._path) {
      layer._path.style.opacity = String(snapshot.opacity ?? 0.8);
      layer._path.style.stroke = snapshot.color || '#3388ff';
      layer._path.style.strokeWidth = `${snapshot.weight ?? 3}px`;
      layer._path.style.strokeDasharray = snapshot.dashArray ? snapshot.dashArray : '';
    }
    if (layer._clickLayer && layer._clickLayer.getLayers) {
      const clickLayer = layer._clickLayer.getLayers()[0];
      if (clickLayer?.setStyle) {
        clickLayer.setStyle({ color: 'transparent', weight: 12, opacity: 0, dashArray: null });
      }
    }
    topologyState.hiddenLines.delete(layer);
  }

  function clearTopologyNetworkFilter() {
    if (!topologyState.filterActive) return;
    topologyState.hiddenMarkers.forEach((_, marker) => restoreMarker(marker));
    topologyState.hiddenLines.forEach((_, layer) => restoreLine(layer));
    topologyState.hiddenMarkers.clear();
    topologyState.hiddenLines.clear();
    topologyState.filterActive = false;
  }

  function focusNode(entry) {
    if (!entry || !entry.marker || !topologyState.results) return;
    clearTopologyNetworkFilter();
    resetAllPipelineHighlights();
    resetAllElementHighlights();

    const { nodeList, lineList } = topologyState.results;
    nodeList.forEach(node => {
      if (node.marker !== entry.marker) {
        hideMarker(node.marker);
      }
    });
    lineList.forEach(lineEntry => {
      if (lineEntry.isInline) {
        if (lineEntry.layer !== entry.marker) {
          hideMarker(lineEntry.layer);
        }
      } else {
        hideLine(lineEntry.layer);
      }
    });
    topologyState.filterActive = true;

    highlightElement(entry.marker);
    if (typeof entry.marker.bringToFront === 'function') {
      entry.marker.bringToFront();
    }
    const latlng = entry.marker.getLatLng ? entry.marker.getLatLng() : null;
    if (latlng && window.map) {
      window.map.setView(latlng, Math.max(window.map.getZoom(), 10), { animate: true });
    }
  }

  function focusLine(entry) {
    if (!entry || !entry.layer || !topologyState.results) return;
    clearTopologyNetworkFilter();
    resetAllPipelineHighlights();
    resetAllElementHighlights();

    const { nodeList, lineList } = topologyState.results;
    nodeList.forEach(node => hideMarker(node.marker));
    lineList.forEach(lineEntry => {
      if (lineEntry.key === entry.key) return;
      if (lineEntry.isInline) {
        hideMarker(lineEntry.layer);
      } else {
        hideLine(lineEntry.layer);
      }
    });
    topologyState.filterActive = true;

    if (entry.isInline) {
      highlightElement(entry.layer);
      if (typeof entry.layer.bringToFront === 'function') {
        entry.layer.bringToFront();
      }
      const latlng = entry.layer.getLatLng ? entry.layer.getLatLng() : null;
      if (latlng && window.map) {
        window.map.setView(latlng, Math.max(window.map.getZoom(), 10), { animate: true });
      }
      return;
    }
    highlightPipeline(entry.layer);
    if (typeof entry.layer.bringToFront === 'function') {
      entry.layer.bringToFront();
    }
    if (entry.layer.getBounds && window.map) {
      window.map.fitBounds(entry.layer.getBounds(), { padding: [30, 30] });
    }
  }

  function applyNetworkFilter(network) {
    if (!network || !topologyState.results) return;
    clearTopologyNetworkFilter();
    const { nodeList, lineList } = topologyState.results;

    nodeList.forEach(node => {
      if (!network.nodeIds.has(node.normId)) {
        hideMarker(node.marker);
      }
    });

    lineList.forEach(lineEntry => {
      if (!network.lineKeys.has(lineEntry.key)) {
        if (lineEntry.isInline) {
          hideMarker(lineEntry.layer);
        } else {
          hideLine(lineEntry.layer);
        }
      }
    });

    topologyState.filterActive = true;

    const bounds = window.L?.latLngBounds ? window.L.latLngBounds([]) : null;
    if (bounds) {
      nodeList.forEach(node => {
        if (network.nodeIds.has(node.normId) && node.marker?.getLatLng) {
          bounds.extend(node.marker.getLatLng());
        }
      });
      lineList.forEach(lineEntry => {
        if (!network.lineKeys.has(lineEntry.key)) return;
        if (lineEntry.isInline && lineEntry.layer?.getLatLng) {
          bounds.extend(lineEntry.layer.getLatLng());
          return;
        }
        if (lineEntry.layer?.getBounds) {
          bounds.extend(lineEntry.layer.getBounds());
        }
      });
      if (bounds.isValid() && window.map) {
        window.map.fitBounds(bounds, { padding: [35, 35] });
      }
    }
  }

  function renderTopologyPopup(results) {
    const summaryHtml = `
      <div style="display:grid; gap:10px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); margin-bottom: 12px;">
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; text-align:center;">
          <div style="font-size:12px; color:#64748b;">Unconnected Nodes</div>
          <div style="font-size:18px; font-weight:700; color:#0f172a;">${results.unconnectedNodes.length}</div>
        </div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; text-align:center;">
          <div style="font-size:12px; color:#64748b;">Unconnected Lines</div>
          <div style="font-size:18px; font-weight:700; color:#0f172a;">${results.unconnectedLines.length}</div>
        </div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; text-align:center;">
          <div style="font-size:12px; color:#64748b;">Networks</div>
          <div style="font-size:18px; font-weight:700; color:#0f172a;">${results.networks.length}</div>
        </div>
      </div>
    `;

    const nodeItems = results.unconnectedNodes.map(node => {
      const subtitle = node.layerName ? `<div style="font-size:12px; color:#64748b;">${escapeHtml(node.layerName)}</div>` : '';
      return `
        <button class="topology-item" data-type="node" data-id="${escapeHtml(node.normId)}" style="width:100%; text-align:left; padding:8px 10px; border:1px solid #e2e8f0; background:#fff; border-radius:6px; cursor:pointer; margin-bottom:6px;">
          <div style="font-weight:600; color:#1f2937;">${escapeHtml(node.id)}</div>
          ${subtitle}
        </button>
      `;
    }).join('');

    const lineItems = results.unconnectedLines.map(line => {
      const subtitle = line.layerName ? `${line.layerName} · ${line.reason}` : line.reason;
      return `
        <button class="topology-item" data-type="line" data-id="${escapeHtml(line.key)}" style="width:100%; text-align:left; padding:8px 10px; border:1px solid #e2e8f0; background:#fff; border-radius:6px; cursor:pointer; margin-bottom:6px;">
          <div style="font-weight:600; color:#1f2937;">${escapeHtml(line.label)}</div>
          <div style="font-size:12px; color:#64748b;">${escapeHtml(subtitle)}</div>
        </button>
      `;
    }).join('');

    const networkItems = results.networks.map((network, index) => {
      const label = `Network ${index + 1}`;
      const subtitle = `${network.nodeCount} nodes · ${network.lineCount} lines`;
      return `
        <button class="topology-item" data-type="network" data-id="${index}" style="width:100%; text-align:left; padding:8px 10px; border:1px solid #e2e8f0; background:#fff; border-radius:6px; cursor:pointer; margin-bottom:6px;">
          <div style="font-weight:600; color:#1f2937;">${escapeHtml(label)}</div>
          <div style="font-size:12px; color:#64748b;">${escapeHtml(subtitle)}</div>
        </button>
      `;
    }).join('');

    const content = `
      ${summaryHtml}
      <div style="margin-bottom: 14px;">
        <h4 style="margin: 0 0 8px; font-size: 14px; color:#1f2937;">Unconnected Nodes</h4>
        ${nodeItems || '<div style="font-size:13px; color:#64748b;">No unconnected nodes found.</div>'}
      </div>
      <div style="margin-bottom: 14px;">
        <h4 style="margin: 0 0 8px; font-size: 14px; color:#1f2937;">Unconnected Lines</h4>
        ${lineItems || '<div style="font-size:13px; color:#64748b;">No unconnected lines found.</div>'}
      </div>
      <div>
        <h4 style="margin: 0 0 8px; font-size: 14px; color:#1f2937;">Networks</h4>
        ${networkItems || '<div style="font-size:13px; color:#64748b;">No connected networks found.</div>'}
      </div>
    `;

    showCustomPopup(
      '🧭 Topology Check',
      content,
      [
        { text: 'Refresh', type: 'secondary', keepOpen: true, onClick: () => { closeCustomPopup(); activateTopologyCheckTool(); } },
        { text: 'Show All', type: 'secondary', keepOpen: true, onClick: () => clearTopologyNetworkFilter() },
        { text: 'Close', type: 'primary', onClick: () => { clearTopologyNetworkFilter(); } }
      ]
    );

    if (typeof dockCustomPopupBottomRight === 'function') {
      dockCustomPopupBottomRight();
    }

    setTimeout(() => bindTopologyHandlers(results), 0);
  }

  function bindTopologyHandlers(results) {
    const container = document.getElementById('custom-popup-content');
    if (!container) return;
    container.querySelectorAll('.topology-item').forEach(item => {
      item.addEventListener('click', () => {
        const type = item.getAttribute('data-type');
        const id = item.getAttribute('data-id');
        if (type === 'node') {
          const entry = results.nodeMap.get(String(id));
          focusNode(entry);
        } else if (type === 'line') {
          const entry = results.lineMap.get(String(id));
          focusLine(entry);
        } else if (type === 'network') {
          const index = parseInt(id, 10);
          const network = results.networks[index];
          applyNetworkFilter(network);
        }
      });
    });
  }

  /**
   * Run the network topology analysis and display results.
   *
   * Resets all active editing modes, performs a full topological analysis
   * of the loaded node and line layers (via {@link buildTopologyAnalysis}),
   * and renders the results in a popup. The analysis identifies:
   * (a) isolated nodes not connected to any pipeline,
   * (b) pipelines not connected at either endpoint to a node,
   * (c) disconnected network sub-graphs (islands). Each result entry is
   * clickable and pans/zooms the map to the offending element.
   *
   * @returns {void}
   */
  function activateTopologyCheckTool() {
    try {
      deactivateAllModes();
      currentMode = 'info';
      if (typeof activateInfoMode === 'function') {
        activateInfoMode(true);
      }
    } catch (error) {
      console.warn('Topology check could not reset modes:', error);
    }

    const results = buildTopologyAnalysis();
    topologyState.results = results;

    if (!results.nodeList.length && !results.lineList.length) {
      showInfoPopup('No node or line layers are currently loaded.', '🧭 Topology Check');
      return;
    }

    renderTopologyPopup(results);
  }

  window.activateTopologyCheckTool = activateTopologyCheckTool;
})();
