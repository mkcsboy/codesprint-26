// This is required to load standard python packages from Pyodide
importScripts("https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js");

async function loadPyodideAndPackages() {
    self.pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/"
    });
}
let pyodideReadyPromise = loadPyodideAndPackages();

self.onmessage = async (event) => {
    // Make sure loading is complete
    await pyodideReadyPromise;

    const { code } = event.data;

    try {
        // 1. Redirect Stdout and Stderr to strings so we can capture print()
        self.pyodide.runPython(`
import sys
import io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
    `);

        // 2. Run the user's code (which includes hidden tests appended to the bottom)
        await self.pyodide.runPythonAsync(code);

        // 3. Extract the captured strings
        const stdout = self.pyodide.runPython("sys.stdout.getvalue()");
        const stderr = self.pyodide.runPython("sys.stderr.getvalue()");

        self.postMessage({ stdout, stderr });

    } catch (error) {
        // This catches syntax errors, exceptions thrown by asserts in hidden tests, etc.
        self.postMessage({ error: error.message });
    }
};
