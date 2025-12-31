from flask import Flask, request, jsonify, send_from_directory, session, redirect, url_for
import os
import requests
from flask_session import Session

app = Flask(__name__, static_folder='public', static_url_path='/public')

# Secret key for sessions
app.secret_key = 'paramify_api_browser_sess_key'

# Configure session to store in filesystem
app.config['SESSION_TYPE'] = 'filesystem'
Session(app)

# Path to the 'public' folder where static assets are stored
PUBLIC_FOLDER = 'public'

# Root URL to serve the HTML file directly from the public folder
@app.route('/')
def index():
    return send_from_directory(PUBLIC_FOLDER, 'main.html')

# Logout endpoint to destroy the session
@app.route('/logout')
def logout():
    session.clear()  # Clear the session
    return redirect(url_for('index'))

# Login endpoint to validate API URL and token
@app.route('/login', methods=['POST'])
def login():
    # Clear any previous session values
    session['isAuthenticated'] = False
    session['apiURL'] = ""
    session['apiToken'] = ""

    # Get the user supplied inputs
    api_url = request.json.get('apiURL', '')
    api_token = request.json.get('apiToken', '')

    try:
        # Make a request to the API to validate the URL and token
        # Paramify API uses Bearer token authentication
        response = requests.get(
            f'{api_url}/projects',
            headers={'Authorization': f'Bearer {api_token}'}
        )

        if response.status_code == 200:
            # If successful, store in session

            session['isAuthenticated'] = True
            session['apiURL'] = api_url
            session['apiToken'] = api_token

            print("Successful Login")
            return redirect(url_for('index'))
        else:
            return jsonify({'error': 'Invalid URL or Token.  Error: ' + str(response.status_code)}), response.status_code

    except requests.RequestException as error:
        print(f"Authentication failed: {error}")
        return jsonify({'error': 'Invalid URL or Token'}), 400

# Execute endpoint for making API calls
@app.route('/execute', methods=['POST'])
def execute():
    # Check if user is authenticated
    if not session.get('isAuthenticated', False):
        return jsonify({'error': 'Not authenticated. Please login first.'}), 401
    
    endpoint = request.json.get('endpoint', '')
    api_url = session.get('apiURL', '')
    api_token = session.get('apiToken', '')

    try:
        # Make a request to the API endpoint
        # Paramify API uses Bearer token authentication
        response = requests.get(
            f'{api_url}{endpoint}',
            headers={'Authorization': f'Bearer {api_token}'}
        )
        
        # Handle non-JSON responses
        if response.status_code == 200:
            try:
                return jsonify(response.json())
            except ValueError:
                return jsonify({'error': 'Response is not valid JSON', 'status_code': response.status_code}), 500
        else:
            # Return error response
            try:
                error_data = response.json()
                return jsonify(error_data), response.status_code
            except ValueError:
                return jsonify({'error': f'Request failed with status {response.status_code}'}), response.status_code

    except requests.RequestException as error:
        print(f"Error executing API call: {error}")
        return jsonify({'error': 'Failed to execute API call'}), 500

# Serve favicon
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(PUBLIC_FOLDER, 'favicon.ico', mimetype='image/vnd.microsoft.icon')

# Serve static files (CSS, JS, images) from the /public folder
@app.route('/<path:filename>')
def serve_public_files(filename):
    return send_from_directory(PUBLIC_FOLDER, filename)

if __name__ == '__main__':
    app.run(port=3000, debug=True)
