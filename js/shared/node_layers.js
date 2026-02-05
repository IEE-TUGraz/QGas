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
 * - Primary Author: Marco Quantschnig, BSc.
 * - Institution: Institute of Electricity Economics and Energy Innovation (IEE),
 *                Graz University of Technology (TU Graz)
 * - Created: August 2025
 * - License: See LICENSE file
 * 
 * ================================================================================
 */

// Shared helper loaded early so tools can call getAllNodeLayers() reliably.
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
      // legacy fallbacks
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
    // If core defined getAllNodeLayers on window already, use it
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
      // legacy fallbacks
      if (window.nodeLayer) entries.push({ key: 'nodeLayer', label: 'Nodes', layer: window.nodeLayer, meta: { geometryClass: 'node' } });
      if (window.hydrogenNodeLayer) entries.push({ key: 'hydrogenNodeLayer', label: 'H2 Nodes', layer: window.hydrogenNodeLayer, meta: { geometryClass: 'node' } });
    } catch (e) {}
    
    // De-duplicate by layer reference to avoid processing same layer multiple times
    const seen = new Set();
    return entries.filter(e => {
      if (!e.layer) return false;
      if (seen.has(e.layer)) return false;
      seen.add(e.layer);
      return true;
    });
  };

})();
