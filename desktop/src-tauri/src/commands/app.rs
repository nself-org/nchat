use tauri::{AppHandle, Manager};
use tauri_plugin_autostart::ManagerExt;

#[tauri::command]
pub fn app_get_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
pub fn app_get_name(app: AppHandle) -> String {
    app.package_info().name.clone()
}

#[tauri::command]
pub fn app_get_path(app: AppHandle, name: String) -> Result<String, String> {
    let path_resolver = app.path();
    let dir = match name.as_str() {
        "home" => path_resolver.home_dir().map_err(|e| e.to_string())?,
        "appData" => path_resolver.app_data_dir().map_err(|e| e.to_string())?,
        "temp" => path_resolver.temp_dir().map_err(|e| e.to_string())?,
        "downloads" => path_resolver.download_dir().map_err(|e| e.to_string())?,
        "desktop" => path_resolver.desktop_dir().map_err(|e| e.to_string())?,
        "documents" => path_resolver.document_dir().map_err(|e| e.to_string())?,
        "pictures" => path_resolver.picture_dir().map_err(|e| e.to_string())?,
        _ => return Err(format!("unknown path name: {name}")),
    };
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn toggle_autostart(app: AppHandle, enabled: bool) -> Result<(), String> {
    let autostart = app.autolaunch();
    if enabled {
        autostart.enable().map_err(|e| e.to_string())
    } else {
        autostart.disable().map_err(|e| e.to_string())
    }
}

/// T24 — macOS dock badge: set unread count badge on the dock icon.
/// On non-macOS platforms this is a no-op (returns Ok(())).
#[tauri::command]
pub fn app_set_badge_count(_app: AppHandle, count: u32) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let label = if count == 0 {
            String::new()
        } else {
            count.to_string()
        };
        // Tauri 2 exposes badge via the objc runtime through the app handle.
        // Use NSApp.dockTile.badgeLabel via cocoa if available; fall back gracefully.
        unsafe {
            use objc2::runtime::AnyObject;
            use objc2::{class, msg_send};
            let app: *mut AnyObject = msg_send![class!(NSApplication), sharedApplication];
            let dock_tile: *mut AnyObject = msg_send![app, dockTile];
            let ns_str = if label.is_empty() {
                std::ptr::null_mut()
            } else {
                let ns_str: *mut AnyObject = msg_send![class!(NSString),
                    stringWithUTF8String: label.as_ptr() as *const std::os::raw::c_char];
                ns_str
            };
            let _: () = msg_send![dock_tile, setBadgeLabel: ns_str];
            let _: () = msg_send![dock_tile, display];
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = count;
    }
    Ok(())
}
