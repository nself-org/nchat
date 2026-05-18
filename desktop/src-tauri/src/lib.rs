// nChat Desktop — Tauri 2 library root

mod commands;
mod menu;
mod state;
mod tray;

use tauri::{Emitter, Listener, WindowEvent};

pub fn run() {
    // T28: optional crash reporting via sentry-tauri.
    // DSN loaded from env; no-op if absent (never required at runtime).
    let _sentry_guard = std::env::var("SENTRY_DSN").ok().map(|dsn| {
        sentry::init((
            dsn,
            sentry::ClientOptions {
                release: sentry::release_name!(),
                ..Default::default()
            },
        ))
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(sentry_tauri::plugin())
        .on_menu_event(|app, event| {
            menu::handle_menu_event(app, event.id.as_ref());
        })
        .invoke_handler(tauri::generate_handler![
            commands::app::app_get_version,
            commands::app::app_get_name,
            commands::app::app_get_path,
            commands::window::window_minimize,
            commands::window::window_maximize,
            commands::window::window_close,
            commands::window::window_is_maximized,
            commands::shell::shell_open_external,
            commands::shell::shell_show_item_in_folder,
            commands::clipboard::clipboard_read_text,
            commands::clipboard::clipboard_write_text,
            commands::clipboard::clipboard_read_image,
            commands::clipboard::clipboard_write_image,
            commands::clipboard::clipboard_has_image,
            commands::notification::notification_show,
            commands::update::update_check,
            commands::drag::drag_start_file,
            commands::app::toggle_autostart,
            commands::app::app_set_badge_count,
        ])
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    #[cfg(target_os = "macos")]
                    {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                    #[cfg(not(target_os = "macos"))]
                    {
                        let _ = api;
                        window.app_handle().exit(0);
                    }
                }
            }
        })
        .setup(|app| {
            let menu = menu::build_menu(app.handle())?;
            app.set_menu(menu)?;

            // T13: wire deep-link handler for nchat:// scheme
            let handle = app.handle().clone();
            app.listen("deep-link://new-url", move |event| {
                if let Ok(urls) = serde_json::from_str::<Vec<String>>(event.payload()) {
                    for url in urls {
                        if let Some(win) = handle.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                            if url.starts_with("nchat://chat/") {
                                let room = url.trim_start_matches("nchat://chat/");
                                let _ = win.emit("deep-link:chat", room.to_string());
                            } else if url.starts_with("nchat://invite/") {
                                let token = url.trim_start_matches("nchat://invite/");
                                let _ = win.emit("deep-link:invite", token.to_string());
                            }
                        }
                    }
                }
            });

            #[cfg(any(target_os = "macos", target_os = "windows"))]
            tray::build_tray(app)?;

            #[cfg(target_os = "linux")]
            {
                eprintln!("[nchat-desktop] warning: system tray may not be available on this Linux session");
                let _ = tray::build_tray(app);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running nchat desktop");
}
