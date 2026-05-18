/// Native file drag-out (dragging a file from the app window to the OS).
/// Uses tauri-plugin-drag when available; falls back to a no-op on platforms
/// where it is not supported.
#[tauri::command]
pub fn drag_start_file(_path: String) -> Result<(), String> {
    // tauri-plugin-drag provides this in Tauri 2; integrate in T10 when plugin lands.
    // This stub preserves the IPC contract so the frontend never breaks.
    Ok(())
}
