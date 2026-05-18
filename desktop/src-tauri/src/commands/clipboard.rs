use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;

/// Read plain text from the system clipboard.
#[tauri::command]
pub fn clipboard_read_text(app: AppHandle) -> Result<String, String> {
    app.clipboard()
        .read_text()
        .map_err(|e| e.to_string())
}

/// Write plain text to the system clipboard.
#[tauri::command]
pub fn clipboard_write_text(app: AppHandle, text: String) -> Result<(), String> {
    app.clipboard()
        .write_text(text)
        .map_err(|e| e.to_string())
}

/// Read an image from the clipboard, returned as PNG base64 data URL.
#[tauri::command]
pub fn clipboard_read_image(app: AppHandle) -> Result<String, String> {
    let img = app.clipboard().read_image().map_err(|e| e.to_string())?;
    let b64 = base64_encode(img.rgba());
    Ok(format!(
        "data:image/raw;width={};height={};base64,{}",
        img.width(),
        img.height(),
        b64
    ))
}

/// Write PNG bytes to the clipboard.
#[tauri::command]
pub fn clipboard_write_image(
    app: AppHandle,
    data: Vec<u8>,
    width: u32,
    height: u32,
) -> Result<(), String> {
    use tauri::image::Image;
    let img = Image::new_owned(data, width, height);
    app.clipboard()
        .write_image(&img)
        .map_err(|e| e.to_string())
}

/// Returns true if the clipboard currently contains an image.
#[tauri::command]
pub fn clipboard_has_image(app: AppHandle) -> bool {
    app.clipboard().read_image().is_ok()
}

// Minimal base64 encoder — avoids pulling in an extra crate.
fn base64_encode(input: &[u8]) -> String {
    const CHARS: &[u8] =
        b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = Vec::with_capacity((input.len() + 2) / 3 * 4);
    for chunk in input.chunks(3) {
        let b0 = chunk[0] as usize;
        let b1 = if chunk.len() > 1 { chunk[1] as usize } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as usize } else { 0 };
        result.push(CHARS[(b0 >> 2) & 0x3F]);
        result.push(CHARS[((b0 << 4) | (b1 >> 4)) & 0x3F]);
        result.push(if chunk.len() > 1 {
            CHARS[((b1 << 2) | (b2 >> 6)) & 0x3F]
        } else {
            b'='
        });
        result.push(if chunk.len() > 2 {
            CHARS[b2 & 0x3F]
        } else {
            b'='
        });
    }
    String::from_utf8(result).unwrap()
}
