# Generating bcrypt-hashed password

Since version 14 of wg-easy, a password hashed with bcrypt is needed instead of the plain-text password string. This doc explains how to generate the hash based on a plain-text password.

## Using Docker + node

The easiest way to generate a bcrypt password hash with wgpw is using docker and node:

```sh
docker run ghcr.io/wg-easy/wg-easy node -e 'const bcrypt = require("bcryptjs"); const hash = bcrypt.hashSync("YOUR_PASSWORD", 10); console.log(hash.replace(/\$/g, "$$$$"));'
```

The hashed password will get printed on your terminal. Copy it and use on the `PASSWORD_HASH` environment variable.

## Using Docker + wgpw

`wg-password` (wgpw) is a script that generates bcrypt password hashes. You can use it with docker:

```sh
docker run ghcr.io/wg-easy/wg-easy wgpw YOUR_PASSWORD
```

You will see an output similar to this:

```sh
PASSWORD_HASH='$2b$12$coPqCsPtcFO.Ab99xylBNOW4.Iu7OOA2/ZIboHN6/oyxca3MWo7fW'
```

In this example, the `$2b$12$coPqCsPtcFO.Ab99xylBNOW4.Iu7OOA2/ZIboHN6/oyxca3MWo7fW` string is your hashed password. For using it with docker-compose, you need to escape the `$` characters by adding another `$` before them, or they will get interpreted as variables. The final password you can use in docker-compose will look like this:

```sh
$$2b$$12$$coPqCsPtcFO.Ab99xylBNOW4.Iu7OOA2/ZIboHN6/oyxca3MWo7fW
```
