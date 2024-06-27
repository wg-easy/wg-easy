<!-- created by Mathys Lopinto (@mathys-lopinto) -->
# How to generate bcrypt

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
# If you use have install python using apt
sudo dnf install python3-bcrypt
# If don't install python using apt
pip3 install bcrypt
# If you got externally-managed-environment error
pip3 install bcrypt --break-system-packages
```

### Arch Linux based distributions
```bash
sudo pacman -Syy
sudo pacman -S python python-pip
# If you use have install python using apt
sudo pacman -S python-bcrypt
# If don't install python using apt
pip3 install bcrypt
# If you got externally-managed-environment error
pip3 install bcrypt --break-system-packages
```

## Generating bcrypt
### Do not name the file `bcrypt.py` as it will cause an error.
Create a python file with the following content:
```python
import bcrypt
password = b"your_password_here" # DO NOT REMOVE THE b
hashed = bcrypt.hashpw(password, bcrypt.gensalt())
print(f'The hashed password is: {hashed.decode()}')

docker_interpolation= hashed.decode().replace("$", "$$")
print(f'The hashed password for an docker env is: {docker_interpolation}')
```

Replace `your_password_here` with the password you want to hash.

Run the python file and you will get the hashed password.
Copy the 2nd line of the output (after the : ) and use it as your hashed password.
