"""
Supabase client utility for database operations
"""
from supabase import create_client, Client
from flask import current_app

def get_supabase_client() -> Client:
    """
    Create and return a Supabase client instance
    """
    supabase_url = current_app.config['SUPABASE_URL']
    supabase_key = current_app.config['SUPABASE_KEY']

    if not supabase_url or not supabase_key:
        raise ValueError("Supabase URL and Key must be configured")

    return create_client(supabase_url, supabase_key)

def get_supabase_admin_client() -> Client:
    """
    Create and return a Supabase client with service role key (admin access)
    """
    supabase_url = current_app.config['SUPABASE_URL']
    supabase_service_key = current_app.config['SUPABASE_SERVICE_KEY']

    if not supabase_url or not supabase_service_key:
        raise ValueError("Supabase URL and Service Key must be configured")

    return create_client(supabase_url, supabase_service_key)
