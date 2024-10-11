import bcrypt
import os
import json

def generate_salt(cost_factor: int = 12) -> str:
    """
    Génère un sel aléatoire avec un facteur de coût spécifié.

    :param cost_factor: Le facteur de coût pour bcrypt (par défaut 12).
    :return: Un sel aléatoire sous forme de chaîne hexadécimale.
    """
    return bcrypt.gensalt(cost_factor).decode('utf-8')

def hash_password(password: str, salt: str) -> str:
    """
    Convertit un mot de passe en hachage bcrypt avec un sel.

    :param password: Le mot de passe à hacher.
    :param salt: Le sel à utiliser pour le hachage.
    :return: Le hachage bcrypt du mot de passe avec le sel.
    """
    return bcrypt.hashpw(password.encode(), salt.encode()).decode('utf-8')

def verify_password(hashed_password: str, password: str) -> bool:
    """
    Vérifie si le mot de passe correspond au hachage avec le sel.

    :param hashed_password: Le hachage bcrypt du mot de passe avec le sel.
    :param password: Le mot de passe à vérifier.
    :return: True si le mot de passe correspond au hachage, False sinon.
    """
    return bcrypt.checkpw(password.encode(), hashed_password.encode())

def save_to_file(salt: str, hashed_password: str, filename: str):
    """
    Sauvegarde le sel et le hachage dans un fichier.

    :param salt: Le sel utilisé pour le hachage.
    :param hashed_password: Le hachage du mot de passe.
    :param filename: Le nom du fichier où sauvegarder les données.
    """
    data = {
        'salt': salt,
        'hashed_password': hashed_password
    }
    with open(filename, 'w') as file:
        json.dump(data, file)

def load_from_file(filename: str):
    """
    Charge le sel et le hachage depuis un fichier.

    :param filename: Le nom du fichier où charger les données.
    :return: Le sel et le hachage du mot de passe.
    """
    with open(filename, 'r') as file:
        data = json.load(file)
    return data['salt'], data['hashed_password']

def get_cost_factor():
    """
    Demande à l'utilisateur d'entrer un facteur de coût valide.

    :return: Le facteur de coût entré par l'utilisateur.
    """
    while True:
        cost_factor_input = input("Entrez le facteur de coût (par défaut 12, typiquement entre 4 et 31) : ")
        if cost_factor_input == '':
            return 12  # Utiliser la valeur par défaut si l'utilisateur n'entre rien
        try:
            cost_factor = int(cost_factor_input)
            if 4 <= cost_factor <= 31:
                return cost_factor
            else:
                print("Le facteur de coût doit être entre 4 et 31. Veuillez réessayer.")
        except ValueError:
            print("Veuillez entrer un nombre valide.")

def main():
    while True:
        print("\nOptions:")
        print("1. Saisir un mot de passe et générer un hachage.")
        print("2. Vérifier la correspondance entre un hachage et un mot de passe.")
        print("3. Sauvegarder le sel et le hachage dans un fichier.")
        print("4. Charger le sel et le hachage depuis un fichier.")
        print("5. Saisir plusieurs mots de passe et générer des hachages.")
        print("6. Quitter.")

        choice = input("Choisissez une option (1/2/3/4/5/6): ")

        if choice == '1':
            mot_de_passe = input("Entrez le mot de passe : ")
            cost_factor = get_cost_factor()
            sel = generate_salt(cost_factor)
            hash_mot_de_passe = hash_password(mot_de_passe, sel)
            print(f"Sel : {sel}")
            print(f"Hachage du mot de passe : {hash_mot_de_passe}")

        elif choice == '2':
            try:
                hash_mot_de_passe = input("Entrez le hachage du mot de passe : ")
                mot_de_passe_a_verifier = input("Entrez le mot de passe à vérifier : ")
                correspondance = verify_password(hash_mot_de_passe, mot_de_passe_a_verifier)
                print(f"Le mot de passe correspond-il au hachage ? {correspondance}")
            except Exception as e:
                print(f"Erreur lors de la vérification du mot de passe : {e}")

        elif choice == '3':
            try:
                sel = input("Entrez le sel : ")
                hash_mot_de_passe = input("Entrez le hachage du mot de passe : ")
                filename = input("Entrez le nom du fichier pour sauvegarder les données : ")
                save_to_file(sel, hash_mot_de_passe, filename)
                print(f"Données sauvegardées dans {filename}")
            except Exception as e:
                print(f"Erreur lors de la sauvegarde des données : {e}")

        elif choice == '4':
            try:
                filename = input("Entrez le nom du fichier pour charger les données : ")
                sel, hash_mot_de_passe = load_from_file(filename)
                print(f"Sel : {sel}")
                print(f"Hachage du mot de passe : {hash_mot_de_passe}")
            except Exception as e:
                print(f"Erreur lors du chargement des données : {e}")

        elif choice == '5':
            cost_factor = get_cost_factor()
            while True:
                mot_de_passe = input("Entrez le mot de passe (ou tapez 'quit' pour arrêter) : ")
                if mot_de_passe.lower() == 'quit':
                    break
                sel = generate_salt(cost_factor)
                hash_mot_de_passe = hash_password(mot_de_passe, sel)
                print(f"Sel : {sel}")
                print(f"Hachage du mot de passe : {hash_mot_de_passe}")

        elif choice == '6':
            print("Au revoir !")
            break

        else:
            print("Option invalide. Veuillez choisir une option valide.")

if __name__ == "__main__":
    main()

