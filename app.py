from flask import Flask, render_template, request, jsonify
import os
import requests
from dotenv import load_dotenv
from math import floor
from datetime import datetime

load_dotenv()

app = Flask(__name__)

# Dados do Spotify
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")


def get_access_token():
    url = "https://accounts.spotify.com/api/token"
    response = requests.post(url, {
        'grant_type': 'client_credentials',
        'client_id': SPOTIFY_CLIENT_ID,
        'client_secret': SPOTIFY_CLIENT_SECRET,
    })
    return response.json().get('access_token')


def format_album_length(ms: int) -> str:
    total_seconds = floor(ms / 1000)
    minutes = floor(total_seconds / 60)
    seconds = total_seconds % 60
    return f"{minutes}:{seconds:02d}"


def format_release_date(date_str: str) -> str:
    """
    Recebe a data no formato ISO (YYYY-MM-DD ou YYYY-MM) e devolve no formato:
    'August 25, 2025'
    """
    try:
        if len(date_str) == 4:  # só ano
            return date_str
        elif len(date_str) == 7:  # ano-mês
            dt = datetime.strptime(date_str, "%Y-%m")
            return dt.strftime("%B %Y")
        else:  # ano-mês-dia
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            return dt.strftime("%B %d, %Y")
    except Exception:
        return date_str  # fallback se algo der errado


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/search", methods=["POST"])
def search():
    query = request.json.get("query")
    token = get_access_token()

    headers = {"Authorization": f"Bearer {token}"}
    params = {"q": query, "type": "album", "limit": 1}
    res = requests.get("https://api.spotify.com/v1/search", headers=headers, params=params)
    data = res.json()

    if data["albums"]["items"]:
        album = data["albums"]["items"][0]
        album_id = album["id"]

        # Buscar informações completas do álbum
        album_url = f"https://api.spotify.com/v1/albums/{album_id}"
        album_res = requests.get(album_url, headers=headers)
        album_data = album_res.json()

        # Tracks (com duração em ms)
        tracks = [t["name"] for t in album_data["tracks"]["items"]]

        # Calcular duração total do álbum formatada em MM:SS
        total_ms = sum(t["duration_ms"] for t in album_data["tracks"]["items"])
        album_length = format_album_length(total_ms)

        # Format release date
        release_date = format_release_date(album_data["release_date"])

        return jsonify({
            "name": album_data["name"],
            "artist": album_data["artists"][0]["name"],
            "year": album_data["release_date"][:4],
            "release_date": release_date,
            "label": album_data.get("label", "Unknown"),
            "length": album_length,
            "image": album_data["images"][0]["url"],
            "tracks": tracks
        })

    return jsonify({"error": "Álbum não encontrado"}), 404

@app.route("/suggest", methods=["POST"])
def suggest():
    query = request.json.get("query")
    token = get_access_token()
    headers = {"Authorization": f"Bearer {token}"}
    params = {"q": query, "type": "album", "limit": 5}
    res = requests.get("https://api.spotify.com/v1/search", headers=headers, params=params)
    data = res.json()

    suggestions = []
    for item in data.get("albums", {}).get("items", []):
        suggestions.append({
            "name": item["name"],
            "artist": item["artists"][0]["name"]
        })

    return jsonify({"suggestions": suggestions})

 

if __name__ == "__main__":
    app.run(debug=True)
