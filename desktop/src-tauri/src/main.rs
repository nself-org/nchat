// nChat Desktop — Tauri 2 entry point
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    nchat_desktop::run();
}
