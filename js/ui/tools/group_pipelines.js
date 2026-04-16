/**
 * ================================================================================
 * QGas - Group Pipelines Tool
 * ================================================================================
 * 
 * Allows users to logically group multiple pipeline segments into named groups
 * for organizational and analytical purposes.
 * 
 * Key Features:
 * - Named pipeline groups
 * - Visual selection with color coding
 * - Automatic total length calculation
 * - Start/end point tracking
 * - Group metadata storage
 * - Multi-segment selection
 * 
 * Workflow:
 * 1. User enters group name
 * 2. Selects multiple pipeline segments by clicking
 * 3. Selected pipelines show visual highlight
 * 4. Group is saved with metadata (name, length, endpoints)
 * 5. Group data available for export and analysis
 * 
 * Technical Details:
 * - Calculates total length from all segments
 * - Tracks first start point and last end point
 * - Stores group information in pipelineGroups array
 * - Maintains visual feedback during selection
 * 
 * Development Information:
 * - Authors: Marco Quantschnig, Yannick Werner, Sonja Wogrin and Thomas Klatzer
 * - Institution: Institute of Electricity Economics and Energy Innovation (IEE), Graz University of Technology, Inffeldgasse 18, Graz, 8010, Austria
 * - Created: August 2025
 * - License: See LICENSE file
 * - Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - Selected pipeline segments and group naming.
 * - Map layers for selection highlighting.
 *
 * Public API:
 * - activateGroupPipelinesTool(): Begin grouping workflow.
 * 
 * ================================================================================
 */

/* ================================================================================
 * STATE MANAGEMENT
 * ================================================================================
 */
let groupingMode = false;
let currentGroupName = '';
let selectedPipelinesForGroup = [];

function __computeLineLengthKm(layer) {
  try {
    if (!layer) return 0;
    const props = (layer.feature && layer.feature.properties) ? layer.feature.properties : {};
    const raw = (props.Length_km ?? props.length_km ?? props.LENGTH_KM ?? null);
    const num = raw !== null ? parseFloat(raw) : NaN;
    if (!isNaN(num) && isFinite(num)) return num;
    if (typeof layer.getLatLngs === 'function' && typeof map !== 'undefined' && map && typeof map.distance === 'function') {
      const latlngs = layer.getLatLngs();
      const flatten = (arr) => Array.isArray(arr) ? arr.flat(Infinity) : [];
      const pts = flatten(latlngs).filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number');
      let meters = 0;
      for (let i = 1; i < pts.length; i++) {
        meters += map.distance(pts[i-1], pts[i]);
      }
      return meters / 1000;
    }
    return 0;
  } catch (e) {
    console.error('Group Pipelines: length calc failed', e);
    return 0;
  }
}

let groupStartPoint = null;
let groupEndPoint = null;

/**
 * Start the pipeline grouping workflow.
 *
 * Deactivates all active modes, prompts the user to enter a group name,
 * and then guides them through selecting a set of pipeline segments and
 * optionally specifying a start and end node. The resulting group is
 * stored in the <code>pipelineGroups</code> array with metadata (name,
 * pipeline IDs, total length, element count) and persisted to the project
 * state. The group can later be highlighted via {@link highlightGroup}.
 *
 * @returns {void}
 */
function startPipelineGrouping() {
  deactivateAllModes();
  
  /* Step 1: request the group name. */
  const groupNameInput = document.createElement('input');
  groupNameInput.type = 'text';
  groupNameInput.placeholder = 'Enter group name';
  groupNameInput.style.width = '100%';
  groupNameInput.style.padding = '10px';
  groupNameInput.style.border = '1px solid #ccc';
  groupNameInput.style.borderRadius = '4px';
  groupNameInput.style.marginTop = '10px';
  groupNameInput.style.fontSize = '14px';
  groupNameInput.style.boxSizing = 'border-box';
  
  showCustomPopup(
    '📦 Group Pipelines - Step 1',
    '<p style="text-align: center; margin: 15px 0;">Enter a name for this pipeline group:</p>',
    [
      {
        text: 'Next',
        type: 'primary',
        keepOpen: true,
        onClick: () => {
          const groupName = document.querySelector('#custom-popup input').value.trim();
          if (!groupName) {
            showInfoPopup('Please enter a group name.', '📦 Group Pipelines');
            return;
          }
          currentGroupName = groupName;
          closeCustomPopup();
          startPipelineSelection();
        }
      },
      {text: 'Cancel', type: 'secondary', onClick: () => {cancelGrouping();}}
    ],
    groupNameInput
  );
}

function startPipelineSelection() {
  groupingMode = false; // Noch nicht aktiv
  selectedPipelinesForGroup = [];
  
  /* Step 2: start selection. */
  showCustomPopup(
    '📦 Group Pipelines - Step 2',
    '<p style="text-align: center; margin: 15px 0;">Click "Start Selection" to begin selecting pipelines.</p>',
    [
      {
        text: 'Start Selection',
        type: 'primary',
        keepOpen: true,
        onClick: () => {
          closeCustomPopup();
          activatePipelineSelection();
        }
      },
      {text: 'Cancel', type: 'secondary', onClick: () => {cancelGrouping();}}
    ]
  );
}

function activatePipelineSelection() {
  groupingMode = true;
  
  /* Reset all pipeline highlights first. */
  resetAllPipelineHighlights();
  
  /* Create the floating Finish Selection button. */
  const finishBtn = document.createElement('button');
  finishBtn.id = 'finish-selection-btn';
  finishBtn.innerHTML = '✅ Finish Selection<br><span id="selected-count" style="font-size: 12px; font-weight: normal;">Selected: 0 pipelines</span>';
  finishBtn.style.position = 'fixed';
  finishBtn.style.bottom = '20px';
  finishBtn.style.left = '50%';
  finishBtn.style.transform = 'translateX(-50%)';
  finishBtn.style.zIndex = '2000';
  finishBtn.style.padding = '15px 30px';
  finishBtn.style.background = '#28a745';
  finishBtn.style.color = 'white';
  finishBtn.style.border = 'none';
  finishBtn.style.borderRadius = '8px';
  finishBtn.style.fontSize = '16px';
  finishBtn.style.fontWeight = 'bold';
  finishBtn.style.cursor = 'pointer';
  finishBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  finishBtn.style.transition = 'all 0.3s';
  
  finishBtn.onmouseover = () => {
    finishBtn.style.transform = 'translateX(-50%) translateY(-3px)';
    finishBtn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
  };
  finishBtn.onmouseout = () => {
    finishBtn.style.transform = 'translateX(-50%)';
    finishBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  };
  
  finishBtn.onclick = () => {
    if (selectedPipelinesForGroup.length === 0) {
      showInfoPopup('Please select at least one pipeline.', '📦 Group Pipelines');
      return;
    }
    document.body.removeChild(finishBtn);
    finalizeGrouping();
  };
  
  document.body.appendChild(finishBtn);
  
  /* Pipeline click handler (all line layers). */
  const __lineLayers = (typeof getAllLineLayers === 'function' ? getAllLineLayers() : (typeof pipelineLayer !== 'undefined' && pipelineLayer ? [pipelineLayer] : []));
  __lineLayers.forEach(__group => {
    if (!__group) return;
    forEachPolylineFeature(__group, layer => {
      layer.off('click');
      layer.on('click', function(e) {
        if (!groupingMode) return;
        
        const pipelineId = layer.feature.properties.ID;
        const index = selectedPipelinesForGroup.findIndex(p => p.id === pipelineId);
        
        if (index === -1) {
          /* Add selection. */
          selectedPipelinesForGroup.push({
            id: pipelineId,
            layer: layer
          });
          /* Use direct DOM manipulation for styling. */
          if (layer._path) {
            layer._path.style.stroke = 'orange';
            layer._path.style.strokeWidth = '5';
          }
          /* Also try setStyle as fallback. */
          layer.setStyle({color: 'orange', weight: 5});
        } else {
          /* Remove selection and restore original colors. */
          selectedPipelinesForGroup.splice(index, 1);
          const originalColor = layer._originalColor || '#3388ff';
          const originalWeight = layer._originalWeight || 3;
          const originalOpacity = layer._originalOpacity || 0.8;
          const originalDashArray = layer._originalDashArray || null;
          
          if (layer._path) {
            layer._path.style.stroke = originalColor;
            layer._path.style.strokeWidth = String(originalWeight);
          }
          layer.setStyle({
            color: originalColor,
            weight: originalWeight,
            opacity: originalOpacity,
            dashArray: originalDashArray
          });
        }
        
        /* Update selection counter. */
        const countSpan = document.getElementById('selected-count');
        if (countSpan) {
          countSpan.textContent = `Selected: ${selectedPipelinesForGroup.length} pipelines`;
        }
        
        L.DomEvent.stopPropagation(e);
      });
    });
  });
}

function selectStartPoint() {
  showCustomPopup(
    '📦 Group Pipelines - Step 3',
    '<p style="text-align: center; margin: 15px 0;">Click "Start Selection" to select the <strong>Start Point</strong> node.</p>',
    [
      {
        text: 'Start Selection',
        type: 'primary',
        keepOpen: true,
        onClick: () => {
          closeCustomPopup();
          activateStartPointSelection();
        }
      },
      {text: 'Cancel', type: 'secondary', onClick: () => {cancelGrouping();}}
    ]
  );
}

function activateStartPointSelection() {
  setNodeSelectionHandlers(marker => {
    clearNodeSelectionHandlers();
    const feature = marker.feature || {};
    const props = feature.properties || {};
    groupStartPoint = props.ID;
    selectEndPoint();
  });
}

function selectEndPoint() {
  showCustomPopup(
    '📦 Group Pipelines - Step 4',
    '<p style="text-align: center; margin: 15px 0;">Click "Start Selection" to select the <strong>End Point</strong> node.</p>',
    [
      {
        text: 'Start Selection',
        type: 'primary',
        keepOpen: true,
        onClick: () => {
          closeCustomPopup();
          activateEndPointSelection();
        }
      },
      {text: 'Cancel', type: 'secondary', onClick: () => {cancelGrouping();}}
    ]
  );
}

function activateEndPointSelection() {
  setNodeSelectionHandlers(marker => {
    clearNodeSelectionHandlers();
    const feature = marker.feature || {};
    const props = feature.properties || {};
    groupEndPoint = props.ID;
    finalizePipelineGroup();
  });
}

function finalizePipelineGroup() {
  /* Order pipelines by flow between start and end points. */
  const orderedPipelines = orderPipelinesByFlow(selectedPipelinesForGroup, groupStartPoint, groupEndPoint);
  
  /* Compute total length. */
  let totalLength = 0;
  orderedPipelines.forEach(p => {
    totalLength += __computeLineLengthKm(p.layer);
  });
  
  /* Persist group metadata. */
  const newGroup = {
    name: currentGroupName,
    pipelines: orderedPipelines.map(p => p.id),
    startPoint: groupStartPoint,
    endPoint: groupEndPoint,
    totalLength: totalLength.toFixed(2),
    numElements: orderedPipelines.length
  };
  
  pipelineGroups.push(newGroup);
  
  /* Restore original layer styles. */
  selectedPipelinesForGroup.forEach(p => {
    const originalColor = p.layer._originalColor || '#3388ff';
    const originalWeight = p.layer._originalWeight || 3;
    const originalOpacity = p.layer._originalOpacity || 0.8;
    const originalDashArray = p.layer._originalDashArray || null;
    
    /* Reset Leaflet style and direct DOM manipulation. */
    if (p.layer._path) {
      p.layer._path.style.stroke = originalColor;
      p.layer._path.style.strokeWidth = String(originalWeight);
    }
    p.layer.setStyle({
      color: originalColor,
      weight: originalWeight,
      opacity: originalOpacity,
      dashArray: originalDashArray
    });
  });
  
  /* Reset grouping state. */
  groupingMode = false;
  selectedPipelinesForGroup = [];
  currentGroupName = '';
  groupStartPoint = null;
  groupEndPoint = null;
  
  showCustomPopup(
    '✅ Group Created',
    `<p style="text-align: center; margin: 15px 0;">Group "<strong>${newGroup.name}</strong>" created successfully!<br><br>Elements: ${newGroup.numElements}<br>Total Length: ${newGroup.totalLength} km</p>`,
    [{text: 'OK', type: 'primary', onClick: () => {
      currentMode = 'info';
      activateInfoMode(true);
      selectTool('info');
    }}]
  );
  
  console.log('Pipeline group created:', newGroup);
}

function orderPipelinesByFlow(pipelines, startNode, endNode) {
  /* Orient pipelines based on flow along the path. */
  const ordered = [];
  let currentNode = startNode;
  const remaining = [...pipelines];
  
  while (remaining.length > 0) {
    let found = false;
    
    for (let i = 0; i < remaining.length; i++) {
      const p = remaining[i];
      const props = p.layer.feature.properties;
      
      if (props.Start_Node === currentNode) {
        /* Correct orientation. */
        ordered.push(p);
        currentNode = props.End_Node;
        remaining.splice(i, 1);
        found = true;
        break;
      } else if (props.End_Node === currentNode) {
        /* Reverse orientation. */
        const temp = props.Start_Node;
        props.Start_Node = props.End_Node;
        props.End_Node = temp;
        
        /* Reverse the LatLng order. */
        const latlngs = p.layer.getLatLngs();
        p.layer.setLatLngs(latlngs.reverse());
        
        /* Mark modified. */
        props.modified = true;
        
        ordered.push(p);
        currentNode = props.End_Node;
        remaining.splice(i, 1);
        found = true;
        break;
      }
    }
    
    if (!found) {
      console.warn('Could not connect all pipelines in sequence');
      /* Append remaining pipelines without ordering. */
      ordered.push(...remaining);
      break;
    }
  }
  
  return ordered;
}

function cancelGrouping() {
  groupingMode = false;
  
  /* Reset styles using direct DOM manipulation. */
  selectedPipelinesForGroup.forEach(p => {
    if (p.layer._path) {
      p.layer._path.style.stroke = '#3388ff';
      p.layer._path.style.strokeWidth = '3';
    }
    p.layer.setStyle({color: '#3388ff', weight: 3});
  });
  
  selectedPipelinesForGroup = [];
  currentGroupName = '';
  groupStartPoint = null;
  groupEndPoint = null;
  
  /* Remove the Finish Selection button if present. */
  const finishBtn = document.getElementById('finish-selection-btn');
  if (finishBtn) {
    document.body.removeChild(finishBtn);
  }
  
  /* Remove click handlers. */
  if (pipelineLayer) {
    pipelineLayer.eachLayer(layer => {
      layer.off('click');
    });
  }
  clearNodeSelectionHandlers();
  
  /* Switch back to Info mode. */
  currentMode = 'info';
  activateInfoMode();
  selectTool('info');
}

