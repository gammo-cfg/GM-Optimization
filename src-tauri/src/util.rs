use std::os::windows::process::CommandExt;
use std::process::{Command, Output};

const CREATE_NO_WINDOW: u32 = 0x08000000;

pub fn cmd(program: &str) -> Command {
    let mut command = Command::new(program);
    command.creation_flags(CREATE_NO_WINDOW);
    command
}

pub fn powershell(script: &str) -> Result<Output, String> {
    cmd("powershell")
        .args([
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script,
        ])
        .output()
        .map_err(|error| format!("Failed to start PowerShell: {error}"))
}
