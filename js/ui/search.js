/**
 * QGas object-ID search.
 * Finds features in currently active map layers without changing visibility.
 */
(function () {
  function getFeatureId(layer) {
    const properties = layer?.feature?.properties;
    if (!properties) return '';
    const value = properties.ID ?? properties.id;
    return value === null || value === undefined ? '' : String(value).trim();
  }

  function findActiveLayerById(requestedId) {
    const target = String(requestedId || '').trim().toLowerCase();
    if (!target || typeof map === 'undefined') return null;
    const visited = new Set();
    let match = null;

    function visit(layer) {
      if (!layer || match || visited.has(layer)) return;
      visited.add(layer);
      if (getFeatureId(layer).toLowerCase() === target) {
        match = layer;
        return;
      }
      if (typeof layer.eachLayer === 'function') {
        try { layer.eachLayer(visit); } catch (error) {
          console.warn('Could not inspect a map layer during ID search.', error);
        }
      }
    }

    map.eachLayer(visit);
    return match;
  }

  function centerOnSearchResult(layer) {
    if (!layer || typeof map === 'undefined') return;
    const geometryType = layer.feature?.geometry?.type || '';
    const isLine = geometryType === 'LineString' || geometryType === 'MultiLineString';

    if (typeof resetAllPipelineHighlights === 'function') resetAllPipelineHighlights();
    if (typeof resetAllElementHighlights === 'function') resetAllElementHighlights();

    if (isLine && typeof highlightPipeline === 'function') {
      highlightPipeline(layer);
    } else if (typeof highlightElement === 'function') {
      highlightElement(layer);
    }

    if (typeof layer.bringToFront === 'function') layer.bringToFront();
    if (typeof layer.getBounds === 'function') {
      const bounds = layer.getBounds();
      if (bounds?.isValid?.()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true });
        return;
      }
    }
    if (typeof layer.getLatLng === 'function') {
      const latlng = layer.getLatLng();
      if (latlng) map.setView(latlng, Math.max(map.getZoom(), 12), { animate: true });
    }
  }

  function searchObjectById() {
    const input = document.getElementById('object-search-input');
    const requestedId = input?.value?.trim() || '';
    if (!requestedId) {
      input?.focus();
      return;
    }
    const layer = findActiveLayerById(requestedId);
    if (!layer) {
      if (typeof showInfoPopup === 'function') {
        showInfoPopup(`No active object with ID "${requestedId}" was found.`, 'Find Object');
      }
      return;
    }
    centerOnSearchResult(layer);
  }

  window.searchObjectById = searchObjectById;
  function initializeObjectSearch() {
    const input = document.getElementById('object-search-input');
    const button = document.getElementById('object-search-button');
    button?.addEventListener('click', searchObjectById);
    input?.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      searchObjectById();
    });
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initializeObjectSearch, { once: true });
  } else {
    initializeObjectSearch();
  }
})();
