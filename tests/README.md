# 🧪 Tests (`tests/`)

> **Trust, but Verify!** ✅

This directory contains the test suite to ensure HermesLink doesn't break when we add cool new features.

---

## 🏃 Running Tests

We use `pytest` for everything.

```bash
# Run all tests
pytest

# Run verbose
pytest -v
```

## 📂 Structure

- **`test_core/`**: Unit tests for JobManager and Scheduler.
- **`test_engines/`**: Integration tests for Aria2 and other engines.
- **`test_integration/`**: End-to-end user flow tests.

---

> _If it's not tested, it's broken._ 💥
