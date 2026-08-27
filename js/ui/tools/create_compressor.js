/**
 * QGas - Create Compressor Tool
 *
 * Creates Europe_Finished-compatible node or line compressors. Node
 * compressors replace an existing network node and reconnect every incident
 * pipeline through radial terminal nodes and compressor pipes. Line
 * compressors split one to five selected pipelines around a chosen location;
 * every terminal pair is 50 m apart and connects to one central compressor.
 */
(function () {
  'use strict';

  const NODE_TERMINAL_RADIUS_METERS = 28.7;
  const LINE_TERMINAL_SPACING_METERS = 50;
  const MAX_LINE_SELECTION = 5;
  const EARTH_RADIUS_METERS = 6371000;

  let createCompressorMode = false;
  let workflowType = '';
  let selectedPipelines = [];
  let boundNodeLayers = [];
  let boundPipelineLayers = [];
  let locationClickHandler = null;

  function readId(properties) {
    return String(properties?.id ?? properties?.ID ?? '').trim();
  }

  function configuredLayer(predicate) {
    if (!Array.isArray(layerConfig) || typeof dynamicLayers !== 'object') return null;
    for (const config of layerConfig) {
      if (!predicate(config)) continue;
      const layerName = typeof getLayerNameFromConfig === 'function'
        ? getLayerNameFromConfig(config)
        : String(config.filename || '').replace(/\.(?:geojson|csv)$/i, '').replace(/[^a-zA-Z0-9]/g, '') + 'Layer';
      if (dynamicLayers[layerName]) return dynamicLayers[layerName];
    }
    return null;
  }

  function getCompressorGroup() {
    if (typeof compressorsLayer !== 'undefined' && compressorsLayer) return compressorsLayer;
    return configuredLayer(config => {
      const descriptor = `${config?.filename || ''} ${config?.legendName || ''}`.toLowerCase();
      return String(config?.type || '').toLowerCase() === 'node' && /compressors?/.test(descriptor);
    });
  }

  function getCompressorPipeGroup() {
    return configuredLayer(config => {
      const descriptor = `${config?.filename || ''} ${config?.legendName || ''}`.toLowerCase();
      return String(config?.type || '').toLowerCase() === 'line' && /compressor\s*[-_]?\s*(line|pipe)/.test(descriptor);
    });
  }

  function getNodeGroup() {
    const groups = networkNodeGroups();
    if (groups.length) return groups[0];
    return typeof nodeLayer !== 'undefined' ? nodeLayer : null;
  }

  function networkNodeGroups() {
    const compressorGroup = getCompressorGroup();
    const groups = [];
    const add = group => {
      if (group && group !== compressorGroup && !groups.includes(group)) groups.push(group);
    };
    if (Array.isArray(layerConfig)) {
      layerConfig.forEach(config => {
        if (String(config?.type || '').trim().toLowerCase() !== 'node') return;
        const descriptor = `${config.filename || ''} ${config.legendName || ''}`.toLowerCase();
        if (/compressors?/.test(descriptor)) return;
        const name = typeof getLayerNameFromConfig === 'function'
          ? getLayerNameFromConfig(config)
          : String(config.filename || '').replace(/\.(?:geojson|csv)$/i, '').replace(/[^a-zA-Z0-9]/g, '') + 'Layer';
        add(dynamicLayers?.[name]);
      });
    }
    if (!groups.length) {
      try {
        const discovered = typeof getAllNodeLayers === 'function' ? getAllNodeLayers() : [];
        discovered.forEach(add);
      } catch (_) {}
    }
    if (!groups.length && typeof nodeLayer !== 'undefined') add(nodeLayer);
    return groups;
  }

  function visitFeatureLayers(group, visitor) {
    const seen = new Set();
    const visit = layer => {
      if (!layer || seen.has(layer)) return;
      seen.add(layer);
      if (layer.feature?.geometry) visitor(layer);
      else if (typeof layer.eachLayer === 'function') layer.eachLayer(visit);
    };
    visit(group);
  }

  function findOwningGroup(target, groups) {
    let result = null;
    const search = group => {
      if (!group || result || typeof group.eachLayer !== 'function') return;
      group.eachLayer(child => {
        if (result) return;
        if (child === target) result = group;
        else search(child);
      });
    };
    groups.forEach(search);
    return result;
  }

  function pipelineGroups() {
    const groups = [];
    const add = group => { if (group && !groups.includes(group)) groups.push(group); };
    if (Array.isArray(layerConfig)) {
      layerConfig.forEach(config => {
        if (String(config?.type || '').trim().toLowerCase() !== 'line') return;
        const descriptor = `${config.filename || ''} ${config.legendName || ''}`.toLowerCase();
        if (/compressor\s*[-_]?\s*(line|pipe)|short\s*[-_]?\s*pipe|valve/.test(descriptor)) return;
        const name = typeof getLayerNameFromConfig === 'function'
          ? getLayerNameFromConfig(config)
          : String(config.filename || '').replace(/\.(?:geojson|csv)$/i, '').replace(/[^a-zA-Z0-9]/g, '') + 'Layer';
        add(dynamicLayers?.[name]);
      });
    }
    if (!groups.length && typeof pipelineLayer !== 'undefined') add(pipelineLayer);
    return groups;
  }

  function pipelineFeatureLayers() {
    const result = [];
    pipelineGroups().forEach(group => visitFeatureLayers(group, layer => {
      if (layer.feature.geometry?.type === 'LineString' && typeof layer.getLatLngs === 'function') result.push(layer);
    }));
    return result;
  }

  function cloneSchemaFromGroup(group, overrides) {
    let sample = null;
    visitFeatureLayers(group, layer => { if (!sample) sample = layer.feature?.properties; });
    const properties = {};
    Object.keys(sample || {}).forEach(key => {
      if (key.startsWith('__') || key === 'last_changed') return;
      properties[key] = null;
    });
    return Object.assign(properties, overrides || {});
  }

  function collectIds(group) {
    const ids = new Set();
    visitFeatureLayers(group, layer => {
      const id = readId(layer.feature?.properties);
      if (id) ids.add(id.toLowerCase());
    });
    return ids;
  }

  function nextPrefixedId(prefix, group) {
    const ids = collectIds(group);
    const contributor = String(typeof contributorInitials !== 'undefined' ? contributorInitials : 'XX').trim().toUpperCase() || 'XX';
    let number = 1;
    while (ids.has(`${prefix}_${contributor}_${number}`.toLowerCase())) number += 1;
    return `${prefix}_${contributor}_${number}`;
  }

  function compressorStyle(group) {
    let sample = null;
    visitFeatureLayers(group, layer => { if (!sample && layer.options) sample = layer; });
    return {
      pane: sample?.options?.pane || 'overlayPane',
      radius: sample?.options?.radius ?? 6,
      fillColor: sample?.options?.fillColor || sample?.options?.color || '#F4C430',
      color: sample?.options?.color || '#000',
      weight: sample?.options?.weight ?? 1,
      opacity: sample?.options?.opacity ?? 1,
      fillOpacity: sample?.options?.fillOpacity ?? 0.85
    };
  }

  function lineStyle(group, sourceLayer) {
    let sample = sourceLayer || null;
    if (!sample) visitFeatureLayers(group, layer => { if (!sample && layer.options) sample = layer; });
    return {
      pane: sample?.options?.pane || 'pipelinePane',
      color: sample?.options?.color || sample?._originalColor || '#F4C430',
      weight: sample?.options?.weight ?? sample?._originalWeight ?? 3,
      opacity: sample?.options?.opacity ?? sample?._originalOpacity ?? 0.8,
      dashArray: sample?.options?.dashArray || null
    };
  }

  function undoContext(layer, parent) {
    return {
      layer,
      parent: parent || map,
      style: {
        color: layer?.options?.color,
        weight: layer?.options?.weight,
        opacity: layer?.options?.opacity,
        fillColor: layer?.options?.fillColor,
        fillOpacity: layer?.options?.fillOpacity,
        radius: layer?.options?.radius,
        dashArray: layer?.options?.dashArray
      }
    };
  }

  function addCompressor(latlng, compressorId, compressorType, sourceProperties = {}) {
    const group = getCompressorGroup();
    const properties = cloneSchemaFromGroup(group, {
      id: compressorId,
      name: compressorId,
      compressor_type: compressorType,
      pressure_bar: sourceProperties.pressure_bar ?? sourceProperties.pressure_max ?? null,
      country: sourceProperties.country ?? sourceProperties.country_start ?? null,
      nuts3: sourceProperties.nuts3 ?? sourceProperties.nuts3_start ?? null,
      year_end: 9999
    });
    delete properties.ID;
    const marker = L.circleMarker(latlng, compressorStyle(group));
    marker.feature = {
      type: 'Feature',
      properties,
      geometry: { type: 'Point', coordinates: [latlng.lng, latlng.lat] }
    };
    if (group?._qgasMeta && typeof assignMetadataToLayer === 'function') assignMetadataToLayer(marker, group._qgasMeta);
    group.addLayer(marker);
    markLayerChanged(marker, {
      tool: 'Create Compressor',
      undoContexts: [undoContext(marker, group)]
    });
    return marker;
  }

  function addTerminalNode(latlng, nodeId, sourceProperties) {
    const group = getNodeGroup();
    const properties = { ...(sourceProperties || {}) };
    delete properties.ID;
    delete properties.__elementKey;
    properties.id = nodeId;
    if (Object.prototype.hasOwnProperty.call(properties, 'name')) properties.name = nodeId;
    if (Object.prototype.hasOwnProperty.call(properties, 'Name')) properties.Name = nodeId;
    return createNewNode(latlng, nodeId, {
      targetLayer: group,
      properties,
      tool: 'Create Compressor'
    });
  }

  function addCompressorPipe(terminalLatLng, compressorLatLng, terminalNodeId, compressorId, outbound = false) {
    const group = getCompressorPipeGroup();
    const pipeId = nextPrefixedId('CP', group);
    const properties = cloneSchemaFromGroup(group, {
      id: pipeId,
      node_start: outbound ? compressorId : terminalNodeId,
      node_end: outbound ? terminalNodeId : compressorId,
      diameter_mm: 9999
    });
    delete properties.ID;
    const feature = {
      type: 'Feature',
      properties,
      geometry: {
        type: 'LineString',
        coordinates: outbound
          ? [[compressorLatLng.lng, compressorLatLng.lat], [terminalLatLng.lng, terminalLatLng.lat]]
          : [[terminalLatLng.lng, terminalLatLng.lat], [compressorLatLng.lng, compressorLatLng.lat]]
      }
    };
    const layer = L.polyline(outbound ? [compressorLatLng, terminalLatLng] : [terminalLatLng, compressorLatLng], lineStyle(group));
    layer.feature = feature;
    if (group?._qgasMeta && typeof assignMetadataToLayer === 'function') assignMetadataToLayer(layer, group._qgasMeta);
    group.addLayer(layer);
    if (typeof setPipelineInteraction === 'function') setPipelineInteraction(layer, 'info');
    markLayerChanged(layer, {
      tool: 'Create Compressor',
      undoContexts: [undoContext(layer, group)]
    });
    return layer;
  }

  function distanceMeters(a, b) {
    const p1 = a.lat * Math.PI / 180;
    const p2 = b.lat * Math.PI / 180;
    const dp = (b.lat - a.lat) * Math.PI / 180;
    const dl = (b.lng - a.lng) * Math.PI / 180;
    const q = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
  }

  function lineMetrics(coordinates) {
    const cumulative = [0];
    for (let i = 1; i < coordinates.length; i += 1) {
      const a = L.latLng(coordinates[i - 1][1], coordinates[i - 1][0]);
      const b = L.latLng(coordinates[i][1], coordinates[i][0]);
      cumulative.push(cumulative[i - 1] + distanceMeters(a, b));
    }
    return cumulative;
  }

  function pointAtDistance(coordinates, cumulative, target) {
    const total = cumulative[cumulative.length - 1];
    const distance = Math.max(0, Math.min(total, target));
    let index = 0;
    while (index < cumulative.length - 2 && cumulative[index + 1] < distance) index += 1;
    const span = cumulative[index + 1] - cumulative[index];
    const ratio = span ? (distance - cumulative[index]) / span : 0;
    const a = coordinates[index];
    const b = coordinates[index + 1];
    return {
      distance,
      index,
      coordinate: [a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio]
    };
  }

  function nearestDistanceOnLine(coordinates, clickLatLng, cumulative) {
    const refLat = clickLatLng.lat * Math.PI / 180;
    const scaleX = Math.cos(refLat) * Math.PI / 180 * EARTH_RADIUS_METERS;
    const scaleY = Math.PI / 180 * EARTH_RADIUS_METERS;
    let best = { squared: Infinity, distance: 0 };
    for (let i = 0; i < coordinates.length - 1; i += 1) {
      const ax = (coordinates[i][0] - clickLatLng.lng) * scaleX;
      const ay = (coordinates[i][1] - clickLatLng.lat) * scaleY;
      const bx = (coordinates[i + 1][0] - clickLatLng.lng) * scaleX;
      const by = (coordinates[i + 1][1] - clickLatLng.lat) * scaleY;
      const dx = bx - ax;
      const dy = by - ay;
      const lengthSquared = dx * dx + dy * dy;
      const ratio = lengthSquared ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared)) : 0;
      const px = ax + ratio * dx;
      const py = ay + ratio * dy;
      const squared = px * px + py * py;
      if (squared < best.squared) {
        best = {
          squared,
          distance: cumulative[i] + ratio * (cumulative[i + 1] - cumulative[i])
        };
      }
    }
    return best.distance;
  }

  function prefixCoordinates(coordinates, point) {
    return [...coordinates.slice(0, point.index + 1), point.coordinate];
  }

  function suffixCoordinates(coordinates, point) {
    return [point.coordinate, ...coordinates.slice(point.index + 1)];
  }

  function calculateLengthKm(coordinates) {
    const cumulative = lineMetrics(coordinates);
    return cumulative[cumulative.length - 1] / 1000;
  }

  function addPipelineSegment(feature, coordinates, properties, sourceLayer, group) {
    const style = lineStyle(group, sourceLayer);
    const layer = L.polyline(coordinates.map(coord => L.latLng(coord[1], coord[0])), style);
    layer.feature = { type: 'Feature', properties, geometry: { type: 'LineString', coordinates } };
    if (sourceLayer?._qgasMeta && typeof assignMetadataToLayer === 'function') assignMetadataToLayer(layer, sourceLayer._qgasMeta);
    group.addLayer(layer);
    if (typeof setPipelineInteraction === 'function') setPipelineInteraction(layer, 'info');
    markLayerChanged(layer, {
      tool: 'Create Compressor',
      undoContexts: [undoContext(layer, group)]
    });
    return layer;
  }

  function replacePipeline(layer, firstPoint, secondPoint, firstNodeId, secondNodeId, suffixA, suffixB) {
    const feature = layer.feature;
    const coordinates = feature.geometry.coordinates;
    const owner = findOwningGroup(layer, pipelineGroups());
    if (!owner) throw new Error(`Owning layer for pipeline ${readId(feature.properties)} was not found.`);
    const originalId = readId(feature.properties) || 'Pipeline';
    const firstCoordinates = prefixCoordinates(coordinates, firstPoint);
    const secondCoordinates = suffixCoordinates(coordinates, secondPoint);
    const firstProperties = {
      ...feature.properties,
      id: `${originalId}_${suffixA}`,
      node_end: firstNodeId,
      length_km: calculateLengthKm(firstCoordinates)
    };
    const secondProperties = {
      ...feature.properties,
      id: `${originalId}_${suffixB}`,
      node_start: secondNodeId,
      length_km: calculateLengthKm(secondCoordinates)
    };
    delete firstProperties.ID;
    delete secondProperties.ID;
    const undoContexts = [undoContext(layer, owner)];
    markLayerChanged(layer, {
      tool: 'Create Compressor',
      changeType: 'Topology Change',
      description: `Original pipeline replaced by ${firstProperties.id} and ${secondProperties.id}`,
      undoOperation: 'delete',
      undoContexts
    });
    if (typeof deletedPipelines !== 'undefined') deletedPipelines.push(feature);
    owner.removeLayer(layer);
    if (map.hasLayer(layer)) map.removeLayer(layer);
    addPipelineSegment(feature, firstCoordinates, firstProperties, layer, owner);
    addPipelineSegment(feature, secondCoordinates, secondProperties, layer, owner);
  }

  function incidentPipelines(nodeId) {
    return pipelineFeatureLayers().filter(layer => {
      const properties = layer.feature?.properties || {};
      return String(properties.node_start || '') === nodeId || String(properties.node_end || '') === nodeId;
    });
  }

  function findNodeProperties(nodeId) {
    let result = null;
    const groups = networkNodeGroups();
    groups.forEach(group => visitFeatureLayers(group, layer => {
      if (!result && readId(layer.feature?.properties) === String(nodeId || '')) result = layer.feature.properties;
    }));
    return result;
  }

  function terminalLetter(index) {
    return String.fromCharCode(65 + index);
  }

  function removeOriginalNode(nodeMarker) {
    const groups = networkNodeGroups();
    const owner = findOwningGroup(nodeMarker, groups);
    markLayerChanged(nodeMarker, {
      tool: 'Create Compressor',
      changeType: 'Topology Change',
      description: 'Node converted to compressor',
      undoOperation: 'delete',
      undoContexts: [undoContext(nodeMarker, owner)]
    });
    if (typeof deletedNodes !== 'undefined') deletedNodes.push(nodeMarker.feature);
    if (owner) owner.removeLayer(nodeMarker);
    if (map.hasLayer(nodeMarker)) map.removeLayer(nodeMarker);
  }

  function createNodeCompressor(nodeMarker) {
    const nodeId = readId(nodeMarker.feature?.properties);
    const connected = incidentPipelines(nodeId);
    if (!connected.length) throw new Error(`Node ${nodeId} has no connected pipelines.`);
    if (connected.length > 26) throw new Error('A maximum of 26 connections is supported.');
    const compressorGroup = getCompressorGroup();
    const pipeGroup = getCompressorPipeGroup();
    if (!compressorGroup || !pipeGroup || !getNodeGroup()) throw new Error('Compressors, Compressor Lines, and Nodes layers must be loaded.');
    const compressorId = nextPrefixedId('C', compressorGroup);
    const center = nodeMarker.getLatLng();
    addCompressor(center, compressorId, 'Node', nodeMarker.feature.properties);

    connected.forEach((pipeline, index) => {
      const coordinates = pipeline.feature.geometry.coordinates;
      const cumulative = lineMetrics(coordinates);
      const atStart = String(pipeline.feature.properties.node_start || '') === nodeId;
      const terminalPoint = pointAtDistance(
        coordinates,
        cumulative,
        atStart ? NODE_TERMINAL_RADIUS_METERS : cumulative[cumulative.length - 1] - NODE_TERMINAL_RADIUS_METERS
      );
      const terminalId = `${compressorId}_${terminalLetter(index)}`;
      const terminalLatLng = L.latLng(terminalPoint.coordinate[1], terminalPoint.coordinate[0]);
      addTerminalNode(terminalLatLng, terminalId, nodeMarker.feature.properties);
      addCompressorPipe(terminalLatLng, center, terminalId, compressorId);

      const properties = { ...pipeline.feature.properties };
      if (atStart) properties.node_start = terminalId;
      else properties.node_end = terminalId;
      properties.length_km = calculateLengthKm(atStart
        ? suffixCoordinates(coordinates, terminalPoint)
        : prefixCoordinates(coordinates, terminalPoint));
      const owner = findOwningGroup(pipeline, pipelineGroups());
      const newCoordinates = atStart
        ? suffixCoordinates(coordinates, terminalPoint)
        : prefixCoordinates(coordinates, terminalPoint);
      pipeline.feature.properties = properties;
      pipeline.feature.geometry = { type: 'LineString', coordinates: newCoordinates };
      pipeline.setLatLngs(newCoordinates.map(coord => L.latLng(coord[1], coord[0])));
      markLayerChanged(pipeline, {
        tool: 'Create Compressor',
        geometry: pipeline.feature.geometry,
        changeType: 'Topology Change',
        description: `Pipeline endpoint ${nodeId} replaced by ${terminalId}`,
        undoContexts: [undoContext(pipeline, owner)]
      });
      if (owner && !owner.hasLayer?.(pipeline)) owner.addLayer(pipeline);
    });
    removeOriginalNode(nodeMarker);
    finish(`Node compressor ${compressorId} created with ${connected.length} connections.`);
  }

  function createLineCompressor(location) {
    if (!selectedPipelines.length) throw new Error('Select at least one pipeline.');
    const compressorGroup = getCompressorGroup();
    const pipeGroup = getCompressorPipeGroup();
    if (!compressorGroup || !pipeGroup || !getNodeGroup()) throw new Error('Compressors, Compressor Lines, and Nodes layers must be loaded.');
    const compressorId = nextPrefixedId('C', compressorGroup);
    selectedPipelines.forEach(pipeline => {
      const cumulative = lineMetrics(pipeline.feature.geometry.coordinates);
      if (cumulative[cumulative.length - 1] <= LINE_TERMINAL_SPACING_METERS) {
        throw new Error(`Pipeline ${readId(pipeline.feature.properties)} is too short for a 50 m terminal spacing.`);
      }
    });
    addCompressor(
      location,
      compressorId,
      selectedPipelines.length > 1 ? 'Parallel' : 'Line',
      selectedPipelines[0].feature.properties
    );

    selectedPipelines.forEach((pipeline, index) => {
      const coordinates = pipeline.feature.geometry.coordinates;
      const cumulative = lineMetrics(coordinates);
      const total = cumulative[cumulative.length - 1];
      const centerDistance = nearestDistanceOnLine(coordinates, location, cumulative);
      const firstDistance = Math.max(0, Math.min(total - LINE_TERMINAL_SPACING_METERS, centerDistance - LINE_TERMINAL_SPACING_METERS / 2));
      const secondDistance = firstDistance + LINE_TERMINAL_SPACING_METERS;
      const firstPoint = pointAtDistance(coordinates, cumulative, firstDistance);
      const secondPoint = pointAtDistance(coordinates, cumulative, secondDistance);
      const suffixA = terminalLetter(index * 2);
      const suffixB = terminalLetter(index * 2 + 1);
      const firstNodeId = `${compressorId}_${suffixA}`;
      const secondNodeId = `${compressorId}_${suffixB}`;
      const firstLatLng = L.latLng(firstPoint.coordinate[1], firstPoint.coordinate[0]);
      const secondLatLng = L.latLng(secondPoint.coordinate[1], secondPoint.coordinate[0]);
      const sourceProperties = pipeline.feature.properties;
      addTerminalNode(firstLatLng, firstNodeId, findNodeProperties(sourceProperties.node_start));
      addTerminalNode(secondLatLng, secondNodeId, findNodeProperties(sourceProperties.node_end));
      addCompressorPipe(firstLatLng, location, firstNodeId, compressorId);
      addCompressorPipe(secondLatLng, location, secondNodeId, compressorId, true);
      replacePipeline(pipeline, firstPoint, secondPoint, firstNodeId, secondNodeId, suffixA, suffixB);
    });
    finish(`Line compressor ${compressorId} created across ${selectedPipelines.length} pipeline(s).`);
  }

  function restoreInteractions() {
    boundNodeLayers.forEach(binding => {
      binding.layer.off('click', binding.handler);
    });
    boundPipelineLayers.forEach(binding => {
      const layer = binding.layer;
      layer.off('click', binding.handler);
      if (layer.setStyle && layer._createCompressorStyle) layer.setStyle(layer._createCompressorStyle);
      delete layer._createCompressorStyle;
    });
    boundNodeLayers = [];
    boundPipelineLayers = [];
    if (locationClickHandler) map.off('click', locationClickHandler);
    locationClickHandler = null;
    map.getContainer().style.cursor = '';
  }

  function cancelCreateCompressor() {
    restoreInteractions();
    createCompressorMode = false;
    workflowType = '';
    selectedPipelines = [];
    closeCustomPopup();
    currentMode = 'info';
    if (typeof activateInfoMode === 'function') activateInfoMode(true);
  }

  function finish(message) {
    restoreInteractions();
    createCompressorMode = false;
    selectedPipelines = [];
    window.hasUnsavedChanges = true;
    currentMode = 'info';
    if (typeof activateInfoMode === 'function') activateInfoMode(true);
    showInfoPopup(message, 'Create Compressor');
  }

  function beginNodeSelection() {
    workflowType = 'node';
    closeCustomPopup();
    const groups = networkNodeGroups();
    groups.forEach(group => visitFeatureLayers(group, layer => {
      if (layer.feature.geometry?.type !== 'Point') return;
      const handler = event => {
        if (!createCompressorMode) return;
        event.originalEvent?.stopPropagation?.();
        const undoGroup = window.QGasUndo?.beginGroup?.('Create Compressor');
        try { createNodeCompressor(layer); } catch (error) {
          console.error('Create node compressor failed:', error);
          showErrorPopup(error.message, 'Create Compressor');
        } finally {
          window.QGasUndo?.endGroup?.(undoGroup);
        }
      };
      boundNodeLayers.push({ layer, handler });
      layer.on('click', handler);
    }));
    showCustomPopup('Create Node Compressor', '<p>Select the node that should be converted into a compressor.</p>', [
      { text: 'Cancel', type: 'secondary', keepOpen: true, onClick: cancelCreateCompressor }
    ]);
    if (typeof dockCustomPopupBottomRight === 'function') dockCustomPopupBottomRight();
  }

  function updateLineSelectionPopup() {
    showCustomPopup(
      'Create Line Compressor',
      `<p>Select 1–${MAX_LINE_SELECTION} pipeline segments.</p><p><strong>Selected:</strong> ${selectedPipelines.length}</p>`,
      [
        { text: 'Cancel', type: 'secondary', keepOpen: true, onClick: cancelCreateCompressor },
        ...(selectedPipelines.length ? [{
          text: 'Choose Compressor Location',
          type: 'primary',
          keepOpen: true,
          onClick: beginLocationSelection
        }] : [])
      ]
    );
    if (typeof dockCustomPopupBottomRight === 'function') dockCustomPopupBottomRight();
  }

  function beginLineSelection() {
    workflowType = 'line';
    const pipelines = pipelineFeatureLayers();
    if (!pipelines.length) {
      showErrorPopup('No selectable pipeline layers are loaded.', 'Create Compressor');
      cancelCreateCompressor();
      return;
    }
    pipelines.forEach(layer => {
      const handler = event => {
        if (!createCompressorMode || workflowType !== 'line') return;
        event.originalEvent?.stopPropagation?.();
        const index = selectedPipelines.indexOf(layer);
        if (index >= 0) {
          selectedPipelines.splice(index, 1);
          if (layer._createCompressorStyle) layer.setStyle(layer._createCompressorStyle);
        } else {
          if (selectedPipelines.length >= MAX_LINE_SELECTION) {
            showInfoPopup(`A maximum of ${MAX_LINE_SELECTION} pipelines can be selected.`, 'Create Compressor');
            return;
          }
          layer._createCompressorStyle = {
            color: layer.options.color,
            weight: layer.options.weight,
            opacity: layer.options.opacity,
            dashArray: layer.options.dashArray
          };
          selectedPipelines.push(layer);
          layer.setStyle({ color: '#ff8c00', weight: Math.max(6, (layer.options.weight || 3) + 3), opacity: 1 });
        }
        updateLineSelectionPopup();
      };
      boundPipelineLayers.push({ layer, handler });
      layer.on('click', handler);
    });
    updateLineSelectionPopup();
  }

  function beginLocationSelection() {
    if (!selectedPipelines.length) return;
    closeCustomPopup();
    workflowType = 'location';
    map.getContainer().style.cursor = 'crosshair';
    locationClickHandler = event => {
      if (!createCompressorMode || workflowType !== 'location') return;
      const undoGroup = window.QGasUndo?.beginGroup?.('Create Compressor');
      try { createLineCompressor(event.latlng); } catch (error) {
        console.error('Create line compressor failed:', error);
        showErrorPopup(error.message, 'Create Compressor');
      } finally {
        window.QGasUndo?.endGroup?.(undoGroup);
      }
    };
    map.on('click', locationClickHandler);
    showCustomPopup('Choose Compressor Location', '<p>Click the desired main-compressor location on the map.</p>', [
      { text: 'Cancel', type: 'secondary', keepOpen: true, onClick: cancelCreateCompressor }
    ]);
    if (typeof dockCustomPopupBottomRight === 'function') dockCustomPopupBottomRight();
  }

  function startCreateCompressor() {
    createCompressorMode = true;
    selectedPipelines = [];
    showCustomPopup(
      'Create Compressor',
      '<p>Choose how the compressor should be connected.</p>',
      [
        { text: 'Node Compressor', type: 'primary', keepOpen: true, onClick: beginNodeSelection },
        { text: 'Line Compressor', type: 'primary', keepOpen: true, onClick: beginLineSelection },
        { text: 'Cancel', type: 'secondary', keepOpen: true, onClick: cancelCreateCompressor }
      ]
    );
  }

  window.activateCreateCompressorTool = function activateCreateCompressorTool() {
    if (typeof deactivateAllModes === 'function') deactivateAllModes();
    currentMode = 'create-compressor';
    startCreateCompressor();
  };

  window.cancelCreateCompressor = cancelCreateCompressor;
})();
