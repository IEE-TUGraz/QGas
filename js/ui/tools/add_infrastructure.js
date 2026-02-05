/**
 * ================================================================================
 * QGas - Add Infrastructure Tool
 * ================================================================================
 * 
 * Enables placement of new infrastructure points (compressors, storages, LNG
 * terminals, power plants, etc.) on the map with optional node connectivity.
 * 
 * Key Features:
 * - Interactive point placement via map click
 * - Optional connection to existing nodes
 * - Automatic ID generation with contributor tracking
 * - Support for multiple infrastructure types
 * - Continuous placement workflow (add multiple points)
 * - Confirmation dialogs with user-friendly prompts
 * 
 * Workflow:
 * 1. User activates tool and chooses connection preference
 * 2. Selects infrastructure type from available layers
 * 3. Clicks map to place point
 * 4. Point is created with auto-generated ID
 * 5. Optional: Continue placing more points or return to info mode
 * 
 * Infrastructure Types:
 * - Compressors
 * - Storage facilities
 * - LNG terminals
 * - Power plants
 * - Custom infrastructure types from dynamic layers
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

// Add Infrastructure tool module
(function(){
  /**
   * Activate the Add Infrastructure tool
   * Presents user with connection options and initiates placement workflow
   */
  window.activateAddInfrastructureTool = function activateAddInfrastructureTool() {

      if (!checkContributorName()) return;
      deactivateAllModes();
      currentMode = 'add-infrastructure';
      
      // Callback für nach Punkt-Erstellung registrieren
      window.onInfrastructurePointCreated = function() {
        // Kurze Verzögerung, damit das vorherige Popup Zeit hat sich zu schließen
        setTimeout(() => {
          showCustomPopup(
            '✅ Infrastructure Point Added',
            '<p style="text-align: center; margin: 15px 0;">Infrastructure point created successfully!<br><br>Do you want to place another infrastructure point?</p>',
            [
              {
                text: 'Yes, Continue',
                type: 'primary',
                keepOpen: false,
                onClick: () => {
                  // Callback löschen und Workflow neu starten
                  delete window.onInfrastructurePointCreated;
                  // Kurze Verzögerung bevor Workflow neu gestartet wird
                  setTimeout(() => {
                    activateAddInfrastructureTool();
                  }, 50);
                }
              },
              {
                text: 'No, Finish',
                type: 'secondary',
                keepOpen: false,
                onClick: () => {
                  // Callback löschen bevor Info Mode aktiviert wird
                  delete window.onInfrastructurePointCreated;
                  // Zurück zum Info Mode mit force=true um Event Handler neu zu setzen
                  currentMode = 'info';
                  activateInfoMode(true);
                  selectTool('info');
                }
              }
            ]
          );
        }, 100);
      };
      
      showCustomPopup(
        '🏭 Add Infrastructure',
        '<p style="text-align: center; margin: 15px 0;">Do you want to connect this infrastructure to an existing node?</p>',
        [
          {
            text: 'Yes',
            type: 'primary',
            keepOpen: true,
            onClick: () => {
              window.selectedNodeForInfrastructure = null;
              showCustomPopup(
                '🎯 Select Node',
                '<p style="text-align: center; margin: 15px 0;">Click "Start Selection" to select a node.</p>',
                [
                  {
                    text: 'Start Selection',
                    type: 'primary',
                    keepOpen: true,
                    onClick: () => {
                      closeCustomPopup();
                      if (!window.getAllNodeLayers().length) {
                        showInfoPopup('No Nodes', '<p style="text-align:center;">No node layers available for selection.</p>');
                        return;
                      }
                      setNodeSelectionHandlers((marker) => {
                        clearNodeSelectionHandlers();
                        window.selectedNodeForInfrastructure = marker.feature?.properties?.ID;
                        showCustomPopup(
                          '✅ Node Selected',
                          `<p style="text-align: center; margin: 15px 0;">Node selected: ${window.selectedNodeForInfrastructure}<br>Now place your infrastructure point on the map.</p>`,
                          [{text: 'OK', type: 'primary', keepOpen: true, onClick: () => {closeCustomPopup(); activateManualInfrastructurePlacement();}}]
                        );
                      });
                    }
                  },
                  {text: 'Cancel', type: 'secondary', onClick: () => {
                    currentMode = 'info';
                    activateInfoMode();
                    selectTool('info');
                    delete window.onInfrastructurePointCreated;
                  }}
                ]
              );
            }
          },
          {
            text: 'No',
            type: 'secondary',
            keepOpen: true,
            onClick: () => {
              window.selectedNodeForInfrastructure = null;
              closeCustomPopup();
              activateManualInfrastructurePlacement();
            }
          }
        ]
      );
        };
})();
