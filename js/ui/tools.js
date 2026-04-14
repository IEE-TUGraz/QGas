/**
 * ================================================================================
 * QGas - Tools UI Module
 * ================================================================================
 * 
 * Manages the tools popup interface and dispatches tool activation commands.
 * This module provides the user interface for selecting and switching between
 * different editing and interaction modes in the QGas application.
 * 
 * Key Responsibilities:
 * - Tool popup UI management (open/close)
 * - Active tool state tracking and display
 * - Tool selection and mode switching
 * - Contributor name validation
 * - Tool dispatcher for various editing modes
 * 
 * Available Tools:
 * - Info Mode: View element information
 * - Edit Geometry: Modify element positions
 * - Add Pipeline: Create new pipeline segments
 * - Add Infrastructure: Place new infrastructure points
 * - Change Direction: Reverse pipeline flow direction
 * - Short Pipe: Create short connecting pipes
 * - Delete: Remove elements from the map
 * - Group Pipelines: Combine multiple pipelines
 * - Switch Sublayer: Change element layer assignment
 * - Add Plan: Manage infrastructure plans
 * - Divide Pipeline: Split pipelines at points
 * - Add New Element: Create custom elements
 * - Integrate Dataset: Import external data
 * - Split Node: Divide nodes for network restructuring
 * - Reconnect Infrastructure: Update element connections
 * - Distribute Compressors: Auto-place compressors
 * 
 * Global Scope: This module maintains global scope for compatibility with
 * inline HTML event handlers (e.g., onclick="openToolsPopup()")
 * 
 * Development Information:
 * - Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin
 * - Institution: Institute of Electricity Economics and Energy Innovation (IEE), Graz University of Technology, Inffeldgasse 18, Graz, 8010, Austria
 * - Created: August 2025
 * - License: See LICENSE file
 * - Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - DOM elements for the tools popup and tiles.
 * - Global tool activation functions (e.g., activateInfoTool).
 *
 * Public API:
 * - openToolsPopup(): Open the tools selection overlay.
 * - closeToolsPopup(): Close the tools selection overlay.
 * - selectTool(mode): Activate a tool by mode identifier.
 * - updateActiveToolDisplay(mode): Update the active tool label.
 * 
 * ================================================================================
 */

/* ================================================================================
 * ACTIVE TOOL STATE
 * ================================================================================
 * Tracks the active tool for UI highlighting and mode management.
 */
let currentActiveTool = 'info';

/**
 * Update the active tool display in the UI
 * @param {string} mode - Tool mode identifier
 */
function updateActiveToolDisplay(mode) {
  const displayElement = document.getElementById('active-tool-display');
  if (!displayElement) return;
  
  const modeNames = {
    'info': 'ℹ️ Info Mode',
    'edit': '✏️ Edit Geometry',
    'add-pipeline': '➕ Add Pipeline',
    'add-infrastructure': '🏭 Add Infrastructure',
    'change-direction': '🔄 Change Direction',
    'short-pipe': '📏 Short Pipe',
    'delete': '🗑️ Delete',
    'group-pipelines': '📦 Group Pipelines',
    'switch-sublayer': '🧩 Switch to Sublayer',
    'add-plan': '🗺️ Add Infrastructure Plans',
    'divide-pipeline': '✂️ Divide Pipeline',
    'add-new-element': '➕ Add New Element',
    'integrate-dataset': '🔗 Integrate Dataset',
    'split-node': '🔀 Split Node',
    'reconnect-infrastructure': '🔌 Reconnect Infrastructure',
    'distribute-compressors': '🔄 Distribute Compressors',
    'topology-check': '🧭 Topology Check'
  };
  
  displayElement.textContent = modeNames[mode] || 'ℹ️ Info Mode';
}

/* ================================================================================
 * TOOLS POPUP MANAGEMENT
 * ================================================================================
 */

/**
 * Open the tools selection popup
 * Displays all available tools and highlights the currently active one
 */
function openToolsPopup() {
  document.getElementById('tools-popup-overlay').style.display = 'block';
  document.getElementById('tools-popup').style.display = 'block';
  
  /* Mark currently active tool with visual highlight. */
  document.querySelectorAll('.tool-tile').forEach(tile => {
    tile.classList.remove('active');
    if (tile.dataset.mode === currentActiveTool) {
      tile.classList.add('active');
    }
  });
}

/**
 * Close the tools selection popup
 */
function closeToolsPopup() {
  document.getElementById('tools-popup-overlay').style.display = 'none';
  document.getElementById('tools-popup').style.display = 'none';
}

/* ================================================================================
 * TOOL SELECTION AND DISPATCH
 * ================================================================================
 */

/**
 * Select and activate a specific tool mode
 * @param {string} mode - Tool identifier (e.g., 'info', 'edit', 'add-pipeline')
 */
function selectTool(mode) {
  currentActiveTool = mode;
  
  /* Reset all tile highlights. */
  document.querySelectorAll('.tool-tile').forEach(tile => {
    tile.classList.remove('active');
  });
  
  /* Mark the active tool tile. */
  const activeTile = document.querySelector(`.tool-tile[data-mode="${mode}"]`);
  if (activeTile) activeTile.classList.add('active');
  
  /* Update the active tool display. */
  updateActiveToolDisplay(mode);
  
  /* Dispatch tool logic. */
  switch(mode) {
    case 'info':
      activateInfoTool();
      break;
    case 'edit':
      if (!checkContributorName()) return;
      deactivateAllModes();
      try {
        if (typeof activateEditMode === "function") {
          activateEditMode();
        } else if (window.activateEditMode && typeof window.activateEditMode === "function") {
          window.activateEditMode();
        } else {
          console.error("Edit Geometry: activateEditMode is not defined");
        }
      } catch (e) {
        console.error("Error starting Edit Geometry:", e);
      }
      break;
    case 'add-pipeline':
      if (!checkContributorName()) return;
      deactivateAllModes();
      currentMode = 'add-pipeline';
      promptPipelineLayerSelection(() => {
        setTimeout(() => {
          try {
            proceedWithAddPipeline();
          } catch (error) {
            console.error('Error in proceedWithAddPipeline:', error);
          }
        }, 0);
      }, () => {
        currentMode = 'info';
        activateInfoMode();
      });
      break;
    case 'add-infrastructure':
      activateAddInfrastructureTool();
      break;
    case 'change-direction':
      if (!checkContributorName()) return;
      deactivateAllModes();
      currentMode = 'change-direction';
      showCustomPopup(
        '🔄 Change Direction',
        '<p style="text-align: center; margin: 15px 0;">Click "Start" to begin changing pipeline directions.</p>',
        [
          {
            text: 'Start',
            type: 'primary',
            keepOpen: true,
            onClick: () => {
              closeCustomPopup();
              const activated = activateChangeDirectionMode();
              if (!activated) {
                currentMode = 'info';
                activateInfoMode();
                return;
              }
              showSaveDirectionButton();
              showDiscardDirectionButton();
            }
          },
          {text: 'Cancel', type: 'secondary', onClick: () => {}}
        ]
      );
      break;
    case 'short-pipe':
      if (!checkContributorName()) return;
      deactivateAllModes();
      currentMode = 'short-pipe';
      startShortPipeSelection();
      break;
    case 'delete':
      if (!checkContributorName()) return;
      deactivateAllModes();
      currentMode = 'delete'; // Set mode before popup
      showCustomPopup(
        '🗑️ Delete Mode',
        '<p style="text-align: center; margin: 15px 0;">Click "Start" to begin deleting elements.</p>',
        [
          {
            text: 'Start',
            type: 'primary',
            keepOpen: true,
            onClick: () => {
              closeCustomPopup();
              activateDeleteMode();
              showSaveDeleteButton();
              showDiscardDeleteButton();
            }
          },
          {text: 'Cancel', type: 'secondary', onClick: () => {
            /* Reset to info mode if canceled. */
            currentMode = 'info';
            activateInfoMode();
          }}
        ]
      );
      break;
    case 'group-pipelines':
      if (!checkContributorName()) return;
      startPipelineGrouping();
      break;
    case 'switch-sublayer':
      if (!checkContributorName()) return;
      activateSwitchSublayerTool();
      break;
    case 'add-plan':
      if (!checkContributorName()) return;
      activateAddPlanTool();
      break;
    case 'divide-pipeline':
      if (!checkContributorName()) return;
      activateDividePipelineTool();
      break;
    case 'split-node':
      if (!checkContributorName()) return;
      activateSplitNodeTool();
      break;
    case 'reconnect-infrastructure':
      if (!checkContributorName()) return;
      activateReconnectInfrastructureTool();
      break;
    case 'distribute-compressors':
      if (!checkContributorName()) return;
      activateDistributeCompressorsTool();
      break;
    case 'add-new-element':
      if (!checkContributorName()) return;
      activateAddNewElementTool();
      break;
    case 'integrate-dataset':
      if (!checkContributorName()) return;
      activateIntegrateDatasetTool();
      break;
    case 'topology-check':
      activateTopologyCheckTool();
      break;
  }
  
  closeToolsPopup();
}
