"""
Flask application for Album Poster Maker.

This app integrates with the Spotify Web API to fetch album data,
format information, and provide both search and suggestion endpoints.
The frontend consumes these endpoints to render posters dynamically.
"""

from flask import Flask, render_template, request, jsonify
import os
import requests
from dotenv import load_dotenv
from math import floor
from datetime import datetime
from typing import Optional, List, Dict, Any

# === ENVIRONMENT SETUP ===
load_dotenv()

app = Flask(__name__)

# Spotify API credentials (loaded from environment variables)
SPOTIFY_CLIENT_ID: Optional[str] = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET: Optional[str] = os.getenv("SPOTIFY_CLIENT_SECRET")


# === HELPER FUNCTIONS ===

def get_access_token() -> str:
    """
    Retrieve a Spotify API access token using Client Credentials Flow.

    Returns:
        str: Access token for Spotify API.
    """
    url = "https://accounts.spotify.com/api/token"
    response = requests.post(url, {
        'grant_type': 'client_credentials',
        'client_id': SPOTIFY_CLIENT_ID,
        'client_secret': SPOTIFY_CLIENT_SECRET,
    })
    return response.json().get('access_token')


def format_album_length(ms: int) -> str:
    """
    Convert album total duration from milliseconds to MM:SS format.

    Args:
        ms (int): Duration in milliseconds.

    Returns:
        str: Formatted length (e.g., "42:05").
    """
    total_seconds = floor(ms / 1000)
    minutes = floor(total_seconds / 60)
    seconds = total_seconds % 60
    return f"{minutes}:{seconds:02d}"


def format_release_date(date_str: str) -> str:
    """
    Format a release date string from Spotify API into human-readable form.

    Spotify provides dates in formats:
      - YYYY
      - YYYY-MM
      - YYYY-MM-DD

    Args:
        date_str (str): Original date string from Spotify.

    Returns:
        str: Formatted release date (e.g., "August 25, 2025").
    """
    try:
        if len(date_str) == 4:  # Year only
            return date_str
        elif len(date_str) == 7:  # Year-Month
            dt = datetime.strptime(date_str, "%Y-%m")
            return dt.strftime("%B %Y")
        else:  # Full date
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            return dt.strftime("%B %d, %Y")
    except Exception:
        return date_str  # Fallback if parsing fails


# === ROUTES ===

@app.route("/")
def index():
    """
    Render the main frontend page.

    Returns:
        str: Rendered HTML template.
    """
    return render_template("index.html")


@app.route("/search", methods=["POST"])
def search():
    """
    Search for an album on Spotify by name and return detailed information.

    Expects:
        JSON body: { "query": "<album name>" }

    Returns:
        JSON with album details:
        {
            "name": str,
            "artist": str,
            "year": str,
            "release_date": str,
            "label": str,
            "length": str,
            "image": str,
            "tracks": List[str]
        }

        or { "error": str } with status 404 if not found.
    """
    query: str = request.json.get("query")
    token: str = get_access_token()

    headers = {"Authorization": f"Bearer {token}"}
    params = {"q": query, "type": "album", "limit": 1}
    res = requests.get("https://api.spotify.com/v1/search", headers=headers, params=params)
    data: Dict[str, Any] = res.json()

    if data["albums"]["items"]:
        album = data["albums"]["items"][0]
        album_id = album["id"]

        # Fetch full album details
        album_url = f"https://api.spotify.com/v1/albums/{album_id}"
        album_res = requests.get(album_url, headers=headers)
        album_data = album_res.json()

        # Track list
        tracks: List[str] = [t["name"] for t in album_data["tracks"]["items"]]

        # Total album length
        total_ms: int = sum(t["duration_ms"] for t in album_data["tracks"]["items"])
        album_length: str = format_album_length(total_ms)

        # Formatted release date
        release_date: str = format_release_date(album_data["release_date"])

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

    return jsonify({"error": "Album not found"}), 404


@app.route("/suggest", methods=["POST"])
def suggest():
    """
    Provide real-time album suggestions based on partial query.

    Expects:
        JSON body: { "query": "<partial name>" }

    Returns:
        JSON with list of suggestions:
        {
            "suggestions": [
                {"name": str, "artist": str}, ...
            ]
        }
    """
    query: str = request.json.get("query")
    token: str = get_access_token()
    headers = {"Authorization": f"Bearer {token}"}
    params = {"q": query, "type": "album", "limit": 5}
    res = requests.get("https://api.spotify.com/v1/search", headers=headers, params=params)
    data: Dict[str, Any] = res.json()

    suggestions: List[Dict[str, str]] = []
    for item in data.get("albums", {}).get("items", []):
        suggestions.append({
            "name": item["name"],
            "artist": item["artists"][0]["name"]
        })

    return jsonify({"suggestions": suggestions})


# === ENTRY POINT ===
if __name__ == "__main__":
    app.run(debug=True)
