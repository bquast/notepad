document.addEventListener('DOMContentLoaded', () => {
    const textArea = document.getElementById('text-area');
    const fileInput = document.getElementById('file-input');
    const lineColStatus = document.getElementById('line-col-status');
    const statusBarElement = document.getElementById('status-bar');
    const appContainer = document.querySelector('.app-container'); // Get container for potential adjustments

    // Button elements
    const newFileButton = document.getElementById('new-file');
    const openFileButton = document.getElementById('open-file');
    const saveFileButton = document.getElementById('save-file');
    const saveAsFileButton = document.getElementById('save-as-file');
    // const copyButton = document.getElementById('copy-action'); // Add if needed
    // const pasteButton = document.getElementById('paste-action'); // Add if needed

    let currentFileHandle = null; // To store the File System Access API handle
    let currentFileName = "Untitled.txt"; // Store the name separately
    let needsSave = false; // Basic flag to track unsaved changes

    // --- Utility Functions ---
    function updateTitle() {
        document.title = `${needsSave ? '*' : ''}${currentFileName} - SimplePad`;
    }

    function markUnsaved(unsaved = true) {
        needsSave = unsaved;
        updateTitle();
    }

    // --- File Operations ---

    // New File
    newFileButton.addEventListener('click', () => {
        if (needsSave && !confirm('Discard unsaved changes?')) {
            return; // User cancelled
        }
        textArea.value = '';
        currentFileHandle = null;
        currentFileName = "Untitled.txt";
        markUnsaved(false);
        updateStatusBar();
        textArea.focus();
    });

    // Open File
    openFileButton.addEventListener('click', () => {
        if (needsSave && !confirm('Discard unsaved changes before opening?')) {
            return; // User cancelled
        }
        fileInput.click(); // Trigger hidden file input
    });

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Check if File System Access API is available for getting a handle
        if ('showOpenFilePicker' in window) {
             // The file input doesn't give us a handle directly,
             // we still need to read the blob content.
             // The handle mechanism is mainly for *saving*.
             // Let's just read the file content.
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            textArea.value = e.target.result;
            currentFileName = file.name;
            currentFileHandle = null; // Reset handle, as this wasn't opened with FSA API
            markUnsaved(false);
            updateStatusBar();
            textArea.focus();
        };
        reader.onerror = (e) => {
            alert('Error reading file.');
            console.error("File reading error:", e);
        };
        reader.readAsText(file);

        // Reset file input to allow opening the same file again
        event.target.value = null;
    });

    // Save File (uses handle if available, otherwise triggers Save As)
    saveFileButton.addEventListener('click', async () => {
        if (currentFileHandle && 'createWritable' in currentFileHandle) {
            try {
                const writableStream = await currentFileHandle.createWritable();
                await writableStream.write(textArea.value);
                await writableStream.close();
                markUnsaved(false);
                // console.log('File saved successfully using handle.');
            } catch (err) {
                console.error('Error saving file with handle:', err);
                // If save failed (e.g. permissions revoked), fall back to Save As
                await saveAsFileLogic();
            }
        } else {
            // No handle, or handle is invalid - trigger Save As
            await saveAsFileLogic();
        }
    });

    // Save As File (always shows picker or uses download)
    saveAsFileButton.addEventListener('click', async () => {
        await saveAsFileLogic();
    });

    async function saveAsFileLogic() {
        const textToSave = textArea.value;
        const blob = new Blob([textToSave], { type: 'text/plain' });

        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: currentFileName,
                    types: [{
                        description: 'Text Files',
                        accept: { 'text/plain': ['.txt'] },
                    }],
                });
                const writableStream = await handle.createWritable();
                await writableStream.write(blob);
                await writableStream.close();

                currentFileHandle = handle; // Store the new handle
                currentFileName = handle.name; // Update the name
                markUnsaved(false);
                // console.log('File saved successfully via Save As picker.');

            } catch (err) {
                // Handle user cancellation or other errors
                if (err.name !== 'AbortError') {
                    console.error('Error saving file with Save As picker:', err);
                    alert('Error saving file.');
                } else {
                    // console.log('Save As cancelled by user.');
                }
            }
        } else {
            // Fallback for browsers without File System Access API (download link)
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = currentFileName || 'Untitled.txt'; // Use current name or default
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            // We don't get a handle here, so subsequent "Save" will trigger "Save As" again.
            // We also don't know if the user *actually* saved or changed the name.
            // We'll assume they saved with the suggested name for the title update.
            currentFileHandle = null;
            markUnsaved(false); // Assume saved, though not guaranteed in fallback
        }
    }

    // --- Status Bar ---
    function updateStatusBar() {
        const text = textArea.value;
        const cursorPos = textArea.selectionStart;
        let lineNum = 1;
        let colNum = 1;
        let prevChar = '';

        for (let i = 0; i < cursorPos; i++) {
            const char = text[i];
            if (char === '\n') {
                lineNum++;
                colNum = 1;
            } else {
                 // Basic handling for tabs (assuming tab width = 4, adjust if needed)
                 // This isn't perfect but gives a better estimate than count=1
                if (char === '\t') {
                   // Move to the next multiple of 4 + 1
                   colNum = Math.floor((colNum - 1) / 4) * 4 + 5;
                } else {
                    colNum++;
                }
            }
            prevChar = char;
        }
        lineColStatus.textContent = `Ln ${lineNum}, Col ${colNum}`;
    }

    textArea.addEventListener('input', () => {
        markUnsaved(true);
        updateStatusBar();
    });
    // Update status bar on cursor movement (click, keyboard navigation)
    textArea.addEventListener('click', updateStatusBar);
    textArea.addEventListener('keyup', (e) => {
         // Only update on keys that move the cursor, not modifier keys etc.
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
             updateStatusBar();
        }
    });
    textArea.addEventListener('focus', updateStatusBar); // Update when focusing

    // --- Edit Functions (Example - add buttons if needed) ---
    // document.getElementById('copy-action').addEventListener('click', () => document.execCommand('copy'));
    // document.getElementById('paste-action').addEventListener('click', async () => {
    //     if (navigator.clipboard && navigator.clipboard.readText) {
    //         try {
    //             const text = await navigator.clipboard.readText();
    //             // Insert text at cursor position (more robust than execCommand)
    //             const start = textArea.selectionStart;
    //             const end = textArea.selectionEnd;
    //             textArea.value = textArea.value.substring(0, start) + text + textArea.value.substring(end);
    //             textArea.selectionStart = textArea.selectionEnd = start + text.length;
    //             markUnsaved(true);
    //             updateStatusBar();
    //         } catch (err) {
    //             console.error('Failed to read clipboard contents: ', err);
    //             // Fallback for browsers that might block readText or older ones
    //             if (!document.execCommand('paste')) {
    //                  alert('Paste failed. Browser might not support it or permissions denied.');
    //             } else {
    //                 markUnsaved(true);
    //                 updateStatusBar();
    //             }
    //         }
    //     } else if (!document.execCommand('paste')) { // Fallback for older browsers
    //         alert('Paste failed. Please use Ctrl+V or Cmd+V.');
    //     } else {
    //          markUnsaved(true);
    //          updateStatusBar();
    //     }
    // });

    // --- Keyboard Interaction Handling (Visual Viewport API - optional but robust) ---
    // Use this if the CSS approach (height: 100%) is insufficient on some devices.
    /*
    if (window.visualViewport) {
        let initialHeight = window.visualViewport.height;

        window.visualViewport.addEventListener('resize', () => {
            const newHeight = window.visualViewport.height;
            // Check if the height significantly changed (heuristic for keyboard)
            if (Math.abs(newHeight - initialHeight) > 150) { // Adjust threshold as needed
                 // Option 1: Adjust body/container height (might conflict with 100%)
                 // document.body.style.height = `${newHeight}px`;

                 // Option 2: Add padding to bottom of container to push content up
                 const keyboardHeight = window.innerHeight - newHeight; // Approx keyboard height
                 // appContainer.style.paddingBottom = keyboardHeight > 50 ? `${keyboardHeight}px` : '0px';
                 // Or adjust margin/padding on the text area itself

                 console.log(`Visual viewport resized. Old: ${initialHeight}, New: ${newHeight}`);
                 initialHeight = newHeight; // Update reference height

                 // Force layout reflow if needed (use sparingly)
                 // textArea.style.display = 'none';
                 // textArea.offsetHeight; // Trigger reflow
                 // textArea.style.display = '';
            } else {
                 // Reset adjustments if viewport goes back to near initial height
                 // appContainer.style.paddingBottom = '0px';
                 initialHeight = newHeight; // Update reference height even for small changes
            }
        });
    }
    */

    // --- Initial Setup ---
    updateStatusBar();
    updateTitle();
    // Set focus to text area on load
    // textArea.focus(); // Uncomment if desired, can be annoying on mobile sometimes.

    // --- Before Unload Prompt ---
    window.addEventListener('beforeunload', (event) => {
        if (needsSave) {
            event.preventDefault(); // Standard requires this
            event.returnValue = ''; // Necessary for Chrome/Edge
            return ''; // For older browsers
        }
    });

    // --- PWA Service Worker Registration --- (Keep as before)
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/notepad-sw.js') // Adjust path if needed
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed: ', error);
                });
        });
    }
});