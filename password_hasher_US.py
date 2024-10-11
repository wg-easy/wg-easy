import bcrypt
import os
import json

def generate_salt(cost_factor: int = 12) -> str:
    """
    Generates a random salt with a specified cost factor.

    :param cost_factor: The cost factor for bcrypt (default is 12).
    :return: A random salt as a hexadecimal string.
    """
    return bcrypt.gensalt(cost_factor).decode('utf-8')

def hash_password(password: str, salt: str) -> str:
    """
    Converts a password into a bcrypt hash with a salt.

    :param password: The password to hash.
    :param salt: The salt to use for hashing.
    :return: The bcrypt hash of the password with the salt.
    """
    return bcrypt.hashpw(password.encode(), salt.encode()).decode('utf-8')

def verify_password(hashed_password: str, password: str) -> bool:
    """
    Verifies if the password matches the hash with the salt.

    :param hashed_password: The bcrypt hash of the password with the salt.
    :param password: The password to verify.
    :return: True if the password matches the hash, False otherwise.
    """
    return bcrypt.checkpw(password.encode(), hashed_password.encode())

def save_to_file(salt: str, hashed_password: str, filename: str):
    """
    Saves the salt and hash to a file.

    :param salt: The salt used for hashing.
    :param hashed_password: The hash of the password.
    :param filename: The name of the file to save the data.
    """
    data = {
        'salt': salt,
        'hashed_password': hashed_password
    }
    with open(filename, 'w') as file:
        json.dump(data, file)

def load_from_file(filename: str):
    """
    Loads the salt and hash from a file.

    :param filename: The name of the file to load the data.
    :return: The salt and hash of the password.
    """
    with open(filename, 'r') as file:
        data = json.load(file)
    return data['salt'], data['hashed_password']

def get_cost_factor():
    """
    Prompts the user to enter a valid cost factor.

    :return: The cost factor entered by the user.
    """
    while True:
        cost_factor_input = input("Enter the cost factor (default 12, typically between 4 and 31): ")
        if cost_factor_input == '':
            return 12  # Use the default value if the user enters nothing
        try:
            cost_factor = int(cost_factor_input)
            if 4 <= cost_factor <= 31:
                return cost_factor
            else:
                print("The cost factor must be between 4 and 31. Please try again.")
        except ValueError:
            print("Please enter a valid number.")

def main():
    while True:
        print("\nOptions:")
        print("1. Enter a password and generate a hash.")
        print("2. Verify the match between a hash and a password.")
        print("3. Save the salt and hash to a file.")
        print("4. Load the salt and hash from a file.")
        print("5. Enter multiple passwords and generate hashes.")
        print("6. Quit.")

        choice = input("Choose an option (1/2/3/4/5/6): ")

        if choice == '1':
            password = input("Enter the password: ")
            cost_factor = get_cost_factor()
            salt = generate_salt(cost_factor)
            hashed_password = hash_password(password, salt)
            print(f"Salt: {salt}")
            print(f"Password hash: {hashed_password}")

        elif choice == '2':
            try:
                hashed_password = input("Enter the password hash: ")
                password_to_verify = input("Enter the password to verify: ")
                match = verify_password(hashed_password, password_to_verify)
                print(f"Does the password match the hash? {match}")
            except Exception as e:
                print(f"Error verifying the password: {e}")

        elif choice == '3':
            try:
                salt = input("Enter the salt: ")
                hashed_password = input("Enter the password hash: ")
                filename = input("Enter the filename to save the data: ")
                save_to_file(salt, hashed_password, filename)
                print(f"Data saved to {filename}")
            except Exception as e:
                print(f"Error saving the data: {e}")

        elif choice == '4':
            try:
                filename = input("Enter the filename to load the data: ")
                salt, hashed_password = load_from_file(filename)
                print(f"Salt: {salt}")
                print(f"Password hash: {hashed_password}")
            except Exception as e:
                print(f"Error loading the data: {e}")

        elif choice == '5':
            cost_factor = get_cost_factor()
            while True:
                password = input("Enter the password (or type 'quit' to stop): ")
                if password.lower() == 'quit':
                    break
                salt = generate_salt(cost_factor)
                hashed_password = hash_password(password, salt)
                print(f"Salt: {salt}")
                print(f"Password hash: {hashed_password}")

        elif choice == '6':
            print("Goodbye!")
            break

        else:
            print("Invalid option. Please choose a valid option.")

if __name__ == "__main__":
    main()

