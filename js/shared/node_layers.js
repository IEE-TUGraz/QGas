/**
 * ================================================================================
 * QGas - Node Layers Shared Module
 * ================================================================================
 * 
 * Provides centralized utilities for discovering and managing node layers across
 * the application. This module is loaded early in the initialization sequence to
 * ensure tools and other modules can reliably access node layer information.
 * 
 * Key Responsibilities:
 * - Discover all node/point layers in the system
 * - Provide unified interface for node layer queries
 * - Support both dynamic and legacy layer systems
 * - Handle fallback scenarios gracefully
 * 
 * Usage:
 * - getAllNodeLayers() - Returns array of all node layer objects
 * - getNodeLayerEntries() - Returns detailed node layer entries with metadata
 * 
 * This module uses an IIFE (Immediately Invoked Function Expression) to avoid
 * polluting the global scope while exposing necessary functions.
 * 
 * Development Information:
 * - Author: Dipl.-Ing. Marco Quantschnig
 * - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz
 * - Created: August 2025
 * - License: See LICENSE file
 * - Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - Global layer registries (dynamicLayers, layerMetadataRegistry).
 * - Legacy layer references (nodeLayer, hydrogenNodeLayer).
 *
 * Public API:
 * - getAllNodeLayers(): Return all discovered node layers.
 * - getNodeLayerEntries(): Return node layer entries with metadata.
 * 
 * ================================================================================
 */

/*
 * Shared helper loaded early so tools can call getAllNodeLayers() reliably.
 */
(function () {
  
  /**
   * Fallback scan for node layers when core functions are not yet available
   * Searches through dynamicLayers and legacy layer references
   * @returns {Array} Array of node layer objects
   */
  function fallbackScan() {
    const out = [];
    const seen = new Set();
    const push = (l) => { if (l && !seen.has(l)) { seen.add(l); out.push(l); } };
    try {
      if (window.dynamicLayers && window.layerMetadataRegistry) {
        for (const [k, layer] of Object.entries(window.dynamicLayers)) {
          const meta = window.layerMetadataRegistry[k];
          if (meta && (meta.geometryClass === 'node' || meta.geometryClass === 'point')) push(layer);
        }
      }
      /* Legacy fallbacks for pre-dynamic layer setups. */
      if (window.nodeLayer) push(window.nodeLayer);
      if (window.hydrogenNodeLayer) push(window.hydrogenNodeLayer);
    } catch (e) {}
    return out;
  }
  
  /**
   * Get all node layers from the system
   * Attempts to use core functions first, falls back to scanning if unavailable
   * @returns {Array} Array of all node/point layer objects
   */
  window.getAllNodeLayers = function getAllNodeLayers() {
    if (typeof window.__coreGetAllNodeLayers === 'function') {
      try { return window.__coreGetAllNodeLayers() || []; } catch (e) { return fallbackScan(); }
    }
    /* Use a core-defined global alias when present. */
    if (typeof window._core_getAllNodeLayers === 'function') {
      try { return window._core_getAllNodeLayers() || []; } catch (e) { return fallbackScan(); }
    }
    return fallbackScan();
  };

  /**
   * Get detailed node layer entries with metadata
   * Returns an array of objects containing key, label, layer reference, and metadata
   * @returns {Array} Array of node layer entry objects {key, label, layer, meta}
   */
  window.getNodeLayerEntries = function getNodeLayerEntries() {
    const entries = [];
    try {
      if (window.dynamicLayers && window.layerMetadataRegistry) {
        for (const [key, layer] of Object.entries(window.dynamicLayers)) {
          const meta = window.layerMetadataRegistry[key];
          if (!meta) continue;
          const cls = meta.geometryClass || meta.type || meta.geometry_type;
          if (cls === 'node' || cls === 'Node' || cls === 'point' || cls === 'Point') {
            const label = meta.legendLabel || meta.displayName || meta.name || key;
            entries.push({ key, label, layer, meta });
          }
        }
      }
      /* Legacy fallbacks when metadata entries are missing. */
      if (window.nodeLayer) entries.push({ key: 'nodeLayer', label: 'Nodes', layer: window.nodeLayer, meta: { geometryClass: 'node' } });
      if (window.hydrogenNodeLayer) entries.push({ key: 'hydrogenNodeLayer', label: 'H2 Nodes', layer: window.hydrogenNodeLayer, meta: { geometryClass: 'node' } });
    } catch (e) {}
    
    /* De-duplicate by layer reference to avoid processing layers twice. */
    const seen = new Set();
    return entries.filter(e => {
      if (!e.layer) return false;
      if (seen.has(e.layer)) return false;
      seen.add(e.layer);
      return true;
    });
  };

})();
