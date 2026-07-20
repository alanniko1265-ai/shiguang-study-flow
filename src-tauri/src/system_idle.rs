fn elapsed_milliseconds(now: u32, last_input: u32) -> u32 {
    now.wrapping_sub(last_input)
}

#[cfg(target_os = "windows")]
#[tauri::command]
pub fn get_system_idle_seconds() -> Result<u64, String> {
    use std::mem::size_of;
    use windows_sys::Win32::{
        System::SystemInformation::GetTickCount,
        UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO},
    };

    let mut info = LASTINPUTINFO {
        cbSize: size_of::<LASTINPUTINFO>() as u32,
        dwTime: 0,
    };
    let success = unsafe { GetLastInputInfo(&mut info) };
    if success == 0 {
        return Err("无法读取 Windows 输入状态".to_string());
    }

    let now = unsafe { GetTickCount() };
    Ok(u64::from(elapsed_milliseconds(now, info.dwTime)) / 1_000)
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub fn get_system_idle_seconds() -> Result<u64, String> {
    Err("当前平台暂不支持监督模式".to_string())
}

#[cfg(test)]
mod tests {
    use super::elapsed_milliseconds;

    #[test]
    fn idle_duration_handles_windows_tick_wraparound() {
        assert_eq!(elapsed_milliseconds(500, 100), 400);
        assert_eq!(elapsed_milliseconds(100, u32::MAX - 99), 200);
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn reads_windows_system_idle_time() {
        assert!(super::get_system_idle_seconds().is_ok());
    }
}
