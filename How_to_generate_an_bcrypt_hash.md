# wg-password

`wg-password` (wgpw) is a script that generates bcrypt password hashes for use with `wg-easy`, enhancing security by requiring passwords.

## Features

- Generate bcrypt password hashes.
- Easily integrate with `wg-easy` to enforce password requirements.

## Usage with Docker

To generate a bcrypt password hash using docker, run the following command :

```sh
docker run --rm -it ghcr.io/wg-easy/wg-easy wgpw 'YOUR_PASSWORD'
PASSWORD_HASH='$2b$12$coPqCsPtcFO.Ab99xylBNOW4.Iu7OOA2/ZIboHN6/oyxca3MWo7fW' // literally YOUR_PASSWORD
```
If a password is not provided, the tool will prompt you for one :
```sh
docker run --rm -it ghcr.io/wg-easy/wg-easy wgpw
Enter your password:      // hidden prompt, type in your password
PASSWORD_HASH='$2b$12$coPqCsPtcFO.Ab99xylBNOW4.Iu7OOA2/ZIboHN6/oyxca3MWo7fW'
```

**Important** : make sure to enclose your password in **single quotes** when you run `docker run` command :

```bash
$ echo $2b$12$coPqCsPtcF <-- not correct
b2
$ echo "$2b$12$coPqCsPtcF" <-- not correct
b2
$ echo '$2b$12$coPqCsPtcF' <-- correct
$2b$12$coPqCsPtcF
```

**Important** : Please note: don't wrap the generated hash password in single quotes when you use `docker-compose.yml`. Instead, replace each `$` symbol with two `$$` symbols. For example:

``` yaml
- PASSWORD_HASH=$$2y$$10$$hBCoykrB95WSzuV4fafBzOHWKu9sbyVa34GJr8VV5R/pIelfEMYyG
```

This hash is for the password 'foobar123', obtained using the command `docker run ghcr.io/wg-easy/wg-easy wgpw 'foobar123'` and then inserted an additional `$` before each existing `$` symbol.
