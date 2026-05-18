// nChat Desktop — native menu builder (Tauri 2)

use tauri::{
    menu::{MenuBuilder, PredefinedMenuItem, SubmenuBuilder},
    AppHandle, Emitter, Manager, Wry,
};

/// Build the native application menu for all platforms.
/// Returns a fully configured `Menu<Wry>` ready to pass to `Builder::menu()`.
pub fn build_menu(app: &AppHandle) -> tauri::Result<tauri::menu::Menu<Wry>> {
    let file_menu = SubmenuBuilder::new(app, "File")
        .text("new-conversation", "New Conversation")
        .item(&PredefinedMenuItem::separator(app)?)
        .text("preferences", "Preferences…")
        .item(&PredefinedMenuItem::separator(app)?)
        .quit()
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .item(&PredefinedMenuItem::separator(app)?)
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .text("toggle-sidebar", "Toggle Sidebar")
        .fullscreen()
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .item(&PredefinedMenuItem::separator(app)?)
        .text("bring-to-front", "Bring All to Front")
        .build()?;

    MenuBuilder::new(app)
        .items(&[&file_menu, &edit_menu, &view_menu, &window_menu])
        .build()
}

/// Wire menu event handlers after the menu is attached to the app.
pub fn handle_menu_event(app: &AppHandle, event_id: &str) {
    match event_id {
        "new-conversation" => {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.show();
                let _ = win.set_focus();
                let _ = win.emit("menu:new-conversation", ());
            }
        }
        "preferences" => {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.show();
                let _ = win.set_focus();
                let _ = win.emit("menu:preferences", ());
            }
        }
        "toggle-sidebar" => {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.emit("menu:toggle-sidebar", ());
            }
        }
        "bring-to-front" => {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.show();
                let _ = win.set_focus();
            }
        }
        _ => {}
    }
}
