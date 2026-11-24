import os

# Settings are read from the environment, so set fake values before the app loads.
os.environ.setdefault("SUPABASE_URL", "http://supabase.test")
os.environ.setdefault("SUPABASE_ANON_KEY", "anon-test-key")
