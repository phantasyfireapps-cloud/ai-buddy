mod secure_store;

use tauri::{AppHandle, Manager};
use tauri_plugin_autostart::MacosLauncher;

/// Opens the operating system's Wi-Fi settings page.
#[tauri::command]
fn open_wifi_settings() -> Result<(), String> {
    #[cfg(windows)]
    {
        std::process::Command::new("explorer.exe")
            .arg("ms-settings:network-wifi")
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
    #[cfg(not(windows))]
    {
        Err("Wi-Fi settings shortcut is only available on Windows".into())
    }
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be registered first: a second launch (e.g. autostart + manual) focuses the running Buddy.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ))
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            open_wifi_settings,
            quit_app,
            secure_store::secure_get,
            secure_store::secure_set,
            secure_store::secure_remove
        ])
        .run(tauri::generate_context!())
        .expect("error while running AI Buddy");
}
