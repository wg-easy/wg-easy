fn main() {
    let args = std::env::args();
    let collect = args.collect::<Vec<String>>();
    match collect.get(1) {
        None => panic!("Your password was missing !"),
        Some(password) => match bcrypt::hash(password, bcrypt::DEFAULT_COST) {
            Err(err) => eprintln!("{}", err.to_string()),
            Ok(hash) => println!("PASSWORD_HASH='{hash}'"),
        },
    }
}

#[cfg(test)]
mod test {
    use assert_cmd::Command;
    use predicates::prelude::*;

    #[test]
    fn test_missing_password() {
        // Test when no password is provided
        let mut cmd = Command::cargo_bin("wgpw").unwrap();
        cmd.assert()
            .failure()
            .stderr(predicate::str::contains("Your password was missing !"));
    }

    #[test]
    fn test_generate_password() {
        // Test with a valid password
        let mut cmd = Command::cargo_bin("wgpw").unwrap();
        cmd.arg("my_password")
            .assert()
            .success()
            .stdout(predicate::str::contains("PASSWORD_HASH='"));
    }

    // fn test_invalid_password() {
    // }
}
