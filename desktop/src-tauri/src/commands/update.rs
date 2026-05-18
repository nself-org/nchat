use serde::Serialize;
use tauri::AppHandle;

#[derive(Serialize)]
pub struct UpdateInfo {
    pub available: bool,
    pub version: Option<String>,
    pub notes: Option<String>,
}

/// T25 — update_check with semver downgrade guard.
/// Returns Ok(UpdateInfo { available: false }) if the remote version is older
/// than or equal to the currently running version, preventing rollback attacks.
#[tauri::command]
pub async fn update_check(app: AppHandle) -> Result<UpdateInfo, String> {
    use semver::Version;
    use tauri_plugin_updater::UpdaterExt;

    let current_ver = app.package_info().version.to_string();
    let current = Version::parse(&current_ver).map_err(|e| e.to_string())?;

    match app.updater() {
        Ok(updater) => match updater.check().await {
            Ok(Some(update)) => {
                // Downgrade guard: reject if remote ≤ current
                match Version::parse(&update.version) {
                    Ok(remote) if remote <= current => {
                        log::warn!(
                            "[nchat-desktop] update check: remote {} <= current {} — ignoring",
                            remote,
                            current
                        );
                        Ok(UpdateInfo {
                            available: false,
                            version: None,
                            notes: None,
                        })
                    }
                    _ => Ok(UpdateInfo {
                        available: true,
                        version: Some(update.version.clone()),
                        notes: update.body.clone(),
                    }),
                }
            }
            Ok(None) => Ok(UpdateInfo {
                available: false,
                version: None,
                notes: None,
            }),
            Err(e) => Err(e.to_string()),
        },
        Err(e) => Err(e.to_string()),
    }
}
