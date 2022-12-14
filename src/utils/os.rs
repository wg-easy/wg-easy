use std::{ffi::OsStr, string::FromUtf8Error};

use log::{info, warn};
use serde::Serialize;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    process::Command,
};

#[derive(Serialize)]
pub struct StdResult {
    pub stdout: String,
    pub stderr: String,
}

impl StdResult {
    pub fn log(&self) {
        if self.stdout.len() > 0 {
            info!("{}", &self.stdout);
        }
        if self.stderr.len() > 0 {
            warn!("{}", &self.stderr);
        }
    }
}

pub async fn load_file_unhandled(path: &str) -> tokio::fs::File {
    match tokio::fs::OpenOptions::new()
        .append(false)
        .read(true)
        .write(true)
        .create(true)
        .open(path)
        .await
    {
        Ok(file) => file,
        Err(error) => {
            log::error!("Could not load file {}: {}", path, error);
            panic!()
        }
    }
}

pub async fn load_and_read_file_unhandled(path: &str) -> (tokio::fs::File, String) {
    let mut buffer = String::new();
    let mut file = load_file_unhandled(path).await;
    match file.read_to_string(&mut buffer).await {
        Ok(_) => (file, buffer),
        Err(error) => {
            log::error!("Could not read file data: {}", error);
            panic!()
        }
    }
}

pub async fn write_to_path_unhandled(path: &str, data: String) -> tokio::fs::File {
    let mut file = load_file_unhandled(path).await;
    match file.write(data.as_bytes()).await {
        Ok(_) => file,
        Err(error) => {
            log::error!("Could not write to file: {}", error);
            panic!()
        }
    }
}

pub async fn exec_sh<S: AsRef<OsStr>>(command: S) -> Result<StdResult, String> {
    let res = match Command::new("sh").arg("-c").arg(command).output().await {
        Ok(val) => val,
        Err(err) => return Err(err.to_string()),
    };

    let stdout_b = &res.stdout.to_vec();
    let stderr_b = &res.stderr.to_vec();

    let stdout = match remove_escape(stdout_b) {
        Ok(val) => val,
        Err(err) => return Err(err.to_string()),
    };
    let stderr = match remove_escape(stderr_b) {
        Ok(val) => val,
        Err(err) => return Err(err.to_string()),
    };

    Ok(StdResult { stdout, stderr })
}

pub fn remove_escape(bytes: &Vec<u8>) -> Result<String, FromUtf8Error> {
    match bytes.len() == 0 {
        true => Ok(String::new()),
        false => match match bytes[bytes.len() - 1] == '\n' as u8 {
            true => String::from_utf8(bytes[0..bytes.len() - 1].to_vec()),
            false => String::from_utf8(bytes.to_vec()),
        } {
            Ok(val) => Ok(val),
            Err(err) => Err(err),
        },
    }
}