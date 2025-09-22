from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import asyncpg
import json
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from config import get_db_config

app = FastAPI(title="MCP-Management", version="1.0.0")

# 静的ファイルとテンプレート
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# データモデル
class MCPTool(BaseModel):
    tool_key: str
    tool_name: str
    description: str
    mcp_server_name: Optional[str] = None
    system_prompt: Optional[str] = None

class MCPToolResponse(BaseModel):
    tool_key: str
    tool_name: str
    description: str
    mcp_server_name: Optional[str]
    system_prompt: Optional[str]
    created_at: datetime
    updated_at: datetime

# データベース接続
async def get_db_connection():
    config = get_db_config()
    return await asyncpg.connect(
        host=config["host"],
        port=config["port"],
        database=config["database"],
        user=config["user"],
        password=config["password"]
    )

@app.get("/", response_class=HTMLResponse)
async def main_page(request: Request):
    """メインページ"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/tools", response_model=List[MCPToolResponse])
async def get_all_tools():
    """全ツール一覧取得"""
    conn = await get_db_connection()
    try:
        query = "SELECT * FROM mcp_tools ORDER BY tool_key"
        rows = await conn.fetch(query)
        return [dict(row) for row in rows]
    finally:
        await conn.close()

@app.get("/api/tools/{tool_key}", response_model=MCPToolResponse)
async def get_tool(tool_key: str):
    """特定ツール取得"""
    conn = await get_db_connection()
    try:
        query = "SELECT * FROM mcp_tools WHERE tool_key = $1"
        row = await conn.fetchrow(query, tool_key)
        if not row:
            raise HTTPException(status_code=404, detail="Tool not found")
        return dict(row)
    finally:
        await conn.close()

@app.post("/api/tools", response_model=MCPToolResponse)
async def create_tool(tool: MCPTool):
    """新規ツール作成"""
    conn = await get_db_connection()
    try:
        query = """
            INSERT INTO mcp_tools (tool_key, tool_name, description, mcp_server_name, system_prompt, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *
        """
        row = await conn.fetchrow(query, tool.tool_key, tool.tool_name, tool.description, tool.mcp_server_name, tool.system_prompt)
        return dict(row)
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=400, detail="Tool key already exists")
    finally:
        await conn.close()

@app.put("/api/tools/{tool_key}", response_model=MCPToolResponse)
async def update_tool(tool_key: str, tool: MCPTool):
    """ツール更新"""
    conn = await get_db_connection()
    try:
        query = """
            UPDATE mcp_tools 
            SET tool_name = $2, description = $3, mcp_server_name = $4, system_prompt = $5, updated_at = CURRENT_TIMESTAMP
            WHERE tool_key = $1
            RETURNING *
        """
        row = await conn.fetchrow(query, tool_key, tool.tool_name, tool.description, tool.mcp_server_name, tool.system_prompt)
        if not row:
            raise HTTPException(status_code=404, detail="Tool not found")
        return dict(row)
    finally:
        await conn.close()

@app.delete("/api/tools/{tool_key}")
async def delete_tool(tool_key: str):
    """ツール削除"""
    conn = await get_db_connection()
    try:
        query = "DELETE FROM mcp_tools WHERE tool_key = $1"
        result = await conn.execute(query, tool_key)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Tool not found")
        return {"message": "Tool deleted successfully"}
    finally:
        await conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8008)
