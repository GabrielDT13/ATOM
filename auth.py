import json
import os

DATA_FILE = os.path.join('data', 'users.json')


def load_users():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)



def check_user(username, password):
    users = load_users()
    user = users.get(username)
    if not user:
        return False
    return user.get("password") == password



def get_user_email(username):
    """Devuelve el email del usuario"""
    users = load_users()
    user = users.get(username)
    if user:
        return user.get("email")
    return None



def add_user(username, password, email):
    users = load_users()

    # Verificar si el nombre de usuario ya existe
    if username in users:
        return False, "El usuario ya existe"

    # Verificar si el email ya está registrado
    for user in users.values():
        if user.get("email") == email:
            return False, "El email ya está registrado"

    # Añadir nuevo usuario
    users[username] = {"password": password, "email": email}
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=4, ensure_ascii=False)

    return True, "Usuario registrado correctamente"