/**
 * QGas - Screenshot Module
 *
 * Module Description:
 * Provides a screenshot mode for highlighting elements and preparing the map
 * for manual capture.
 *
 * Author: Dipl.-Ing. Marco Quantschnig
 * Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz
 * Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - DOM elements for tool controls and legend.
 * - Map layers for highlight toggling.
 *
 * Public API:
 * - openScreenshotMode(): Launch the screenshot mode dialog.
 * - activateScreenshotMode(): Enter screenshot mode.
 * - deactivateScreenshotMode(): Exit screenshot mode.
 */
/*
 * Extracted screenshot logic from core.js (v5).
 */

function openScreenshotMode() {
  showCustomPopup(
    '📸 Screenshot Mode',
    '<p style="text-align: center; margin: 15px 0;">Click elements to highlight them, then take a screenshot.<br><strong>Press ESC to exit Screenshot Mode.</strong></p>',
    [
      {
        text: 'Activate Screenshot Mode',
        type: 'primary',
        onClick: () => {
          activateScreenshotMode();
        }
      },
      {
        text: 'Cancel',
        type: 'secondary',
        onClick: () => {}
      }
    ]
  );
}


/*
 * Screenshot mode handlers.
 */
function activateScreenshotMode() {
  try {
    console.log('Aktiviere Screenshot Mode');

    /* Store original legend HTML for restoration. */
    const legendControl = document.querySelector('.legend-control');
    if (legendControl) {
      window._originalLegendHTML = legendControl.innerHTML;
    }

    /* Hide function buttons. */
    const functionBtns = document.querySelectorAll('.function-btn');
    functionBtns.forEach(btn => {
      btn.style.display = 'none';
    });

    /* Hide main menu. */
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) {
      mainMenu.style.display = 'none';
      window._mainMenuWasVisible = true;
    }

    const contributorBox = document.getElementById('contributor-box');
    if (contributorBox) {
      contributorBox.style.display = 'none';
      window._contributorBoxWasVisible = true;
    }

    const citeBtn = document.getElementById('cite-btn');
    if (citeBtn) {
      window._citeBtnDisplay = citeBtn.style.display; // Original speichern
      citeBtn.style.display = 'none';
      window._citeBtnWasVisible = true;
    }

    /* Hide Data and Licensing button. */
    const dataLicensingBtn = document.getElementById('data-licensing-btn');
    if (dataLicensingBtn) {
      window._dataLicensingBtnDisplay = dataLicensingBtn.style.display; // Original speichern
      dataLicensingBtn.style.display = 'none';
      window._dataLicensingBtnWasVisible = true;
    }

    /* Hide top logo container. */
    const topLogo = document.getElementById('top-logo');
    if (topLogo) {
      window._logoDisplay = topLogo.style.display || ''; // Original speichern
      topLogo.style.display = 'none';
      window._logoWasVisible = true;
    }

    /* Hide export and screenshot buttons. */
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.style.display = 'none';
    }

    const screenshotBtn = document.getElementById('screenshot-btn');
    if (screenshotBtn) {
      screenshotBtn.style.display = 'none';
    }

    /* Clean legend: remove checkboxes and show only active layers. */
    if (legendControl) {
      /* Ensure legend remains visible. */
      legendControl.style.display = 'block';
      
      const labels = legendControl.querySelectorAll('label');
      let cleanLegendHTML = '';

      labels.forEach(label => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        const layerName = label.textContent.trim();

        /* Include only active layers (checked checkboxes). */
        if (checkbox && checkbox.checked) {
          /* Remove checkbox and adjust margins to preserve layout. */
          const labelClone = label.cloneNode(true);
          const checkboxClone = labelClone.querySelector('input[type="checkbox"]');
          if (checkboxClone) {
            checkboxClone.remove();
            /* Compensate for the removed checkbox spacing. */
            const firstSpan = labelClone.querySelector('span');
            if (firstSpan) {
              firstSpan.style.marginLeft = '6px';
            }
          }
          cleanLegendHTML += labelClone.outerHTML + '<br>';
        }
      });

      if (cleanLegendHTML) {
        legendControl.innerHTML = cleanLegendHTML;
      } else {
        /* If no layers are checked, show a placeholder message. */
        legendControl.innerHTML = '<div style="padding: 5px;">No active layers</div>';
      }
      
      console.log('Legend HTML in screenshot mode:', legendControl.innerHTML);
      
      /* Enable drag and drop for legend. */
      makeLegendDraggable(legendControl);
    }

    /* Bind Escape key to exit screenshot mode. */
    document.addEventListener('keydown', handleScreenshotModeEscape);

    console.log('Screenshot Mode aktiviert');
  } catch (error) {
    console.error('Error in activateScreenshotMode:', error);
  }
}

function exitScreenshotMode() {
  try {
    console.log('Verlasse Screenshot Mode');

    /* Restore function buttons. */
    const functionBtns = document.querySelectorAll('.function-btn');
    functionBtns.forEach(btn => {
      btn.style.display = '';
    });

    /* Restore main menu. */
    if (window._mainMenuWasVisible) {
      const mainMenu = document.getElementById('main-menu');
      if (mainMenu) mainMenu.style.display = '';
      delete window._mainMenuWasVisible;
    }

    if (window._contributorBoxWasVisible) {
      const contributorBox = document.getElementById('contributor-box');
      if (contributorBox) contributorBox.style.display = '';
      delete window._contributorBoxWasVisible;
    }

    if (window._citeBtnWasVisible) {
      const citeBtn = document.getElementById('cite-btn');
      if (citeBtn && window._citeBtnDisplay !== undefined) {
        citeBtn.style.display = window._citeBtnDisplay; // Original wiederherstellen
        delete window._citeBtnDisplay;
      }
      delete window._citeBtnWasVisible;
    }

    /* Restore Data and Licensing button. */
    if (window._dataLicensingBtnWasVisible) {
      const dataLicensingBtn = document.getElementById('data-licensing-btn');
      if (dataLicensingBtn && window._dataLicensingBtnDisplay !== undefined) {
        dataLicensingBtn.style.display = window._dataLicensingBtnDisplay; // Original wiederherstellen
        delete window._dataLicensingBtnDisplay;
      }
      delete window._dataLicensingBtnWasVisible;
    }

    /* Restore top logo container. */
    if (window._logoWasVisible) {
      const topLogo = document.getElementById('top-logo');
      if (topLogo && window._logoDisplay !== undefined) {
        topLogo.style.display = window._logoDisplay; // Original wiederherstellen
        delete window._logoDisplay;
      }
      delete window._logoWasVisible;
    }

    /* Restore export and screenshot buttons. */
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.style.display = '';

    const screenshotBtn = document.getElementById('screenshot-btn');
    if (screenshotBtn) {
      screenshotBtn.style.display = '';
      screenshotBtn.style.background = '#ff6b35'; // Normale Farbe wiederherstellen
    }

    /* Restore original legend HTML and handlers. */
    const legendControl = document.querySelector('.legend-control');
    if (legendControl && window._originalLegendHTML) {
      legendControl.innerHTML = window._originalLegendHTML;
      delete window._originalLegendHTML;
      /* Rebind legend checkbox handlers. */
      createLegendEventHandlers();
      /* Remove draggable styling to restore default position. */
      removeLegendDraggable(legendControl);
    }

    /* Remove Escape key handler. */
    document.removeEventListener('keydown', handleScreenshotModeEscape);

    /* Return to Info mode. */
    currentMode = 'info';
    activateInfoMode();

    /* Mark Info mode button as active. */
    const infoBtn = Array.from(document.querySelectorAll('.function-btn')).find(btn => btn.textContent === 'Info Mode');
    if (infoBtn) {
      setActiveBtn(infoBtn);
    }

    console.log('Screenshot Mode verlassen');
  } catch (error) {
    console.error('Error in exitScreenshotMode:', error);
  }
}

function handleScreenshotModeEscape(event) {
  if (event.key === 'Escape') {
    console.log('Escape gedrückt - verlasse Screenshot Mode');
    exitScreenshotMode();
  }
}

/*
 * Time-series chart helpers are implemented in core.
 */
