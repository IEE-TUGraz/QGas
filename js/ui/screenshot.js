// Extracted screenshot logic from core.js (v5)

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


// Screenshot Mode Funktionen
function activateScreenshotMode() {
  try {
    console.log('Aktiviere Screenshot Mode');

    // Speichere Original-Legende für Wiederherstellung
    const legendControl = document.querySelector('.legend-control');
    if (legendControl) {
      window._originalLegendHTML = legendControl.innerHTML;
    }

    // Alle function-btn Buttons ausblenden
    const functionBtns = document.querySelectorAll('.function-btn');
    functionBtns.forEach(btn => {
      btn.style.display = 'none';
    });

    // Main menu ausblenden
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

    // Data and Licensing Button ausblenden
    const dataLicensingBtn = document.getElementById('data-licensing-btn');
    if (dataLicensingBtn) {
      window._dataLicensingBtnDisplay = dataLicensingBtn.style.display; // Original speichern
      dataLicensingBtn.style.display = 'none';
      window._dataLicensingBtnWasVisible = true;
    }

    // Logo komplett ausblenden
    const topLogo = document.getElementById('top-logo');
    if (topLogo) {
      window._logoDisplay = topLogo.style.display || ''; // Original speichern
      topLogo.style.display = 'none';
      window._logoWasVisible = true;
    }

    // Export und Screenshot Buttons ausblenden
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.style.display = 'none';
    }

    const screenshotBtn = document.getElementById('screenshot-btn');
    if (screenshotBtn) {
      screenshotBtn.style.display = 'none';
    }

    // Legende bereinigen: Checkboxen entfernen und nur aktive Layer anzeigen
    if (legendControl) {
      // Make sure legend is visible
      legendControl.style.display = 'block';
      
      const labels = legendControl.querySelectorAll('label');
      let cleanLegendHTML = '';

      labels.forEach(label => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        const layerName = label.textContent.trim();

        // Prüfe ob Layer aktiv ist (Checkbox ist checked)
        if (checkbox && checkbox.checked) {
          // Entferne Checkbox und passe margin an, um Layout zu erhalten
          const labelClone = label.cloneNode(true);
          const checkboxClone = labelClone.querySelector('input[type="checkbox"]');
          if (checkboxClone) {
            checkboxClone.remove();
            // Füge margin zum ersten span hinzu, um den Platz der Checkbox zu kompensieren
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
        // If no layers are checked, show a message
        legendControl.innerHTML = '<div style="padding: 5px;">No active layers</div>';
      }
      
      console.log('Legend HTML in screenshot mode:', legendControl.innerHTML);
      
      // Enable drag and drop for legend
      makeLegendDraggable(legendControl);
    }

    // Escape-Taste Event-Listener hinzufügen
    document.addEventListener('keydown', handleScreenshotModeEscape);

    console.log('Screenshot Mode aktiviert');
  } catch (error) {
    console.error('Error in activateScreenshotMode:', error);
  }
}

function exitScreenshotMode() {
  try {
    console.log('Verlasse Screenshot Mode');

    // Function-Buttons wieder anzeigen
    const functionBtns = document.querySelectorAll('.function-btn');
    functionBtns.forEach(btn => {
      btn.style.display = '';
    });

    // Main menu wieder anzeigen
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

    // Data and Licensing Button wieder anzeigen
    if (window._dataLicensingBtnWasVisible) {
      const dataLicensingBtn = document.getElementById('data-licensing-btn');
      if (dataLicensingBtn && window._dataLicensingBtnDisplay !== undefined) {
        dataLicensingBtn.style.display = window._dataLicensingBtnDisplay; // Original wiederherstellen
        delete window._dataLicensingBtnDisplay;
      }
      delete window._dataLicensingBtnWasVisible;
    }

    // Logo wieder anzeigen
    if (window._logoWasVisible) {
      const topLogo = document.getElementById('top-logo');
      if (topLogo && window._logoDisplay !== undefined) {
        topLogo.style.display = window._logoDisplay; // Original wiederherstellen
        delete window._logoDisplay;
      }
      delete window._logoWasVisible;
    }

    // Export und Screenshot Buttons wieder anzeigen
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.style.display = '';

    const screenshotBtn = document.getElementById('screenshot-btn');
    if (screenshotBtn) {
      screenshotBtn.style.display = '';
      screenshotBtn.style.background = '#ff6b35'; // Normale Farbe wiederherstellen
    }

    // Original-Legende wiederherstellen
    const legendControl = document.querySelector('.legend-control');
    if (legendControl && window._originalLegendHTML) {
      legendControl.innerHTML = window._originalLegendHTML;
      delete window._originalLegendHTML;
      // Event-Handler für Checkboxen wieder hinzufügen
      createLegendEventHandlers();
      // Remove draggable styling to restore default position
      removeLegendDraggable(legendControl);
    }

    // Escape-Event-Listener entfernen
    document.removeEventListener('keydown', handleScreenshotModeEscape);

    // Zurück zum Info Mode
    currentMode = 'info';
    activateInfoMode();

    // Info Mode Button als aktiv markieren
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

// Funktion zum Anzeigen der Zeitreihen-Charts
