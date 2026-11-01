//! Encrypted storage for auth tokens.
//!
//! On Windows, values are encrypted with DPAPI (`CryptProtectData`), so only the same Windows user on
//! the same machine can decrypt them. On other platforms (development only) values are written to a
//! file readable only by the current user.

use std::fs;
use std::path::PathBuf;

use tauri::{AppHandle, Manager, Runtime};

fn store_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?
        .join("secure");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn key_path<R: Runtime>(app: &AppHandle<R>, key: &str) -> Result<PathBuf, String> {
    if key.is_empty()
        || key.len() > 128
        || !key
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.')
    {
        return Err("invalid key".into());
    }
    Ok(store_dir(app)?.join(format!("{key}.bin")))
}

#[cfg(windows)]
mod crypto {
    use std::ptr;
    use windows_sys::Win32::Foundation::{LocalFree, HLOCAL};
    use windows_sys::Win32::Security::Cryptography::{
        CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    };

    fn run(input: &[u8], protect: bool) -> Result<Vec<u8>, String> {
        let in_blob = CRYPT_INTEGER_BLOB {
            cbData: input.len() as u32,
            pbData: input.as_ptr() as *mut u8,
        };
        let mut out_blob = CRYPT_INTEGER_BLOB {
            cbData: 0,
            pbData: ptr::null_mut(),
        };
        let ok = unsafe {
            if protect {
                CryptProtectData(
                    &in_blob,
                    ptr::null(),
                    ptr::null(),
                    ptr::null(),
                    ptr::null(),
                    CRYPTPROTECT_UI_FORBIDDEN,
                    &mut out_blob,
                )
            } else {
                CryptUnprotectData(
                    &in_blob,
                    ptr::null_mut(),
                    ptr::null(),
                    ptr::null(),
                    ptr::null(),
                    CRYPTPROTECT_UI_FORBIDDEN,
                    &mut out_blob,
                )
            }
        };
        if ok == 0 {
            return Err("DPAPI operation failed".into());
        }
        let out = unsafe {
            std::slice::from_raw_parts(out_blob.pbData, out_blob.cbData as usize).to_vec()
        };
        unsafe {
            LocalFree(out_blob.pbData as HLOCAL);
        }
        Ok(out)
    }

    pub fn encrypt(data: &[u8]) -> Result<Vec<u8>, String> {
        run(data, true)
    }

    pub fn decrypt(data: &[u8]) -> Result<Vec<u8>, String> {
        run(data, false)
    }
}

#[cfg(not(windows))]
mod crypto {
    pub fn encrypt(data: &[u8]) -> Result<Vec<u8>, String> {
        Ok(data.to_vec())
    }

    pub fn decrypt(data: &[u8]) -> Result<Vec<u8>, String> {
        Ok(data.to_vec())
    }
}

fn write_private(path: &PathBuf, bytes: &[u8]) -> Result<(), String> {
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, bytes).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&tmp, fs::Permissions::from_mode(0o600)).map_err(|e| e.to_string())?;
    }
    fs::rename(&tmp, path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn secure_get<R: Runtime>(app: AppHandle<R>, key: String) -> Result<Option<String>, String> {
    let path = key_path(&app, &key)?;
    if !path.exists() {
        return Ok(None);
    }
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    match crypto::decrypt(&bytes).and_then(|b| String::from_utf8(b).map_err(|e| e.to_string())) {
        Ok(s) => Ok(Some(s)),
        Err(_) => {
            // Unreadable (e.g. copied from another user/machine): discard so the user just signs in again.
            let _ = fs::remove_file(&path);
            Ok(None)
        }
    }
}

#[tauri::command]
pub fn secure_set<R: Runtime>(app: AppHandle<R>, key: String, value: String) -> Result<(), String> {
    let path = key_path(&app, &key)?;
    let enc = crypto::encrypt(value.as_bytes())?;
    write_private(&path, &enc)
}

#[tauri::command]
pub fn secure_remove<R: Runtime>(app: AppHandle<R>, key: String) -> Result<(), String> {
    let path = key_path(&app, &key)?;
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
