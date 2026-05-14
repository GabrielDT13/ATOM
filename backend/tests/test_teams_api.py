from __future__ import annotations

from fastapi.testclient import TestClient


def test_get_teams_route_returns_visible_items(client: TestClient, monkeypatch) -> None:
    from backend.app.api.routes import teams as team_routes

    monkeypatch.setattr(
        team_routes,
        "get_current_user",
        lambda request: {"id": "user-1", "username": "researcher", "role": "user"},
    )
    monkeypatch.setattr(
        team_routes,
        "list_teams_for_user",
        lambda user_id, username, role: [
            {
                "created_at": "2026-04-10T08:00:00+00:00",
                "entity_id": "entity-1",
                "entity_name": "Universidad de Las Palmas de Gran Canaria",
                "entity_slug": "universidad-de-las-palmas-de-gran-canaria",
                "id": "team-1",
                "member_count": 3,
                "membership_role": "owner",
                "name": "Equipo RNA",
                "owner_id": "user-1",
                "owner_username": "researcher",
                "slug": "researcher-equipo-rna",
                "updated_at": "2026-04-10T09:00:00+00:00",
            }
        ],
    )

    response = client.get("/api/teams")

    assert response.status_code == 200
    assert response.json() == {
        "items": [
            {
                "created_at": "2026-04-10T08:00:00+00:00",
                "entity_id": "entity-1",
                "entity_name": "Universidad de Las Palmas de Gran Canaria",
                "entity_slug": "universidad-de-las-palmas-de-gran-canaria",
                "id": "team-1",
                "member_count": 3,
                "membership_role": "owner",
                "name": "Equipo RNA",
                "owner_id": "user-1",
                "owner_username": "researcher",
                "slug": "researcher-equipo-rna",
                "updated_at": "2026-04-10T09:00:00+00:00",
            }
        ]
    }


def test_post_team_route_forwards_entity_and_members(client: TestClient, monkeypatch) -> None:
    from backend.app.api.routes import teams as team_routes

    captured: dict[str, object] = {}

    monkeypatch.setattr(
        team_routes,
        "get_current_user",
        lambda request: {"id": "user-1", "username": "researcher", "role": "user"},
    )

    def fake_create_team(*, actor_user_id, actor_username, name, entity_name, member_usernames):
        captured["actor_user_id"] = actor_user_id
        captured["actor_username"] = actor_username
        captured["name"] = name
        captured["entity_name"] = entity_name
        captured["member_usernames"] = member_usernames
        return True, "Equipo creado correctamente", "team-1"

    monkeypatch.setattr(team_routes, "create_team", fake_create_team)
    monkeypatch.setattr(
        team_routes,
        "get_team_details",
        lambda team_id, user_id, username, role: {
            "created_at": "2026-04-10T08:00:00+00:00",
            "entity_id": "entity-1",
            "entity_name": "Universidad de Las Palmas de Gran Canaria",
            "entity_slug": "universidad-de-las-palmas-de-gran-canaria",
            "id": team_id,
            "member_count": 2,
            "members": [
              {
                  "display_name": "researcher",
                  "id": "user-1",
                  "is_owner": True,
                  "member_role": "owner",
                  "username": "researcher",
              },
              {
                  "display_name": "analyst",
                  "id": "user-2",
                  "is_owner": False,
                  "member_role": "member",
                  "username": "analyst",
              },
            ],
            "membership_role": "owner",
            "name": "Equipo RNA",
            "owner_id": "user-1",
            "owner_username": "researcher",
            "slug": "researcher-equipo-rna",
            "updated_at": "2026-04-10T09:00:00+00:00",
        },
    )

    response = client.post(
        "/api/teams",
        json={
            "entity_name": "Universidad de Las Palmas de Gran Canaria",
            "member_usernames": ["analyst"],
            "name": "Equipo RNA",
        },
    )

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert captured == {
        "actor_user_id": "user-1",
        "actor_username": "researcher",
        "name": "Equipo RNA",
        "entity_name": "Universidad de Las Palmas de Gran Canaria",
        "member_usernames": ["analyst"],
    }


def test_get_team_member_candidates_route_forwards_filters(client: TestClient, monkeypatch) -> None:
    from backend.app.api.routes import teams as team_routes

    captured: dict[str, object] = {}

    monkeypatch.setattr(
        team_routes,
        "get_current_user",
        lambda request: {"id": "user-1", "username": "researcher", "role": "user"},
    )

    def fake_search_team_member_candidates(*, session_user_id, query, limit, exclude_usernames):
        captured["session_user_id"] = session_user_id
        captured["query"] = query
        captured["limit"] = limit
        captured["exclude_usernames"] = exclude_usernames
        return [
            {
                "display_name": "analyst",
                "id": "user-2",
                "username": "analyst",
            }
        ]

    monkeypatch.setattr(team_routes, "search_team_member_candidates", fake_search_team_member_candidates)

    response = client.get(
        "/api/teams/member-candidates",
        params={"q": "ana", "limit": 5, "exclude_usernames": ["manager"]},
    )

    assert response.status_code == 200
    assert response.json() == {
        "users": [
            {
                "display_name": "analyst",
                "id": "user-2",
                "username": "analyst",
            }
        ]
    }
    assert captured == {
        "session_user_id": "user-1",
        "query": "ana",
        "limit": 5,
        "exclude_usernames": ["manager"],
    }
