let tools = [];
let sortColumn = 0;
let sortDirection = 'asc';

// ページ読み込み時
document.addEventListener('DOMContentLoaded', function() {
    loadTools();
});

// ツール一覧読み込み
async function loadTools() {
    try {
        const response = await fetch('/api/tools');
        tools = await response.json();
        renderTable();
    } catch (error) {
        console.error('ツール読み込みエラー:', error);
        alert('ツール一覧の読み込みに失敗しました');
    }
}

// テーブル描画
function renderTable() {
    const tbody = document.getElementById('toolsTableBody');
    tbody.innerHTML = '';

    tools.forEach(tool => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${tool.tool_key}</td>
            <td>${tool.tool_name}</td>
            <td>${truncateText(tool.description, 100)}</td>
            <td><span class="badge bg-secondary">${tool.mcp_server_name || 'Unknown'}</span></td>
            <td>${tool.system_prompt || ''}</td>
            <td>${formatDateTime(tool.updated_at)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editTool('${tool.tool_key}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteTool('${tool.tool_key}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// テーブルソート機能
function sortTable(columnIndex) {
    const columns = ['tool_key', 'tool_name', 'description', 'mcp_server_name', 'system_prompt', 'updated_at'];
    const column = columns[columnIndex];

    if (sortColumn === columnIndex) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = columnIndex;
        sortDirection = 'asc';
    }

    tools.sort((a, b) => {
        let aVal = a[column] || '';
        let bVal = b[column] || '';

        if (column === 'updated_at') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
        } else {
            aVal = aVal.toString().toLowerCase();
            bVal = bVal.toString().toLowerCase();
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    updateSortIcons();
    renderTable();
}

// ソートアイコン更新
function updateSortIcons() {
    for (let i = 0; i < 5; i++) {
        const icon = document.getElementById(`sort${i}`);
        if (i === sortColumn) {
            icon.innerHTML = sortDirection === 'asc' ? '<i class="fas fa-sort-up"></i>' : '<i class="fas fa-sort-down"></i>';
        } else {
            icon.innerHTML = '<i class="fas fa-sort"></i>';
        }
    }
}

// 新規ツール保存
async function saveTool() {
    const toolData = {
        tool_key: document.getElementById('addToolKey').value,
        tool_name: document.getElementById('addToolName').value,
        description: document.getElementById('addDescription').value,
        mcp_server_name: document.getElementById('addMcpServer').value,
        system_prompt: document.getElementById('addSystemPrompt').value || null
    };

    try {
        const response = await fetch('/api/tools', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(toolData)
        });

        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('addModal')).hide();
            document.getElementById('addForm').reset();
            loadTools();
            alert('ツールを追加しました');
        } else {
            const error = await response.json();
            alert(`エラー: ${error.detail}`);
        }
    } catch (error) {
        console.error('保存エラー:', error);
        alert('保存に失敗しました');
    }
}

// ツール編集
function editTool(toolKey) {
    console.log('editTool called with toolKey:', toolKey);
    const tool = tools.find(t => t.tool_key === toolKey);
    if (!tool) {
        console.error('Tool not found:', toolKey);
        alert('ツールが見つかりません');
        return;
    }
    
    console.log('Found tool:', tool);
    
    try {
        document.getElementById('editToolKey').value = tool.tool_key;
        document.getElementById('editToolName').value = tool.tool_name;
        document.getElementById('editDescription').value = tool.description;
        document.getElementById('editMcpServer').value = tool.mcp_server_name || '';
        document.getElementById('editSystemPrompt').value = tool.system_prompt || '';

        console.log('Form fields populated successfully');
        new bootstrap.Modal(document.getElementById('editModal')).show();
        console.log('Modal should be shown');
    } catch (error) {
        console.error('Error in editTool:', error);
        alert('編集モーダルの表示でエラーが発生しました: ' + error.message);
    }
}

// ツール更新
async function updateTool() {
    const toolKey = document.getElementById('editToolKey').value;
    const toolData = {
        tool_key: toolKey,
        tool_name: document.getElementById('editToolName').value,
        description: document.getElementById('editDescription').value,
        mcp_server_name: document.getElementById('editMcpServer').value,
        system_prompt: document.getElementById('editSystemPrompt').value || null
    };

    try {
        const response = await fetch(`/api/tools/${toolKey}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(toolData)
        });

        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
            loadTools();
            alert('ツールを更新しました');
        } else {
            const error = await response.json();
            alert(`エラー: ${error.detail}`);
        }
    } catch (error) {
        console.error('更新エラー:', error);
        alert('更新に失敗しました');
    }
}

// ツール削除
async function deleteTool(toolKey) {
    if (!confirm(`ツール「${toolKey}」を削除しますか？`)) return;

    try {
        const response = await fetch(`/api/tools/${toolKey}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadTools();
            alert('ツールを削除しました');
        } else {
            const error = await response.json();
            alert(`エラー: ${error.detail}`);
        }
    } catch (error) {
        console.error('削除エラー:', error);
        alert('削除に失敗しました');
    }
}

// ユーティリティ関数
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP');
}
