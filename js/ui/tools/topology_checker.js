/**
 * ================================================================================
 * QGas - Topology Checker Tool
 * ================================================================================
 *
 * Analyzes active network references, geometry, IDs, connectivity, and disconnected
 * network islands. With an active country filter, the analysis is restricted to the
 * filtered subnetwork using the same pipeline/point country rules as the Filter UI.
 * Compressors and other two-terminal in-line elements act as network edges, while
 * decorative helper layers are ignored. Results can focus individual issues or
 * isolate a connected network component without modifying the dataset.
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
    hiddenElements: new Map(),
    detachedPointLayers: new Map(),
    filterActive: false,
    results: null,
    analysisRunId: 0
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
    return props.ID || props.id || '';
  }

  function isActiveTopologyLayer(layer) {
    return Boolean(layer && typeof map !== 'undefined' && typeof map.hasLayer === 'function' && map.hasLayer(layer));
  }

  function getActiveTopologyCountryFilter() {
    try {
      return (selectedCountries instanceof Set && selectedCountries.size > 0)
        ? selectedCountries
        : null;
    } catch (e) {
      return null;
    }
  }

  function matchesTopologyCountryFilter(feature, geometryType, selectedCountryCodes) {
    if (!selectedCountryCodes) return true;
    const isLine = geometryType === 'LineString' || geometryType === 'MultiLineString';
    if (isLine && typeof shouldShowPipeline === 'function') {
      return shouldShowPipeline(feature, selectedCountryCodes);
    }
    if (!isLine && typeof shouldShowElement === 'function') {
      return shouldShowElement(feature, selectedCountryCodes);
    }
    return true;
  }

  function collectLayerTreeMembers(root) {
    const members = new Set();
    const visit = layer => {
      if (!layer || members.has(layer)) return;
      members.add(layer);
      if (typeof layer.eachLayer === 'function') layer.eachLayer(visit);
    };
    visit(root);
    return members;
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
    const groups = [];
    const seen = new Set();
    const add = layer => {
      if (!layer || seen.has(layer)) return;
      seen.add(layer);
      groups.push(layer);
    };

    if (typeof getAllInlineLayers === 'function') {
      try {
        (getAllInlineLayers() || []).forEach(add);
      } catch (e) {
        /* Fall through to the explicitly registered compressor layer. */
      }
    }

    /* Distributed compressors are stored in the active compressor group and
     * act as inline edges between their A/B terminal nodes. This reference is
     * deliberately resolved directly because core layer variables use global
     * lexical bindings and therefore are not necessarily properties of window. */
    try {
      if (typeof compressorsLayer !== 'undefined') add(compressorsLayer);
    } catch (e) {}
    add(window.compressorsLayer);

    return groups;
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
    const selfLoops = [];
    const diagnosticMap = new Map();
    const referencedNodes = new Set();
    const adjacency = new Map();
    const activeCountryFilter = getActiveTopologyCountryFilter();
    let filteredNodeMembers = new Set();
    if (activeCountryFilter) {
      try {
        if (typeof nodeLayer !== 'undefined') filteredNodeMembers = collectLayerTreeMembers(nodeLayer);
      } catch (e) {}
    }

    const startKeys = Array.isArray(window.START_NODE_KEYS) ? window.START_NODE_KEYS : ['node_start'];
    const endKeys = Array.isArray(window.END_NODE_KEYS) ? window.END_NODE_KEYS : ['node_end'];

    forEachNodeMarker(marker => {
      if (!isActiveTopologyLayer(marker)) return;
      if (activeCountryFilter && !filteredNodeMembers.has(marker) &&
          !matchesTopologyCountryFilter(marker?.feature, marker?.feature?.geometry?.type, activeCountryFilter)) return;
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
    const analyzedLineLayers = new Set();
    let lineIndex = 1;
    traverseLineLayers(lineGroups, (layer, group) => {
      if (!isActiveTopologyLayer(layer)) return;
      if (!matchesTopologyCountryFilter(layer?.feature, layer?.feature?.geometry?.type, activeCountryFilter)) return;
      if (analyzedLineLayers.has(layer)) return;
      analyzedLineLayers.add(layer);
      const props = layer?.feature?.properties || {};
      const id = props.id || props.name || `Line ${lineIndex}`;
      const startIdRaw = getPropertyValueCaseInsensitive(props, startKeys);
      const endIdRaw = getPropertyValueCaseInsensitive(props, endKeys);
      const nodeIdRaw = getPropertyValueCaseInsensitive(props, ['node']);
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

      if (startNorm && endNorm && startNorm === endNorm) {
        selfLoops.push({
          key,
          label,
          layerName,
          reason: `node_start and node_end both reference ${startIdRaw}`
        });
      }

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
      const id = props.id || props.name || `Inline ${lineIndex}`;
      const startIdRaw = getPropertyValueCaseInsensitive(props, startKeys);
      const endIdRaw = getPropertyValueCaseInsensitive(props, endKeys);
      const subStartIdRaw = getPropertyValueCaseInsensitive(props, ['SubNode_A', 'Subnode_A', 'SubNodeA', 'SubnodeA', 'Sub_Node_A', 'subnode_a', 'sub_node_a']);
      const subEndIdRaw = getPropertyValueCaseInsensitive(props, ['SubNode_B', 'Subnode_B', 'SubNodeB', 'SubnodeB', 'Sub_Node_B', 'subnode_b', 'sub_node_b']);
      const nodeIdRaw = getPropertyValueCaseInsensitive(props, ['node']);
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
        const geometryType = marker?.feature?.geometry?.type;
        if (geometryType !== 'Point' && geometryType !== 'MultiPoint') return;
        if (!isActiveTopologyLayer(marker)) return;
        if (!matchesTopologyCountryFilter(marker.feature, geometryType, activeCountryFilter)) return;
        inlineLayerSet.add(marker);
        addInlineEntry(marker, group);
      });
    });

    const isInlineCandidate = (props) => {
      if (!props) return false;
      if (getPropertyValueCaseInsensitive(props, startKeys) || getPropertyValueCaseInsensitive(props, endKeys)) return true;
      if (getPropertyValueCaseInsensitive(props, ['SubNode_A', 'Subnode_A', 'SubNodeA', 'SubnodeA', 'Sub_Node_A', 'subnode_a', 'sub_node_a'])) return true;
      if (getPropertyValueCaseInsensitive(props, ['SubNode_B', 'Subnode_B', 'SubNodeB', 'SubnodeB', 'Sub_Node_B', 'subnode_b', 'sub_node_b'])) return true;
      if (getPropertyValueCaseInsensitive(props, ['node'])) return true;
      const typeValue = String(props.Type || props.type || '').toLowerCase();
      return typeValue.includes('inline') || typeValue.includes('in-line');
    };

    traversePointLayers(lineGroups, (marker, group) => {
      if (inlineLayerSet.has(marker)) return;
      if (!isActiveTopologyLayer(marker)) return;
      if (!matchesTopologyCountryFilter(marker?.feature, marker?.feature?.geometry?.type, activeCountryFilter)) return;
      const props = marker?.feature?.properties || {};
      if (!isInlineCandidate(props)) return;
      inlineLayerSet.add(marker);
      addInlineEntry(marker, group);
    });

    const featureEntries = collectVisibleFeatureLayers().filter(entry => {
      if (!activeCountryFilter) return true;
      if (filteredNodeMembers.has(entry.layer)) return true;
      return matchesTopologyCountryFilter(
        entry.layer?.feature,
        entry.geometryType,
        activeCountryFilter
      );
    });
    const danglingReferences = [];
    const idOccurrences = new Map();
    const diagnosticByLayer = new Map();
    let diagnosticIndex = 1;

    featureEntries.forEach(entry => {
      const props = entry.properties;
      const featureId = String(props.ID ?? props.id ?? '').trim();
      const label = featureId || props.name || `Feature ${diagnosticIndex}`;
      const diagnosticKey = `feature-${diagnosticIndex++}`;
      const diagnosticEntry = { ...entry, key: diagnosticKey, label };
      diagnosticMap.set(diagnosticKey, diagnosticEntry);
      diagnosticByLayer.set(entry.layer, diagnosticEntry);

      if (featureId) {
        const normalizedFeatureId = normalizeId(featureId);
        if (!idOccurrences.has(normalizedFeatureId)) idOccurrences.set(normalizedFeatureId, []);
        idOccurrences.get(normalizedFeatureId).push(diagnosticEntry);
      }

      const isNodeFeature = nodeList.some(node => node.marker === entry.layer);
      let referenceFields = ['node', 'node_start', 'node_end'].filter(field =>
        Object.prototype.hasOwnProperty.call(props, field)
      );
      if (entry.geometryType === 'LineString' || entry.geometryType === 'MultiLineString') {
        referenceFields = ['node_start', 'node_end'];
      } else if ((entry.geometryType === 'Point' || entry.geometryType === 'MultiPoint') && !isNodeFeature) {
        referenceFields = ('node_start' in props || 'node_end' in props)
          ? ['node_start', 'node_end']
          : ['node'];
      }

      referenceFields.forEach(field => {
        const rawValue = props[field];
        const normalizedReference = normalizeId(rawValue);
        let reason = '';
        if (!normalizedReference) {
          reason = `${field} is empty`;
        } else if (!nodeMap.has(normalizedReference)) {
          reason = `${field} references missing node: ${rawValue}`;
        }
        if (reason) danglingReferences.push({ key: diagnosticKey, label, layerName: entry.layerName, reason });
      });
    });

    const duplicateIds = [];
    idOccurrences.forEach(entries => {
      if (entries.length < 2) return;
      entries.forEach(entry => duplicateIds.push({
        key: entry.key,
        label: entry.label,
        layerName: entry.layerName,
        reason: `${entries.length} features use id ${entry.label}`
      }));
    });

    const invalidGeometries = [];
    const zeroLengthLines = [];
    featureEntries.forEach(entry => {
      const diagnostic = diagnosticByLayer.get(entry.layer);
      const geometry = entry.layer.feature?.geometry;
      const parts = getLineCoordinateParts(geometry);
      let reason = '';
      if (!geometry || !Array.isArray(geometry.coordinates)) {
        reason = 'missing coordinates';
      } else if (!hasValidCoordinateTree(geometry.coordinates)) {
        reason = 'geometry contains empty, non-numeric, or out-of-range coordinates';
      } else if (entry.geometryType === 'Point' && !isValidCoordinate(geometry.coordinates)) {
        reason = 'invalid point coordinate';
      } else if (parts.length) {
        const coordinates = parts.flat();
        if (parts.some(part => !Array.isArray(part) || part.length < 2)) {
          reason = 'line contains fewer than two coordinates';
        } else if (coordinates.some(coord => !isValidCoordinate(coord))) {
          reason = 'line contains invalid coordinates';
        } else {
          let lengthMeters = 0;
          parts.forEach(part => {
            for (let index = 1; index < part.length; index += 1) {
              lengthMeters += coordinateDistanceMeters(part[index - 1], part[index]);
            }
          });
          if (lengthMeters <= 0.01) {
            zeroLengthLines.push({
              key: diagnostic.key,
              label: diagnostic.label,
              layerName: diagnostic.layerName,
              reason: 'line geometry has zero length'
            });
          }
        }
      }
      if (reason && diagnostic) invalidGeometries.push({
        key: diagnostic.key,
        label: diagnostic.label,
        layerName: diagnostic.layerName,
        reason
      });
    });

    const geometryTopologyIssues = [];
    const endpointToleranceMeters = 10;
    lineList.filter(entry => !entry.isInline).forEach(lineEntry => {
      const parts = getLineCoordinateParts(lineEntry.layer.feature?.geometry);
      const firstPart = parts[0] || [];
      const lastPart = parts[parts.length - 1] || [];
      const firstCoord = firstPart[0];
      const lastCoord = lastPart[lastPart.length - 1];
      const reasons = [];
      const startNode = nodeMap.get(lineEntry.startNorm);
      const endNode = nodeMap.get(lineEntry.endNorm);
      const startCoord = startNode?.marker?.getLatLng?.();
      const endCoord = endNode?.marker?.getLatLng?.();
      if (startCoord && isValidCoordinate(firstCoord)) {
        const distance = coordinateDistanceMeters(firstCoord, [startCoord.lng, startCoord.lat]);
        if (distance > endpointToleranceMeters) reasons.push(`geometry start is ${distance.toFixed(1)} m from node_start`);
      }
      if (endCoord && isValidCoordinate(lastCoord)) {
        const distance = coordinateDistanceMeters(lastCoord, [endCoord.lng, endCoord.lat]);
        if (distance > endpointToleranceMeters) reasons.push(`geometry end is ${distance.toFixed(1)} m from node_end`);
      }
      if (reasons.length) geometryTopologyIssues.push({
        key: lineEntry.key,
        label: lineEntry.label,
        layerName: lineEntry.layerName,
        reason: reasons.join(', ')
      });
    });

    const duplicateNodeLocations = [];
    const nodeLocationToleranceMeters = 1;
    const nodeGrid = new Map();
    const nodeGridSize = 0.00002;
    const getSharedConnectionGroup = (firstNodeId, secondNodeId) => {
      const sharedConnections = lineList.filter(entry => {
        const endpoints = new Set([entry.startNorm, entry.endNorm].filter(Boolean));
        return endpoints.has(firstNodeId) && endpoints.has(secondNodeId);
      });
      if (!sharedConnections.length) return 'No shared connection';
      if (sharedConnections.some(entry => /valve/i.test(entry.layerName || ''))) return 'Connected by Valves';
      if (sharedConnections.some(entry => /compressor/i.test(entry.layerName || ''))) return 'Connected by Compressors';
      if (sharedConnections.some(entry => !entry.isInline)) return 'Connected by Pipelines';
      return 'Other shared connections';
    };
    nodeList.forEach(node => {
      const position = node.marker?.getLatLng?.();
      if (!position) return;
      const gridX = Math.floor(position.lng / nodeGridSize);
      const gridY = Math.floor(position.lat / nodeGridSize);
      for (let x = gridX - 1; x <= gridX + 1; x += 1) {
        for (let y = gridY - 1; y <= gridY + 1; y += 1) {
          (nodeGrid.get(`${x}:${y}`) || []).forEach(other => {
            const distance = coordinateDistanceMeters(
              [position.lng, position.lat],
              [other.position.lng, other.position.lat]
            );
            if (distance > nodeLocationToleranceMeters) return;
            const connectionGroup = getSharedConnectionGroup(node.normId, other.node.normId);
            duplicateNodeLocations.push({ normId: node.normId, id: node.id, label: node.id, layerName: node.layerName, connectionGroup, reason: `same location as node ${other.node.id} (${distance.toFixed(2)} m)` });
            duplicateNodeLocations.push({ normId: other.node.normId, id: other.node.id, label: other.node.id, layerName: other.node.layerName, connectionGroup, reason: `same location as node ${node.id} (${distance.toFixed(2)} m)` });
          });
        }
      }
      const ownCell = `${gridX}:${gridY}`;
      if (!nodeGrid.has(ownCell)) nodeGrid.set(ownCell, []);
      nodeGrid.get(ownCell).push({ node, position });
    });

    const parallelPipelines = [];
    const endpointPairs = new Map();
    lineList.filter(entry => !entry.isInline && entry.startNorm && entry.endNorm).forEach(entry => {
      const pairKey = [entry.startNorm, entry.endNorm].sort().join('|');
      if (!endpointPairs.has(pairKey)) endpointPairs.set(pairKey, []);
      endpointPairs.get(pairKey).push(entry);
    });
    endpointPairs.forEach(entries => {
      if (entries.length < 2) return;
      entries.forEach(entry => parallelPipelines.push({
        key: entry.key,
        label: entry.label,
        layerName: entry.layerName,
        reason: `${entries.length} pipelines connect ${entry.startIdRaw} and ${entry.endIdRaw}`
      }));
    });

    const crossingPipelines = [];
    const nodeCoordinatesById = new Map();
    nodeList.forEach(node => {
      const position = node.marker?.getLatLng?.();
      if (node.normId && position) {
        nodeCoordinatesById.set(node.normId, [Number(position.lng), Number(position.lat)]);
      }
    });
    const segmentGrid = new Map();
    const checkedSegmentPairs = new Set();
    const reportedLinePairs = new Set();
    // A comparatively small grid keeps candidate sets local. The previous
    // 0.25-degree cells grouped too many unrelated segments in dense networks.
    const gridSize = 0.05;
    let segmentIndex = 1;
    lineList.filter(entry => !entry.isInline).forEach(entry => {
      getLineCoordinateParts(entry.layer.feature?.geometry).forEach(part => {
        for (let index = 1; index < part.length; index += 1) {
          const a = part[index - 1];
          const b = part[index];
          if (!isValidCoordinate(a) || !isValidCoordinate(b)) continue;
          const segment = { id: segmentIndex++, entry, a: [Number(a[0]), Number(a[1])], b: [Number(b[0]), Number(b[1])] };
          const minX = Math.floor(Math.min(segment.a[0], segment.b[0]) / gridSize);
          const maxX = Math.floor(Math.max(segment.a[0], segment.b[0]) / gridSize);
          const minY = Math.floor(Math.min(segment.a[1], segment.b[1]) / gridSize);
          const maxY = Math.floor(Math.max(segment.a[1], segment.b[1]) / gridSize);
          for (let x = minX; x <= maxX; x += 1) {
            for (let y = minY; y <= maxY; y += 1) {
              const cellKey = `${x}:${y}`;
              const candidates = segmentGrid.get(cellKey) || [];
              candidates.forEach(other => {
                if (other.entry.layer === entry.layer) return;
                const segmentPairKey = [segment.id, other.id].sort((m, n) => m - n).join('|');
                if (checkedSegmentPairs.has(segmentPairKey)) return;
                checkedSegmentPairs.add(segmentPairKey);
                const intersection = properSegmentIntersectionPoint(segment.a, segment.b, other.a, other.b);
                if (!intersection) return;
                const entryNodeIds = new Set([entry.startNorm, entry.endNorm].filter(Boolean));
                const sharedNodeIds = [other.entry.startNorm, other.entry.endNorm]
                  .filter(nodeId => nodeId && entryNodeIds.has(nodeId));
                const intersectionIsSharedNode = sharedNodeIds.some(nodeId => {
                  const nodeCoordinate = nodeCoordinatesById.get(nodeId);
                  return nodeCoordinate && coordinateDistanceMeters(intersection, nodeCoordinate) <= 10;
                });
                if (intersectionIsSharedNode) return;
                const linePairKey = [entry.key, other.entry.key].sort().join('|');
                if (reportedLinePairs.has(linePairKey)) return;
                reportedLinePairs.add(linePairKey);
                crossingPipelines.push({
                  key: entry.key,
                  label: entry.label,
                  layerName: entry.layerName,
                  reason: `crosses pipeline ${other.entry.label} without a shared node`
                });
                crossingPipelines.push({
                  key: other.entry.key,
                  label: other.entry.label,
                  layerName: other.entry.layerName,
                  reason: `crosses pipeline ${entry.label} without a shared node`
                });
              });
              candidates.push(segment);
              segmentGrid.set(cellKey, candidates);
            }
          }
        }
      });
    });

    const connectionIssueGroups = new Map();
    const addConnectionIssue = (issue, layer, focusType) => {
      if (!layer) return;
      if (!connectionIssueGroups.has(layer)) {
        connectionIssueGroups.set(layer, {
          key: issue.key,
          label: issue.label,
          layerName: issue.layerName,
          focusType,
          reasons: new Set()
        });
      }
      const grouped = connectionIssueGroups.get(layer);
      String(issue.reason || '').split(',').map(reason => reason.trim()).filter(Boolean)
        .forEach(reason => grouped.reasons.add(reason));
    };
    unconnectedLines.forEach(issue => {
      addConnectionIssue(issue, lineMap.get(issue.key)?.layer, 'line');
    });
    danglingReferences.forEach(issue => {
      addConnectionIssue(issue, diagnosticMap.get(issue.key)?.layer, 'diagnostic');
    });
    const connectionIssues = Array.from(connectionIssueGroups.values()).map(issue => ({
      ...issue,
      reason: Array.from(issue.reasons).join(', ')
    }));

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
      selfLoops,
      danglingReferences,
      connectionIssues,
      duplicateIds,
      parallelPipelines,
      geometryTopologyIssues,
      crossingPipelines,
      duplicateNodeLocations,
      zeroLengthLines,
      invalidGeometries,
      diagnosticMap,
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
    const element = marker._path || (typeof marker.getElement === 'function' ? marker.getElement() : null);
    if (snapshot) {
      snapshot.element = element;
      snapshot.elementDisplay = element?.style?.display ?? null;
      snapshot.domOnly = Boolean(element?.style);
      topologyState.hiddenMarkers.set(marker, snapshot);
    }
    if (element?.style) {
      element.style.display = 'none';
    } else if (typeof marker.setStyle === 'function') {
      marker.setStyle({ opacity: 0, fillOpacity: 0, weight: 0 });
    } else if (typeof marker.setOpacity === 'function') {
      marker.setOpacity(0);
    }
  }

  function restoreMarker(marker) {
    const snapshot = topologyState.hiddenMarkers.get(marker);
    if (!snapshot) return;
    if (!snapshot.domOnly && snapshot.type === 'circle' && typeof marker.setStyle === 'function') {
      marker.setStyle(snapshot.style);
      if (typeof marker.setRadius === 'function' && snapshot.style?.radius !== undefined) {
        marker.setRadius(snapshot.style.radius);
      }
    } else if (!snapshot.domOnly && snapshot.type === 'marker' && typeof marker.setOpacity === 'function') {
      marker.setOpacity(snapshot.opacity);
    }
    if (snapshot.element?.style) snapshot.element.style.display = snapshot.elementDisplay || '';
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
    const clickLayer = layer._clickLayer?.getLayers?.()[0];
    const clickElement = clickLayer?._path || clickLayer?.getElement?.();
    snapshot.elementDisplay = layer._path?.style?.display ?? null;
    snapshot.clickElement = clickElement || null;
    snapshot.clickElementDisplay = clickElement?.style?.display ?? null;
    snapshot.domOnly = Boolean(layer._path?.style);
    topologyState.hiddenLines.set(layer, snapshot);
    if (layer._path?.style) {
      layer._path.style.display = 'none';
    } else if (typeof layer.setStyle === 'function') {
      layer.setStyle({ opacity: 0, weight: 0, dashArray: null, color: 'transparent' });
    }
    if (clickElement?.style) {
      clickElement.style.display = 'none';
    } else if (!snapshot.domOnly && clickLayer?.setStyle) {
      clickLayer.setStyle({ opacity: 0, weight: 0, color: 'transparent' });
    }
  }

  function restoreLine(layer) {
    const snapshot = topologyState.hiddenLines.get(layer);
    if (!snapshot) return;
    if (!snapshot.domOnly && typeof layer.setStyle === 'function') {
      layer.setStyle(snapshot);
    }
    if (!snapshot.domOnly && typeof syncPathStyle === 'function') {
      syncPathStyle(layer, snapshot);
    }
    if (snapshot.domOnly && layer._path?.style) {
      layer._path.style.display = snapshot.elementDisplay || '';
    } else if (layer._path) {
      layer._path.style.opacity = String(snapshot.opacity ?? 0.8);
      layer._path.style.stroke = snapshot.color || '#3388ff';
      layer._path.style.strokeWidth = `${snapshot.weight ?? 3}px`;
      layer._path.style.strokeDasharray = snapshot.dashArray ? snapshot.dashArray : '';
    }
    if (snapshot.clickElement?.style) {
      snapshot.clickElement.style.display = snapshot.clickElementDisplay || '';
    } else if (!snapshot.domOnly && layer._clickLayer && layer._clickLayer.getLayers) {
      const clickLayer = layer._clickLayer.getLayers()[0];
      if (clickLayer?.setStyle) {
        clickLayer.setStyle({ color: 'transparent', weight: 12, opacity: 0, dashArray: null });
      }
    }
    topologyState.hiddenLines.delete(layer);
  }

  function isMapBackgroundLayer(layer) {
    if (!layer || !window.L) return false;
    return (window.L.GridLayer && layer instanceof window.L.GridLayer) ||
      (window.L.TileLayer && layer instanceof window.L.TileLayer);
  }

  function hideMapElement(layer) {
    if (!layer || topologyState.hiddenElements.has(layer) ||
        topologyState.hiddenMarkers.has(layer) || topologyState.hiddenLines.has(layer)) return;

    const element = layer._path || (typeof layer.getElement === 'function' ? layer.getElement() : null);
    const elementDisplay = element?.style?.display ?? null;

    if (typeof layer.setStyle === 'function') {
      const options = layer.options || {};
      const style = {};
      [
        'color', 'weight', 'opacity', 'fill', 'fillColor', 'fillOpacity',
        'dashArray', 'dashOffset', 'lineCap', 'lineJoin'
      ].forEach(key => {
        if (Object.prototype.hasOwnProperty.call(options, key)) style[key] = options[key];
      });
      const domOnly = Boolean(element?.style);
      topologyState.hiddenElements.set(layer, { type: 'path', style, element, elementDisplay, domOnly });
      if (domOnly) element.style.display = 'none';
      else layer.setStyle({ opacity: 0, fillOpacity: 0, weight: 0 });
      return;
    }

    if (typeof layer.setOpacity === 'function') {
      const opacity = layer.options?.opacity ?? 1;
      const domOnly = Boolean(element?.style);
      topologyState.hiddenElements.set(layer, { type: 'marker', opacity, element, elementDisplay, domOnly });
      if (domOnly) element.style.display = 'none';
      else layer.setOpacity(0);
    }
  }

  function restoreMapElement(layer) {
    const snapshot = topologyState.hiddenElements.get(layer);
    if (!snapshot) return;
    if (!snapshot.domOnly && snapshot.type === 'path' && typeof layer.setStyle === 'function') {
      layer.setStyle(snapshot.style);
    } else if (!snapshot.domOnly && snapshot.type === 'marker' && typeof layer.setOpacity === 'function') {
      layer.setOpacity(snapshot.opacity);
    }
    if (snapshot.element?.style) snapshot.element.style.display = snapshot.elementDisplay || '';
    topologyState.hiddenElements.delete(layer);
  }

  function hideAllMapElementsExcept(visibleElements) {
    if (typeof map === 'undefined' || typeof map.eachLayer !== 'function') return;
    const keep = visibleElements instanceof Set ? visibleElements : new Set([visibleElements]);
    const visited = new Set();

    const visit = layer => {
      if (!layer || visited.has(layer) || keep.has(layer) || isMapBackgroundLayer(layer)) return;
      visited.add(layer);

      if (typeof layer.eachLayer === 'function') {
        layer.eachLayer(child => visit(child));
        return;
      }
      const geometryType = layer.feature?.geometry?.type;
      if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
        hideLine(layer);
      } else if (geometryType === 'Point' || geometryType === 'MultiPoint') {
        hideMarker(layer);
      } else {
        hideMapElement(layer);
      }
    };

    map.eachLayer(layer => visit(layer));
  }

  function detachPointFeaturesExcept(visibleElements) {
    if (typeof map === 'undefined' || typeof map.eachLayer !== 'function') return;
    const keep = visibleElements instanceof Set ? visibleElements : new Set([visibleElements]);
    const removals = [];
    const visited = new Set();

    const visit = (layer, parent) => {
      if (!layer || visited.has(layer) || keep.has(layer) || isMapBackgroundLayer(layer)) return;
      visited.add(layer);

      const geometryType = layer.feature?.geometry?.type;
      if (geometryType === 'Point' || geometryType === 'MultiPoint') {
        if (parent && typeof parent.removeLayer === 'function') {
          removals.push({ layer, parent });
        }
        return;
      }

      if (typeof layer.eachLayer === 'function') {
        layer.eachLayer(child => visit(child, layer));
      }
    };

    map.eachLayer(layer => visit(layer, map));
    removals.forEach(({ layer, parent }) => {
      if (topologyState.detachedPointLayers.has(layer)) return;
      topologyState.detachedPointLayers.set(layer, parent);
      parent.removeLayer(layer);
    });
  }

  function collectVisibleFeatureLayers() {
    const entries = [];
    const visited = new Set();
    if (typeof map === 'undefined' || typeof map.eachLayer !== 'function') return entries;

    const resolveDisplayName = (layer, parent) => {
      const candidates = [layer, parent];
      for (const candidate of candidates) {
        if (!candidate) continue;
        if (typeof getLayerGroupDisplayName === 'function') {
          const groupName = getLayerGroupDisplayName(candidate);
          if (groupName) return groupName;
        }
        if (typeof getLayerDisplayLabel === 'function') {
          const displayLabel = getLayerDisplayLabel(candidate);
          if (displayLabel) return displayLabel;
        }
        const metadataName = candidate._qgasMeta?.legendName;
        if (metadataName) return metadataName;
        if (candidate._customLayerName) return candidate._customLayerName;
      }
      const properties = layer?.feature?.properties || {};
      const propertyName = properties.Layer_Name || properties.layer_name || properties.layer || properties.Layer;
      if (propertyName) return String(propertyName);
      return '';
    };

    const visit = (layer, parent) => {
      if (!layer || visited.has(layer)) return;
      visited.add(layer);
      if (layer.feature?.geometry && layer.feature?.properties) {
        entries.push({
          layer,
          parent,
          geometryType: layer.feature.geometry.type,
          properties: layer.feature.properties,
          layerName: resolveDisplayName(layer, parent)
        });
      }
      if (typeof layer.eachLayer === 'function') layer.eachLayer(child => visit(child, layer));
    };

    map.eachLayer(layer => visit(layer, map));
    return entries;
  }

  function isValidCoordinate(coord) {
    return Array.isArray(coord) && coord.length >= 2 &&
      Number.isFinite(Number(coord[0])) && Number.isFinite(Number(coord[1])) &&
      Number(coord[0]) >= -180 && Number(coord[0]) <= 180 &&
      Number(coord[1]) >= -90 && Number(coord[1]) <= 90;
  }

  function hasValidCoordinateTree(value) {
    if (!Array.isArray(value) || !value.length) return false;
    if (typeof value[0] === 'number' || typeof value[1] === 'number') return isValidCoordinate(value);
    return value.every(child => hasValidCoordinateTree(child));
  }

  function getLineCoordinateParts(geometry) {
    if (!geometry) return [];
    if (geometry.type === 'LineString') return [geometry.coordinates || []];
    if (geometry.type === 'MultiLineString') return geometry.coordinates || [];
    return [];
  }

  function coordinateDistanceMeters(a, b) {
    if (!isValidCoordinate(a) || !isValidCoordinate(b)) return Infinity;
    if (typeof map !== 'undefined' && typeof map.distance === 'function') {
      return map.distance([Number(a[1]), Number(a[0])], [Number(b[1]), Number(b[0])]);
    }
    const rad = Math.PI / 180;
    const lat1 = Number(a[1]) * rad;
    const lat2 = Number(b[1]) * rad;
    const dLat = lat2 - lat1;
    const dLon = (Number(b[0]) - Number(a[0])) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function properSegmentIntersectionPoint(a, b, c, d) {
    const cross = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    const abC = cross(a, b, c);
    const abD = cross(a, b, d);
    const cdA = cross(c, d, a);
    const cdB = cross(c, d, b);
    const epsilon = 1e-12;
    const intersects = Math.abs(abC) > epsilon && Math.abs(abD) > epsilon &&
      Math.abs(cdA) > epsilon && Math.abs(cdB) > epsilon &&
      ((abC > 0) !== (abD > 0)) && ((cdA > 0) !== (cdB > 0));
    if (!intersects) return null;

    const denominator = (a[0] - b[0]) * (c[1] - d[1]) - (a[1] - b[1]) * (c[0] - d[0]);
    if (Math.abs(denominator) <= epsilon) return null;
    const firstDeterminant = a[0] * b[1] - a[1] * b[0];
    const secondDeterminant = c[0] * d[1] - c[1] * d[0];
    return [
      (firstDeterminant * (c[0] - d[0]) - (a[0] - b[0]) * secondDeterminant) / denominator,
      (firstDeterminant * (c[1] - d[1]) - (a[1] - b[1]) * secondDeterminant) / denominator
    ];
  }

  function restoreDetachedPointFeatures() {
    topologyState.detachedPointLayers.forEach((parent, layer) => {
      if (parent && typeof parent.addLayer === 'function') parent.addLayer(layer);
    });
    topologyState.detachedPointLayers.clear();
  }

  function clearTopologyNetworkFilter() {
    if (!topologyState.filterActive) return;
    topologyState.hiddenMarkers.forEach((_, marker) => restoreMarker(marker));
    topologyState.hiddenLines.forEach((_, layer) => restoreLine(layer));
    topologyState.hiddenElements.forEach((_, layer) => restoreMapElement(layer));
    restoreDetachedPointFeatures();
    topologyState.hiddenMarkers.clear();
    topologyState.hiddenLines.clear();
    topologyState.hiddenElements.clear();
    topologyState.filterActive = false;
    if (typeof resetAllPipelineHighlights === 'function') resetAllPipelineHighlights();
    if (typeof resetAllElementHighlights === 'function') resetAllElementHighlights();
  }

  function focusNode(entry) {
    if (!entry || !entry.marker || !topologyState.results) return;
    clearTopologyNetworkFilter();
    resetAllPipelineHighlights();
    resetAllElementHighlights();

    hideAllMapElementsExcept(entry.marker);
    topologyState.filterActive = true;

    highlightElement(entry.marker);
    if (typeof entry.marker.bringToFront === 'function') {
      entry.marker.bringToFront();
    }
    const latlng = entry.marker.getLatLng ? entry.marker.getLatLng() : null;
    if (latlng && typeof map !== 'undefined') {
      map.setView(latlng, Math.max(map.getZoom(), 10), { animate: true });
    }
  }

  function focusLine(entry) {
    if (!entry || !entry.layer || !topologyState.results) return;
    clearTopologyNetworkFilter();
    resetAllPipelineHighlights();
    resetAllElementHighlights();

    hideAllMapElementsExcept(entry.layer);
    topologyState.filterActive = true;

    if (entry.isInline) {
      highlightElement(entry.layer);
      if (typeof entry.layer.bringToFront === 'function') {
        entry.layer.bringToFront();
      }
      const latlng = entry.layer.getLatLng ? entry.layer.getLatLng() : null;
      if (latlng && typeof map !== 'undefined') {
        map.setView(latlng, Math.max(map.getZoom(), 10), { animate: true });
      }
      return;
    }
    highlightPipeline(entry.layer);
    if (typeof entry.layer.setStyle === 'function') {
      entry.layer.setStyle({ color: '#ff2b2b', weight: 8, opacity: 1 });
    }
    if (entry.layer._path?.style) {
      entry.layer._path.style.display = '';
      entry.layer._path.style.opacity = '1';
      entry.layer._path.style.stroke = '#ff2b2b';
      entry.layer._path.style.strokeWidth = '8px';
    }
    if (typeof entry.layer.bringToFront === 'function') {
      entry.layer.bringToFront();
    }
    if (entry.layer.getBounds && typeof map !== 'undefined') {
      const bounds = entry.layer.getBounds();
      if (bounds?.isValid?.()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true });
      }
    }
  }

  function focusDiagnostic(entry) {
    if (!entry || !entry.layer || !topologyState.results) return;
    const matchingLine = topologyState.results.lineList.find(item => item.layer === entry.layer);
    if (matchingLine) {
      focusLine(matchingLine);
      return;
    }
    if (entry.geometryType === 'Point' || entry.geometryType === 'MultiPoint') {
      focusNode({ marker: entry.layer });
      return;
    }

    clearTopologyNetworkFilter();
    hideAllMapElementsExcept(entry.layer);
    topologyState.filterActive = true;
    if (typeof entry.layer.setStyle === 'function') {
      entry.layer.setStyle({ color: '#ff2b2b', weight: 8, opacity: 1, fillOpacity: 0.35 });
    }
    const bounds = entry.layer.getBounds?.();
    if (bounds?.isValid?.() && typeof map !== 'undefined') {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true });
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
      if (bounds.isValid() && typeof map !== 'undefined') {
        map.fitBounds(bounds, { padding: [35, 35] });
      }
    }
  }

  function renderTopologyPopup(results) {
    const combinedConnectionIssues = [
      ...results.unconnectedNodes.map(node => ({
        ...node,
        key: node.normId,
        label: node.id,
        focusType: 'node',
        reason: 'node is not connected to any line or in-line element'
      })),
      ...results.connectionIssues
    ];
    const summaryHtml = `
      <div style="display:grid; gap:10px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); margin-bottom: 12px;">
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; text-align:center;">
          <div style="font-size:12px; color:#64748b;">Connection Issues</div>
          <div style="font-size:18px; font-weight:700; color:#0f172a;">${combinedConnectionIssues.length}</div>
        </div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; text-align:center;">
          <div style="font-size:12px; color:#64748b;">Self-Loops</div>
          <div style="font-size:18px; font-weight:700; color:#0f172a;">${results.selfLoops.length}</div>
        </div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; text-align:center;">
          <div style="font-size:12px; color:#64748b;">Duplicate IDs</div>
          <div style="font-size:18px; font-weight:700; color:#0f172a;">${results.duplicateIds.length}</div>
        </div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; text-align:center;">
          <div style="font-size:12px; color:#64748b;">Parallel Pipelines</div>
          <div style="font-size:18px; font-weight:700; color:#0f172a;">${results.parallelPipelines.length}</div>
        </div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; text-align:center;"><div style="font-size:12px; color:#64748b;">Endpoint Mismatches</div><div style="font-size:18px; font-weight:700; color:#0f172a;">${results.geometryTopologyIssues.length}</div></div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; text-align:center;"><div style="font-size:12px; color:#64748b;">Pipeline Crossings</div><div style="font-size:18px; font-weight:700; color:#0f172a;">${results.crossingPipelines.length}</div></div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; text-align:center;"><div style="font-size:12px; color:#64748b;">Co-located Nodes</div><div style="font-size:18px; font-weight:700; color:#0f172a;">${results.duplicateNodeLocations.length}</div></div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; text-align:center;"><div style="font-size:12px; color:#64748b;">Zero-Length Edges</div><div style="font-size:18px; font-weight:700; color:#0f172a;">${results.zeroLengthLines.length}</div></div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; text-align:center;"><div style="font-size:12px; color:#64748b;">Invalid Geometries</div><div style="font-size:18px; font-weight:700; color:#0f172a;">${results.invalidGeometries.length}</div></div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; text-align:center;">
          <div style="font-size:12px; color:#64748b;">Networks</div>
          <div style="font-size:18px; font-weight:700; color:#0f172a;">${results.networks.length}</div>
        </div>
      </div>
    `;

    const itemButton = (entry, type, id, subtitle = '') => `
      <button class="topology-item" data-type="${type}" data-id="${escapeHtml(id)}" style="width:100%; text-align:left; padding:8px 10px; border:1px solid #e2e8f0; background:#fff; border-radius:6px; cursor:pointer; margin-bottom:6px;">
        <div style="font-weight:600; color:#1f2937;">${escapeHtml(entry.label || entry.id)}</div>
        ${subtitle ? `<div style="font-size:12px; color:#64748b;">${escapeHtml(subtitle)}</div>` : ''}
      </button>
    `;

    const groupBy = (items, keySelector) => {
      const groups = new Map();
      items.forEach(item => {
        const key = keySelector(item) || 'Unknown Layer';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item);
      });
      return groups;
    };

    const renderLayerGroups = (items, renderItem) => {
      if (!items.length) return '';
      return Array.from(groupBy(items, item => item.layerName).entries())
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([layerName, layerItems]) => `
          <details style="margin:6px 0 6px 12px; border-left:2px solid #e2e8f0; padding-left:10px;">
            <summary style="cursor:pointer; font-size:13px; font-weight:600; color:#334155; padding:4px 0;">${escapeHtml(layerName)} (${layerItems.length})</summary>
            <div style="padding-top:6px;">${layerItems.map(renderItem).join('')}</div>
          </details>
        `).join('');
    };

    const renderCategory = (title, items, emptyText, renderItem, groupedContent = null) => `
      <details style="margin-bottom:8px; border:1px solid #e2e8f0; border-radius:8px; background:#f8fafc;">
        <summary style="cursor:pointer; padding:10px 12px; font-size:14px; font-weight:700; color:#1f2937;">${escapeHtml(title)} (${items.length})</summary>
        <div style="padding:0 10px 10px;">${items.length ? (groupedContent || renderLayerGroups(items, renderItem)) : `<div style="font-size:13px; color:#64748b; padding:4px 2px;">${escapeHtml(emptyText)}</div>`}</div>
      </details>
    `;

    const renderDiagnostic = type => entry => itemButton(entry, type, entry.key, entry.reason);
    const renderNode = node => itemButton(node, 'node', node.normId, node.reason || '');
    const renderConnection = issue => itemButton(issue, issue.focusType, issue.key, issue.reason);

    const coLocatedGroups = Array.from(groupBy(results.duplicateNodeLocations, node => node.connectionGroup).entries())
      .map(([connectionGroup, nodes]) => `
        <details style="margin:6px 0; border-left:2px solid #cbd5e1; padding-left:10px;">
          <summary style="cursor:pointer; font-size:13px; font-weight:600; color:#334155; padding:4px 0;">${escapeHtml(connectionGroup)} (${nodes.length})</summary>
          ${renderLayerGroups(nodes, renderNode)}
        </details>
      `).join('');

    const networkItems = results.networks.map((network, index) => itemButton(
      { label: `Network ${index + 1}` }, 'network', String(index),
      `${network.nodeCount} nodes · ${network.lineCount} lines`
    )).join('');

    const content = `
      ${summaryHtml}
      ${renderCategory('Connection Issues', combinedConnectionIssues, 'No connection issues found.', renderConnection)}
      ${renderCategory('Self-Loops', results.selfLoops, 'No self-loops found.', renderDiagnostic('line'))}
      ${renderCategory('Duplicate IDs', results.duplicateIds, 'No duplicate IDs found.', renderDiagnostic('diagnostic'))}
      ${renderCategory('Parallel Pipelines', results.parallelPipelines, 'No parallel pipelines found.', renderDiagnostic('line'))}
      ${renderCategory('Geometry–Topology Mismatches', results.geometryTopologyIssues, 'No endpoint mismatches found.', renderDiagnostic('line'))}
      ${renderCategory('Pipeline Crossings Without Nodes', results.crossingPipelines, 'No unexplained crossings found.', renderDiagnostic('line'))}
      ${renderCategory('Nodes at the Same Location', results.duplicateNodeLocations, 'No co-located nodes found.', renderNode, coLocatedGroups)}
      ${renderCategory('Zero-Length Edges', results.zeroLengthLines, 'No zero-length edges found.', renderDiagnostic('diagnostic'))}
      ${renderCategory('Invalid Geometries', results.invalidGeometries, 'No invalid geometries found.', renderDiagnostic('diagnostic'))}
      <details style="margin-bottom:8px; border:1px solid #e2e8f0; border-radius:8px; background:#f8fafc;">
        <summary style="cursor:pointer; padding:10px 12px; font-size:14px; font-weight:700; color:#1f2937;">Networks (${results.networks.length})</summary>
        <div style="padding:6px 10px 10px;">${networkItems || '<div style="font-size:13px; color:#64748b;">No connected networks found.</div>'}</div>
      </details>
    `;

    showCustomPopup(
      '🧭 Topology Checker',
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
        } else if (type === 'diagnostic') {
          const entry = results.diagnosticMap.get(String(id));
          focusDiagnostic(entry);
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
   * (c) self-loops whose start and end node are identical, and
   * (d) dangling node references across all feature layers,
   * (e) duplicate feature IDs,
   * (f) parallel pipelines sharing the same unordered endpoint pair, and
   * (g) geometric endpoint mismatches, unexplained pipeline crossings,
   * (h) co-located nodes, zero-length lines, and invalid geometries, and
   * (i) disconnected network sub-graphs (islands). Each result entry is
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
      console.warn('Topology Checker could not reset modes:', error);
    }

    const analysisRunId = ++topologyState.analysisRunId;
    showCustomPopup(
      '🧭 Topology Checker',
      '<div style="padding:18px 8px; text-align:center; color:#475569;"><div style="font-weight:600; margin-bottom:6px;">Analyzing network topology…</div><div style="font-size:12px;">Large datasets may take a moment.</div></div>',
      [{
        text: 'Close',
        type: 'primary',
        onClick: () => {
          if (topologyState.analysisRunId === analysisRunId) topologyState.analysisRunId += 1;
        }
      }]
    );
    if (typeof dockCustomPopupBottomRight === 'function') dockCustomPopupBottomRight();

    const runAnalysis = () => {
      if (topologyState.analysisRunId !== analysisRunId) return;
      const results = buildTopologyAnalysis();
      if (topologyState.analysisRunId !== analysisRunId) return;
      topologyState.results = results;

      if (!results.nodeList.length && !results.lineList.length) {
        showInfoPopup('No node or line layers are currently loaded.', '🧭 Topology Checker');
        return;
      }

      renderTopologyPopup(results);
    };

    // Let the browser paint the loading popup before starting CPU-intensive checks.
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setTimeout(runAnalysis, 0));
    } else {
      setTimeout(runAnalysis, 0);
    }
  }

  window.activateTopologyCheckTool = activateTopologyCheckTool;
})();
