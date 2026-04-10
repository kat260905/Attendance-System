import re

with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

def repl(match):
    route = match.group(0)
    if 'auth/login' in route or 'auth/register' in route or 'test-db' in route or 'auth/refresh' in route:
        return route
    # If already has jwt_required, match.group(0) might include it? No, my regex will just be @app.route(...)
    return route + '\n@jwt_required()'

new_content = re.sub(r'@app\.route\([^)]+\)', repl, content)

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(new_content)
