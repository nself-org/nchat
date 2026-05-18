use serde::Deserialize;
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

#[derive(Deserialize)]
pub struct NotificationOptions {
    pub title: String,
    pub body: Option<String>,
    pub icon: Option<String>,
}

#[tauri::command]
pub fn notification_show(
    app: AppHandle,
    options: NotificationOptions,
) -> Result<(), String> {
    let mut builder = app.notification().builder().title(&options.title);
    if let Some(body) = &options.body {
        builder = builder.body(body);
    }
    if let Some(icon) = &options.icon {
        builder = builder.icon(icon);
    }
    builder.show().map_err(|e| e.to_string())
}
