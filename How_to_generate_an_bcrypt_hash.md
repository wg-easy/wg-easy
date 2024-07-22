# wg-password

`wg-password` (wgpw) is a script that generates bcrypt password hashes for use with `wg-easy`, enhancing security by requiring passwords.

## Features

- Generate bcrypt password hashes.
- Easily integrate with `wg-easy` to enforce password requirements.

## Usage with Docker

To generate a bcrypt password hash using docker, run the following command :

```sh
docker run ghcr.io/wg-easy/wg-easy wgpw YOUR_PASSWORD
PASSWORD_HASH='$2b$12$coPqCsPtcFO.Ab99xylBNOW4.Iu7OOA2/ZIboHN6/oyxca3MWo7fW' // litteraly YOUR_PASSWORD
```

*Important* : make sure to enclose your password in single quotes when you run `docker run` command :

```bash
$ echo $2b$12$coPqCsPtcF
b2
$ echo "$2b$12$coPqCsPtcF"
b2
$ echo '$2b$12$coPqCsPtcF'
$2b$12$coPqCsPtcF
```