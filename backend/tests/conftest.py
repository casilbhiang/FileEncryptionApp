import pytest
from unittest.mock import MagicMock

@pytest.fixture(autouse=True)
def mock_supabase_admin(monkeypatch):
    monkeypatch.setattr(
        "app.utils.supabase_client.get_supabase_admin_client",
        lambda: MagicMock()
    )
