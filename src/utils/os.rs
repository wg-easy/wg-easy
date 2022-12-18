use std::{error::Error, string::FromUtf8Error};

use futures_util::TryFutureExt;
use log::{info, warn};
use serde::Serialize;
use tokio::{
    fs::File,
    io::{AsyncReadExt, AsyncWriteExt},
    process::Command,
};

// pub struct Error<T: ToString> {
//     error: T,
// }
// impl<T: ToString> Error<T> {
//     pub fn new(error: T) -> Self {
//         Self { error }
//     }
// }
// impl<T: ToString> ToString for Error<T> {
//     fn to_string(&self) -> String {
//         self.error.to_string()
//     }
// }

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

pub async fn write_file<P: Into<String>, D: Into<String>>(
    path: P,
    data: D,
) -> Result<(), std::io::Error> {
    tokio::fs::OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(path.into())
        .and_then(|mut file| async move { file.write(data.into().as_bytes()).await.map(|_| file) })
        .and_then(|mut file| async move { file.flush().await })
        .await
}

pub async fn read_file<S: Into<String>>(path: S) -> Result<String, std::io::Error> {
    tokio::fs::OpenOptions::new()
        .create(true)
        .write(true)
        .read(true)
        .open(path.into())
        .and_then(|mut file| async move {
            let mut dst = String::new();
            file.read_to_string(&mut dst).await.map(|_| dst)
        })
        .await
}

pub async fn exec_sh<S: ToString>(command: &S) -> Result<StdResult, Box<dyn Error>> {
    let command = command.to_string();
    info!("$ {}", command.clone());
    let res = match Command::new("sh").arg("-c").arg(command).output().await {
        Ok(val) => val,
        Err(err) => return Err(Box::new(err)),
    };

    let stdout_b = &res.stdout.to_vec();
    let stderr_b = &res.stderr.to_vec();

    match remove_escape(stdout_b)
        .and_then(|stdout| remove_escape(stderr_b).map(|stderr| (stdout, stderr)))
    {
        Ok((stdout, stderr)) => Ok(StdResult { stdout, stderr }),
        Err(err) => return Err(Box::new(err)),
    }
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
