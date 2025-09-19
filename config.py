def get_db_config():
    """データベース設定取得"""
    return {
        "host": "localhost",
        "port": 5432,
        "database": "aichat",
        "user": "aichat_user",
        "password": "aichat123"
    }

# バージョン情報
VERSION = "1.0.0"
SERVICE_NAME = "MCP-Management"
