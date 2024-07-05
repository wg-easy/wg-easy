<!-- created by Mathys Lopinto (@mathys-lopinto) -->
# How to generate bcrypt hash

## Prerequisites
- Python 3
- bcrypt library

## Prerequisites Installation
### Windows
Download and install Python 3 from [official website](https://www.python.org/downloads/).
Check "Add python.exe to PATH" before running "Install Now".

Open Command Prompt (win + r, type "cmd" and press enter) and run the following command to install bcrypt library:
```bash
pip install bcrypt
```

### Debian based distributions
```bash
sudo apt-get update
sudo apt-get install python3 python3-pip
# If you use have install python using apt
sudo apt-get install python3-bcrypt
# If don't install python using apt
pip3 install bcrypt
# If you got externally-managed-environment error
pip3 install bcrypt --break-system-packages
```

### Fedora based distributions
```bash
sudo dnf update
sudo dnf install python3 python3-pip
# If you use have install python using dnf
sudo dnf install python3-bcrypt
# If don't install python using dnf
pip3 install bcrypt
# If you got externally-managed-environment error
pip3 install bcrypt --break-system-packages
```

### Arch Linux based distributions
```bash
sudo pacman -Syy
sudo pacman -S python python-pip
# If you use have install python using pacman
sudo pacman -S python-bcrypt
# If don't install python using pacman
pip3 install bcrypt
# If you got externally-managed-environment error
pip3 install bcrypt --break-system-packages
```

## Generating bcrypt hash from the command line
You can use the following one-liner command to generate a bcrypt hash directly in the cmd/ terminal: 
```bash
python3 -c "import bcrypt; password = b'your_password_here'; assert len(password) < 72, 'Password must be less than 72 bytes due to bcrypt limitation'; hashed = bcrypt.hashpw(password, bcrypt.gensalt()); print(f'The hashed password is: {hashed.decode()}'); docker_interpolation = hashed.decode().replace('$', '$$'); print(f'The hashed password for a Docker env is: {docker_interpolation}')" # or python if you run this on Windows. CHANGE your_password_here BY YOUR PASSWORD
```
Please change ``your_password_here`` in the line by your own password.

## Generating bcrypt hash from an script file
### Do not name the file `bcrypt.py` as it will cause an error.
Create a python file with the following content:
```python
import bcrypt

# Initial password
password = b"your_password_here"  # DO NOT REMOVE THE b

# Assert that the password is under 72 bytes
assert len(password) < 72, "Password must be less than 72 bytes due to bcrypt limitation"

# Generate a salt and hash the password
hashed = bcrypt.hashpw(password, bcrypt.gensalt())

# Print the hashed password
print(f'The hashed password is: {hashed.decode()}')

# Prepare the hashed password for Docker environment variables
docker_interpolation = hashed.decode().replace("$", "$$")
print(f'The hashed password for a Docker env is: {docker_interpolation}')
```

Replace `your_password_here` with the password you want to hash.

Run the python file and you will get the hashed password.

## Get the right hash
Copy the 2nd line of the output (after the : ) and use it as your hashed password.

__Exemple__
If the output is:
```txt
The hashed password is: $2b$12$NRiL4Kw4dKid.ix2WvZltOmaQBZjoX30shjHJXRVdEGshAxYWXXMe
The hashed password for an docker env is: $$2b$$12$$NRiL4Kw4dKid.ix2WvZltOmaQBZjoX30shjHJXRVdEGshAxYWXXMe
``` 

The docker line ``PASSWORD_HASH`` will be:
```txt
PASSWORD_HASH=$$2b$$12$$NRiL4Kw4dKid.ix2WvZltOmaQBZjoX30shjHJXRVdEGshAxYWXXMe
```
