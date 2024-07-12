# wg-password

`wg-password` is a Rust binary that generates bcrypt password hashes for use with `wg-easy`, enhancing security by requiring passwords.

## Features

- Generate bcrypt password hashes.
- Easily integrate with `wg-easy` to enforce password requirements.

## Usage with Docker

To generate a bcrypt password hash using Docker, run the following command:

```sh
docker run ghcr.io/wg-easy/wg-easy wgpw YOUR_PASSWORD
PASSWORD_HASH='$2b$12$coPqCsPtcFO.Ab99xylBNOW4.Iu7OOA2/ZIboHN6/oyxca3MWo7fW' // litteraly YOUR_PASSWORD
```

## Important

Make sure to enclose your password in single quotes when you run a linux host and *don't use double* `$`. [See](../How_to_generate_an_bcrypt_hash.md#generating-bcrypt-hash-from-an-script-file).

## LICENSE

[wg-easy license](../LICENSE)