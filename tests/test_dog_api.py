"""Offline deterministic tests for real Dog API v2 integration."""
import pytest
from unittest.mock import patch

from app import dog_api
from app.dog_api import DogAPIUnavailable

BREEDS = {
    "data": [
        {"id": "dog-001", "type": "breed", "attributes": {
            "name": "Golden Retriever",
            "description": "Friendly and active dog",
            "life": {"min": 10, "max": 12},
            "hypoallergenic": False,
            "images": [{"medium": "https://images.dogapi.dog/golden.webp",
                        "attribution": {"author": "Example Artist", "license": "CC BY 4.0",
                                        "source_url": "https://commons.wikimedia.org/example"}}],
        }},
        {"id": "dog-002", "type": "breed", "attributes": {
            "name": "Poodle", "description": "Intelligent breed",
            "life": {"min": 12, "max": 15}, "hypoallergenic": True, "images": [],
        }},
    ],
}
FACTS = {"data": [{"id": "fact-01", "type": "fact", "attributes": {"body": "Dogs have a keen sense of smell."}}]}


@pytest.fixture(autouse=True)
def clear_dog_cache():
    dog_api._BREED_CACHE = None
    yield
    dog_api._BREED_CACHE = None


def test_breed_route_normalizes_real_api_shape(client):
    with patch.object(dog_api, "_request", return_value=BREEDS) as upstream:
        response = client.get("/api/v1/dog/breeds")
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "dogapi.dog"
    assert data["count"] == 2
    assert data["breeds"][0]["name"] == "Golden Retriever"
    assert data["breeds"][0]["image_credit"]["author"] == "Example Artist"
    assert data["breeds"][1]["image_url"] is None
    upstream.assert_called_once_with("/breeds", {"page[size]": 1000})


def test_breed_list_is_cached(client):
    with patch.object(dog_api, "_request", return_value=BREEDS) as upstream:
        assert client.get("/api/v1/dog/breeds").status_code == 200
        assert client.get("/api/v1/dog/breeds").status_code == 200
    assert upstream.call_count == 1


def test_facts_are_fresh_on_every_request(client):
    with patch.object(dog_api, "_request", return_value=FACTS) as upstream:
        a = client.get("/api/v1/dog/facts?limit=2")
        b = client.get("/api/v1/dog/facts?limit=2")
    assert a.status_code == b.status_code == 200
    assert a.json()["facts"][0]["text"] == "Dogs have a keen sense of smell."
    assert upstream.call_count == 2
    upstream.assert_called_with("/facts", {"limit": 2})


@pytest.mark.parametrize("limit", ["0", "-1", "6", "bad"])
def test_facts_limit_validation(client, limit):
    assert client.get(f"/api/v1/dog/facts?limit={limit}").status_code == 422


@pytest.mark.parametrize("endpoint", ["/api/v1/dog/breeds", "/api/v1/dog/facts"])
def test_upstream_failure_is_503(client, endpoint):
    with patch.object(dog_api, "_request", side_effect=DogAPIUnavailable("Dog API temporarily unavailable.")):
        response = client.get(endpoint)
    assert response.status_code == 503
    assert "unavailable" in response.json()["detail"]


def test_bad_payload_is_detected():
    class FakeResponse:
        def __enter__(self): return self
        def __exit__(self, *args): return None
    with patch.object(dog_api, "urlopen", return_value=FakeResponse()), patch.object(dog_api.json, "load", return_value={"bad": []}):
        with pytest.raises(DogAPIUnavailable, match="unexpected response"):
            dog_api._request("/breeds")


def test_upstream_network_failure_is_handled():
    with patch.object(dog_api, "urlopen", side_effect=OSError("Connection refused")):
        with pytest.raises(DogAPIUnavailable, match="temporarily unavailable"):
            dog_api._request("/facts", {"limit": 1})


def test_empty_and_malformed_records_do_not_crash(client):
    fixture = {"data": [{"id": "x", "attributes": {"name": "Example", "images": [
        {"medium": "javascript:alert('x')"}]}}, {"bad": True}, None]}
    with patch.object(dog_api, "_request", return_value=fixture):
        response = client.get("/api/v1/dog/breeds")
    assert response.status_code == 200
    assert response.json()["count"] == 1
    assert response.json()["breeds"][0]["image_url"] is None
