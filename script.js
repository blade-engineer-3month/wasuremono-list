// ========================================
// データ管理
// ========================================

// 初期データ
const DEFAULT_ITEMS = [
    { id: 1, text: '財布', checked: false },
    { id: 2, text: 'スマホ', checked: false },
    { id: 3, text: '鍵', checked: false },
    { id: 4, text: 'マスク', checked: false }
];

// ローカルストレージキー
const STORAGE_KEY = 'wasuremono-list';

// 現在のリストデータ
let items = [];

// ドラッグ状態
let draggedElement = null;
let dragStartY = 0;
let isDragging = false;

// ========================================
// DOM要素
// ========================================
const checklist = document.getElementById('checklist');
const addBtn = document.getElementById('add-btn');
const modal = document.getElementById('modal');
const addForm = document.getElementById('add-form');
const itemInput = document.getElementById('item-input');
const cancelBtn = document.getElementById('cancel-btn');
const checkAllBtn = document.getElementById('check-all-btn');
const resetBtn = document.getElementById('reset-btn');
const statusElement = document.getElementById('status');
const remainingCountElement = document.getElementById('remaining-count');

// ========================================
// 初期化
// ========================================
function init() {
    loadData();
    renderList();
    updateStatus();
    attachEventListeners();
}

// ========================================
// データ読み込み
// ========================================
function loadData() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
        try {
            items = JSON.parse(savedData);
        } catch (e) {
            console.error('データ読み込みエラー:', e);
            items = [...DEFAULT_ITEMS];
        }
    } else {
        items = [...DEFAULT_ITEMS];
    }
}

// ========================================
// データ保存
// ========================================
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ========================================
// リスト描画
// ========================================
function renderList() {
    checklist.innerHTML = '';

    if (items.length === 0) {
        checklist.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-text">項目を追加してください</div>
            </div>
        `;
        return;
    }

    items.forEach(item => {
        const li = createListItem(item);
        checklist.appendChild(li);
    });
}

// ========================================
// リスト項目作成
// ========================================
function createListItem(item) {
    const li = document.createElement('li');
    li.className = `list-item ${item.checked ? 'checked' : ''}`;
    li.dataset.id = item.id;

    li.innerHTML = `
        <div class="drag-handle" aria-label="並び替え">
            ☰
        </div>
        <div class="checkbox-wrapper">
            <div class="checkbox">
                <span class="checkmark">✓</span>
            </div>
        </div>
        <span class="item-text">${escapeHtml(item.text)}</span>
        <button class="delete-btn" aria-label="削除">×</button>
    `;

    // 行全体タップでチェック切替
    li.addEventListener('click', (e) => {
        // 削除ボタン、ドラッグハンドルクリック時は除外
        if (e.target.classList.contains('delete-btn') ||
            e.target.classList.contains('drag-handle') ||
            e.target.closest('.drag-handle')) {
            return;
        }
        toggleCheck(item.id);
    });

    // 削除ボタン
    const deleteBtn = li.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteItem(item.id);
    });

    // ドラッグ機能
    const dragHandle = li.querySelector('.drag-handle');
    setupDragAndDrop(li, dragHandle);

    return li;
}

// ========================================
// HTMLエスケープ
// ========================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// ドラッグ&ドロップ機能
// ========================================
function setupDragAndDrop(listItem, dragHandle) {
    // マウスイベント（PC用）
    dragHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startDrag(listItem, e.clientY);
    });

    // タッチイベント（スマホ用）
    dragHandle.addEventListener('touchstart', (e) => {
        startDrag(listItem, e.touches[0].clientY);
    }, { passive: true });
}

function startDrag(element, startY) {
    draggedElement = element;
    dragStartY = startY;
    isDragging = false;
    element.style.cursor = 'grabbing';
}

// グローバルマウス移動イベント
document.addEventListener('mousemove', (e) => {
    if (draggedElement && e.buttons === 1) {
        handleDragMove(e.clientY, e.clientX);
    }
});

// グローバルタッチ移動イベント
document.addEventListener('touchmove', (e) => {
    if (draggedElement) {
        const touch = e.touches[0];
        handleDragMove(touch.clientY, touch.clientX);
    }
}, { passive: false });

function handleDragMove(clientY, clientX) {
    const moveDistance = Math.abs(clientY - dragStartY);

    // 5px以上移動したらドラッグ開始
    if (!isDragging && moveDistance > 5) {
        isDragging = true;
        draggedElement.classList.add('dragging');
    }

    if (isDragging) {
        // 現在の位置にある要素を取得
        const elementBelow = document.elementFromPoint(clientX, clientY);
        const listItemBelow = elementBelow?.closest('.list-item');

        if (listItemBelow && listItemBelow !== draggedElement) {
            const rect = listItemBelow.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;

            // 中点より上なら前に、下なら後ろに挿入
            if (clientY < midpoint) {
                checklist.insertBefore(draggedElement, listItemBelow);
            } else {
                checklist.insertBefore(draggedElement, listItemBelow.nextSibling);
            }
        }
    }
}

// グローバルマウスアップイベント
document.addEventListener('mouseup', () => {
    endDrag();
});

// グローバルタッチ終了イベント
document.addEventListener('touchend', () => {
    endDrag();
});

function endDrag() {
    if (draggedElement) {
        if (isDragging) {
            draggedElement.classList.remove('dragging');
            updateItemsOrder();
            saveData();
        }
        draggedElement.style.cursor = '';
        draggedElement = null;
        isDragging = false;
    }
}

// 並び替え後の順序を更新
function updateItemsOrder() {
    const listItems = Array.from(checklist.querySelectorAll('.list-item'));
    const newOrder = listItems.map(li => parseInt(li.dataset.id));

    items.sort((a, b) => {
        return newOrder.indexOf(a.id) - newOrder.indexOf(b.id);
    });
}

// ========================================
// チェック切替
// ========================================
function toggleCheck(id) {
    const item = items.find(i => i.id === id);
    if (item) {
        item.checked = !item.checked;
        saveData();
        renderList();
        updateStatus();
    }
}

// ========================================
// 項目削除
// ========================================
function deleteItem(id) {
    if (confirm('本当に削除しますか？')) {
        items = items.filter(i => i.id !== id);
        saveData();
        renderList();
        updateStatus();
    }
}

// ========================================
// ステータス更新
// ========================================
function updateStatus() {
    const uncheckedCount = items.filter(i => !i.checked).length;
    remainingCountElement.textContent = uncheckedCount;

    if (items.length > 0 && uncheckedCount === 0) {
        statusElement.innerHTML = '🎉 忘れ物ゼロ！';
        statusElement.classList.add('complete');
    } else {
        statusElement.innerHTML = `あと <span id="remaining-count">${uncheckedCount}</span> こ！`;
        statusElement.classList.remove('complete');
    }
}

// ========================================
// モーダル表示
// ========================================
function showModal() {
    modal.classList.add('active');
    itemInput.value = '';
    // 少し遅延させてフォーカス（モバイルキーボード対応）
    setTimeout(() => {
        itemInput.focus();
    }, 100);
}

// ========================================
// モーダル非表示
// ========================================
function hideModal() {
    modal.classList.remove('active');
    itemInput.value = '';
}

// ========================================
// 項目追加
// ========================================
function addItem(text) {
    const trimmedText = text.trim();
    if (!trimmedText) {
        return;
    }

    const newItem = {
        id: Date.now(),
        text: trimmedText,
        checked: false
    };

    items.push(newItem);
    saveData();
    renderList();
    updateStatus();
    hideModal();
}

// ========================================
// 全部チェック
// ========================================
function checkAll() {
    items.forEach(item => {
        item.checked = true;
    });
    saveData();
    renderList();
    updateStatus();
}

// ========================================
// リセット
// ========================================
function resetAll() {
    if (confirm('全てのチェックを外しますか？')) {
        items.forEach(item => {
            item.checked = false;
        });
        saveData();
        renderList();
        updateStatus();
    }
}

// ========================================
// イベントリスナー設定
// ========================================
function attachEventListeners() {
    // 追加ボタン
    addBtn.addEventListener('click', showModal);

    // キャンセルボタン
    cancelBtn.addEventListener('click', hideModal);

    // モーダル背景クリックで閉じる
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal();
        }
    });

    // フォーム送信
    addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addItem(itemInput.value);
    });

    // 全部チェックボタン
    checkAllBtn.addEventListener('click', checkAll);

    // リセットボタン
    resetBtn.addEventListener('click', resetAll);

    // Escキーでモーダルを閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            hideModal();
        }
    });
}

// ========================================
// アプリ起動
// ========================================
document.addEventListener('DOMContentLoaded', init);
