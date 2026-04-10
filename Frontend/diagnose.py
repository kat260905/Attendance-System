from app import app
from flask_jwt_extended import create_access_token

with app.app_context():
    token = create_access_token(identity=1)
    print('Token:', token)

import requests
r = requests.get('http://localhost:5000/api/admin/dashboard/year-wise-trend', headers={'Authorization': f'Bearer {token}'})
print(r.status_code)
print(r.text)
