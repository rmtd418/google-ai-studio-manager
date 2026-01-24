// content.js - V33 文件名过滤 & 完美显示版 & 搜索+多选增强版

(function () {
  if (document.getElementById('ais-overlay-root')) return;

  // === 1. 构建 UI (Shadow DOM) ===
  const host = document.createElement('div');
  host.id = 'ais-overlay-root';
  host.style.cssText = "position: fixed; z-index: 2147483647; top: 0; left: 0; width: 0; height: 0; pointer-events: none;";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    /* === 样式系统 (V30样式保持不变) === */
    :host {
      --bg-panel: #1e1e1e; --bg-card: #2d2d2d; --bg-hover: #383838; --bg-ball: #1e1e1e; --border: #444;
      --text-main: #e8eaed; --text-sub: #bdc1c6; --primary: #8ab4f8; --danger: #f28b82;
      --shadow: 0 4px 12px rgba(0,0,0,0.5);
      --star-active: #fbbc04; --badge-bg: #3c4043; --badge-text: #8ab4f8;
      --highlight: #f0f000; --highlight-text: #000;
    }
    @media (prefers-color-scheme: light) {
      :host {
        --bg-panel: #ffffff; --bg-card: #f1f3f4; --bg-hover: #e8eaed; --bg-ball: #ffffff; --border: #dadce0;
        --text-main: #202124; --text-sub: #5f6368; --primary: #1a73e8; --danger: #d93025;
        --shadow: 0 2px 10px rgba(0,0,0,0.15); --badge-bg: #e8f0fe; --badge-text: #1967d2;
      }
    }
    * { box-sizing: border-box; }
    .float-ball, .panel-container { pointer-events: auto; }

    /* 悬浮球 */
    .float-ball {
      position: fixed; right: 0; bottom: 200px; width: 36px; height: 36px;
      background: var(--bg-ball); border: 1px solid var(--border); border-radius: 50%;
      box-shadow: var(--shadow); cursor: grab; display: flex; align-items: center; justify-content: center;
      z-index: 1000; user-select: none; touch-action: none; transition: background 0.2s; 
    }
    .float-ball.snapping { transition: left 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), background 0.2s; }
    .float-ball:active { cursor: grabbing; background: var(--bg-hover); }
    .float-ball:hover { border-color: var(--primary); }
    .float-ball svg { width: 20px; height: 20px; fill: var(--text-sub); pointer-events: none; }
    .float-ball:hover svg { fill: var(--primary); }
    
    /* 悬浮面板 */
    .panel-container {
      position: fixed; right: 20px; top: 70px; bottom: 20px; width: 340px;
      background: var(--bg-panel); border: 1px solid var(--border); border-radius: 12px;
      box-shadow: var(--shadow); display: flex; flex-direction: column;
      font-family: "Segoe UI", Roboto, sans-serif; color: var(--text-main);
      z-index: 999; transform: translateX(120%); transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); opacity: 0;
      overflow: visible; /* 允许侧边按钮突出 */
    }
    .panel-container.open { transform: translateX(0); opacity: 1; }

    /* 侧边关闭条 (Protruding Tab) */
    .side-close-area {
      position: absolute; left: -34px; top: 50%; transform: translateY(-50%);
      width: 34px; height: 80px;
      background: var(--bg-panel); /* 与面板同色 */
      border: 1px solid var(--border);
      border-right: none; /* 与面板融合 */
      border-radius: 12px 0 0 12px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      z-index: 20; transition: all 0.2s;
      box-shadow: -4px 4px 12px rgba(0,0,0,0.3); /* 左侧阴影 */
      color: var(--text-sub);
    }
    .side-close-area:hover { 
      background: var(--danger); border-color: var(--danger); color: #fff;
      width: 40px; left: -40px; /* Hover时伸出更多 */
      box-shadow: -4px 4px 16px rgba(0,0,0,0.4);
    }
    /* 遮挡条：用于遮住按钮和面板连接处的边框，让它们看起来是一体的 */
    .side-close-area::after {
      content: ''; position: absolute; right: -2px; top: 0; bottom: 0; width: 4px;
      background: var(--bg-panel); pointer-events: none;
    }
    .side-close-area:hover::after { background: var(--danger); }

    .close-icon { font-size: 20px; font-weight: bold; margin-right: 2px; }

    /* Header & List - revert padding */
    .header { 
      padding: 15px;
      border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; 
      background: var(--bg-panel); border-radius: 12px 12px 0 0;
    }
    .header h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--text-main); }
    
    .toolbar { padding: 10px; display: flex; flex-direction: column; gap: 8px; background: var(--bg-panel); border-bottom: 1px solid var(--border); }
    .toolbar-actions { display: flex; gap: 8px; }
    .btn { flex: 1; padding: 8px; border: none; border-radius: 4px; font-size: 13px; font-weight: 600; cursor: pointer; color: #fff; display: flex; align-items: center; justify-content: center; gap: 4px; }
    .btn-refresh { background: var(--primary); }
    .btn-delete { background: var(--danger); opacity: 0.5; pointer-events: none; }
    .btn-delete.active { opacity: 1; pointer-events: auto; }
    
    /* 搜索框 */
    .search-box { position: relative; display: flex; align-items: center; }
    .search-input { width: 100%; padding: 6px 30px 6px 8px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-main); font-size: 13px; }
    .search-input:focus { outline: none; border-color: var(--primary); }
    .search-clear { position: absolute; right: 6px; color: var(--text-sub); cursor: pointer; display: none; font-size: 16px; }
    .search-clear:hover { color: var(--text-main); }
    
    .list { flex: 1; overflow-y: auto; padding: 10px; scroll-behavior: smooth; position: relative; user-select: none; }
    
    .card { background: var(--bg-card); border: 1px solid var(--border); padding: 12px; margin-bottom: 8px; border-radius: 6px; position: relative; border-left: 4px solid transparent; transition: background 0.1s; }
    .card:hover { background: var(--bg-hover); border-color: var(--text-sub); }
    .card.current { border-left-color: var(--primary); background: var(--bg-hover); }
    .card.starred { border: 1px solid var(--star-active); }
    .card.dragging-select { background: var(--bg-hover); border-color: var(--primary); }
    
    .card-row { display: flex; gap: 10px; align-items: flex-start; padding-right: 20px; pointer-events: none; }
    .card-chk { margin-top: 4px; transform: scale(1.2); cursor: pointer; pointer-events: auto; }
    .card-text { font-size: 14px; color: var(--text-main); line-height: 1.5; font-weight: 500; cursor: pointer; word-break: break-all; pointer-events: auto; }
    .card-text .highlight { background-color: var(--highlight); color: var(--highlight-text); border-radius: 2px; padding: 0 2px; }
    
    .star-icon { position: absolute; top: 10px; right: 8px; cursor: pointer; color: var(--text-sub); font-size: 18px; pointer-events: auto; }
    .star-icon.active { color: var(--star-active); }
    .star-icon:hover { transform: scale(1.2); }
    
    .media-badge { display: inline-block; background: var(--badge-bg); color: var(--badge-text); font-size: 11px; font-weight: bold; padding: 2px 6px; border-radius: 4px; margin-left: 6px; border: 1px solid var(--border); }

    .to-bottom-btn { position: absolute; bottom: 15px; right: 15px; width: 36px; height: 36px; background: var(--primary); color: #fff; border-radius: 50%; border: none; cursor: pointer; box-shadow: 0 3px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 10; font-size: 18px; opacity: 0; pointer-events: none; transform: translateY(10px); transition: all 0.3s ease; }
    .to-bottom-btn.visible { opacity: 0.9; pointer-events: auto; transform: translateY(0); }
    .to-bottom-btn.visible:hover { opacity: 1; transform: scale(1.1); }
    
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--text-sub); }
  `;

  const container = document.createElement('div');
  container.className = 'panel-container';
  container.innerHTML = `
    <div class="side-close-area" title="点击关闭"><div class="close-icon">×</div></div>
    <div class="header"><h3>对话管理</h3></div>
    <div class="toolbar">
      <div class="search-box">
        <input type="text" class="search-input" placeholder="搜索 (空格分隔关键词)...">
        <span class="search-clear">×</span>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-refresh">🔄 刷新</button>
        <button class="btn btn-delete">🗑️ 删除选中</button>
      </div>
    </div>
    <div class="list" id="node-list"><div style="text-align:center; padding:40px; color:var(--text-sub); font-size:13px;">正在加载...</div></div>
    <button class="to-bottom-btn" title="直达底部">⬇</button>
  `;

  const floatBall = document.createElement('div');
  floatBall.className = 'float-ball';
  floatBall.title = "打开对话列表";
  floatBall.innerHTML = `<svg viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm0 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="currentColor"/></svg>`;

  shadow.appendChild(style);
  shadow.appendChild(floatBall);
  shadow.appendChild(container);

  // === 2. 物理引擎 ===
  let isDragging = false, startX, startY, initialLeft, initialTop, hasMoved = false;

  function onDown(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    isDragging = true; hasMoved = false; startX = clientX; startY = clientY;
    const rect = floatBall.getBoundingClientRect();
    initialLeft = rect.left; initialTop = rect.top;
    floatBall.classList.remove('snapping');
    floatBall.style.right = 'auto'; floatBall.style.bottom = 'auto';
    floatBall.style.left = initialLeft + 'px'; floatBall.style.top = initialTop + 'px';
    document.addEventListener(e.touches ? 'touchmove' : 'mousemove', onMove);
    document.addEventListener(e.touches ? 'touchend' : 'mouseup', onUp);
  }

  function onMove(e) {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - startX, dy = clientY - startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
    floatBall.style.left = (initialLeft + dx) + 'px'; floatBall.style.top = (initialTop + dy) + 'px';
    if (e.cancelable) e.preventDefault();
  }

  function onUp(e) {
    isDragging = false;
    document.removeEventListener(e.touches ? 'touchmove' : 'mousemove', onMove);
    document.removeEventListener(e.touches ? 'touchend' : 'mouseup', onUp);
    if (!hasMoved) { togglePanel(); return; }

    floatBall.classList.add('snapping');
    const winWidth = window.innerWidth, winHeight = window.innerHeight;
    const rect = floatBall.getBoundingClientRect();
    let targetLeft = rect.left, targetTop = rect.top;
    if (targetTop < 10) targetTop = 10;
    else if (targetTop > winHeight - rect.height - 10) targetTop = winHeight - rect.height - 10;
    const centerX = rect.left + rect.width / 2;
    if (centerX < winWidth / 2) targetLeft = 0; else targetLeft = winWidth - rect.width;
    floatBall.style.left = targetLeft + 'px'; floatBall.style.top = targetTop + 'px';
  }

  floatBall.addEventListener('mousedown', onDown);
  floatBall.addEventListener('touchstart', onDown, { passive: false });

  // === 3. 面板逻辑 (增强) ===
  let isOpen = false;
  let currentNodes = [];
  let autoSyncTimer = null;
  let isFirstLoad = true;

  // 状态变量
  let filterText = '';
  let lastCheckedIndex = -1; // 用于 Shift 多选
  let isAltDragging = false; // 用于 Alt 拖拽刷选

  const listEl = container.querySelector('#node-list');
  const headerEl = container.querySelector('.header h3');
  const btnRefresh = container.querySelector('.btn-refresh');
  const btnDelete = container.querySelector('.btn-delete');
  const sideClose = container.querySelector('.side-close-area');
  const btnToBottom = container.querySelector('.to-bottom-btn');
  const searchInput = container.querySelector('.search-input');
  const searchClear = container.querySelector('.search-clear');

  function togglePanel() {
    isOpen = !isOpen;
    if (isOpen) {
      container.classList.add('open');
      floatBall.style.opacity = '0'; floatBall.style.pointerEvents = 'none';
      manualScan(true);
      startAutoSync();
      // 聚焦搜索框
      setTimeout(() => searchInput.focus(), 300);
    } else {
      container.classList.remove('open');
      floatBall.style.opacity = '1'; floatBall.style.pointerEvents = 'auto';
      stopAutoSync();
    }
  }

  listEl.addEventListener('scroll', () => {
    const distanceToBottom = listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight;
    if (distanceToBottom > 100) btnToBottom.classList.add('visible');
    else btnToBottom.classList.remove('visible');
  });

  // --- 3.1 搜索与过滤逻辑 ---
  searchInput.oninput = (e) => {
    filterText = e.target.value.trim();
    searchClear.style.display = filterText ? 'block' : 'none';
    render(currentNodes, -1, false); // 重新渲染，不滚动
  };

  searchClear.onclick = () => {
    filterText = '';
    searchInput.value = '';
    searchClear.style.display = 'none';
    render(currentNodes, -1, false);
    searchInput.focus();
  };

  // 监听 ESC 键
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation(); // 防止冒泡到 global listener 导致直接关闭
      if (filterText) {
        // 如果有搜索词，先清空 (searchClear logic)
        searchClear.click();
      } else {
        // 如果为空，则关闭面板
        togglePanel();
      }
    }
  });

  // --- 3.2 拖拽刷选 (Alt + Drag) ---
  listEl.addEventListener('mousedown', (e) => {
    if (e.altKey || e.metaKey) {
      isAltDragging = true;
      e.preventDefault(); // 防止选中文本
    }
  });

  document.addEventListener('mouseup', () => { isAltDragging = false; });

  // Global shortcut
  document.addEventListener('keydown', (e) => {
    if (isOpen && e.key === 'Escape') {
      // 如果焦点不在搜索框（搜索框有自己的 handler），则关闭
      if (shadow.activeElement !== searchInput) {
        togglePanel();
      }
    }
  });

  // 辅助函数：根据节点内容匹配搜索词
  function matchFilter(text) {
    if (!filterText) return { matched: true, html: escape(text) };

    // 模糊匹配：空格分隔的关键词必须全部存在
    const keywords = filterText.toLowerCase().split(/\s+/).filter(k => k);
    const lowText = text.toLowerCase();

    const allMatch = keywords.every(k => lowText.includes(k));
    if (!allMatch) return { matched: false };

    // 高亮处理
    let html = escape(text);
    // 简单的替换逻辑 (需注意重叠问题，这里做基本处理)
    // 为了防止替换 HTML 标签，先 escape 再 replace
    keywords.forEach(k => {
      // 区分大小写的简单替换，实际可以用正则增强
      const regex = new RegExp(`(${escape(k)})`, 'gi');
      html = html.replace(regex, '<span class="highlight">$1</span>');
    });

    return { matched: true, html };
  }

  // --- 3.2 事件绑定 ---
  sideClose.onclick = togglePanel;
  chrome.runtime.onMessage.addListener((msg) => { if (msg.action === 'TOGGLE_PANEL') togglePanel(); });
  btnRefresh.onclick = () => manualScan(true);
  btnToBottom.onclick = () => { if (listEl.lastElementChild) listEl.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'end' }); };

  // === 4. 扫描器 (V33 文件名屏蔽版) ===
  function DOM_Scanner() {
    const timelineItems = Array.from(document.querySelectorAll('.prompt-scrollbar-item button, button.ms-button-icon'));
    const nodes = [];
    let activeNodeIndex = timelineItems.length - 1;
    const viewLine = window.innerHeight / 3;
    let minDistance = Infinity;

    const contentMap = {};
    function simpleHash(str) {
      let hash = 0; if (str.length === 0) return hash;
      for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash = hash & hash; }
      return Math.abs(hash);
    }

    for (let i = 0; i < timelineItems.length; i++) {
      const btn = timelineItems[i];
      const startId = btn.getAttribute('aria-controls');
      if (!startId) continue;

      const nextBtn = timelineItems[i + 1];
      const endId = nextBtn ? nextBtn.getAttribute('aria-controls') : null;

      let text = btn.getAttribute('aria-label') || "";
      let isDefaultText = true;

      // 文本提取逻辑 (保持原样)
      if (text.includes('Image') || text.match(/Prompt\s\d+/)) {
        text = "📷 [图片/文件]";
      } else {
        text = text.replace(/Prompt\s\d+\s-\s/, '');
        if (text.length > 0) isDefaultText = false;
      }

      const idsToDelete = [];
      let currentEl = document.getElementById(startId);

      let canReadText = true;
      let bestTextFound = false;

      while (currentEl && currentEl.id !== endId) {
        if (currentEl.tagName === 'MS-CHAT-TURN') {
          if (currentEl.id) idsToDelete.push(currentEl.id);

          const isModel =
            currentEl.querySelector('ms-thought-chunk') ||
            currentEl.querySelector('ms-response-chunk') ||
            currentEl.querySelector('ms-function-call-chunk') ||
            currentEl.querySelector('ms-code-block') ||
            currentEl.querySelector('.model-icon') ||
            currentEl.querySelector('.footer') ||
            currentEl.querySelector('mat-icon[data-mat-icon-name="sparkle"]');

          if (isModel) canReadText = false;

          if (canReadText) {
            const promptChunk = currentEl.querySelector('ms-prompt-chunk');
            if (promptChunk) {
              const fullText = promptChunk.innerText.replace(/\s+/g, ' ').trim();
              if (fullText) {
                const isTokenMetadata = fullText.match(/\d+\s?tokens/i);
                const isFilename = /^[^\s]+\.[a-zA-Z0-9]{2,5}$/.test(fullText) && fullText.length < 50;
                const isJunk = isTokenMetadata || isFilename;

                if (!isJunk) {
                  if (!bestTextFound || isDefaultText || text.startsWith("📷") || text.startsWith("📄")) {
                    text = fullText.substring(0, 150);
                    bestTextFound = true; isDefaultText = false;
                  } else if (bestTextFound) {
                    if (!text.includes(fullText.substring(0, 20))) text += " " + fullText.substring(0, 50);
                  }
                } else {
                  if (!bestTextFound && (text === "📷 [图片/文件]" || isDefaultText)) {
                    const fName = fullText.split(' ')[0];
                    text = `📄 ${fName}`;
                  }
                }
              }
            }
          }

          const rect = currentEl.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < window.innerHeight) {
            const distance = Math.abs(rect.top - viewLine);
            if (distance < minDistance) { minDistance = distance; activeNodeIndex = i; }
          }
        }
        currentEl = currentEl.nextElementSibling;
      }

      if (!text) text = "(空白消息)";
      const contentKey = text.substring(0, 50);
      if (!contentMap[contentKey]) contentMap[contentKey] = 0; contentMap[contentKey]++;
      const stableHash = "note_" + simpleHash(contentKey + "_" + contentMap[contentKey]);

      nodes.push({ id: i, targetId: startId, idsGroup: idsToDelete, text: text, hash: stableHash });
    }
    return { nodes, activeNodeIndex };
  }

  // === 5. 删除器 (保持不变) ===
  async function DOM_Deleter(targetIds) {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const nativeClick = (el) => HTMLElement.prototype.click.call(el);
    let count = 0;
    const sortedIds = targetIds.reverse();

    for (const id of sortedIds) {
      const turn = document.getElementById(id);
      if (!turn) continue;

      turn.scrollIntoView({ block: 'center' });
      turn.style.outline = "4px solid var(--danger)";

      turn.tabIndex = -1; turn.focus();
      turn.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await sleep(250);

      let menuBtn = turn.querySelector('.mat-mdc-menu-trigger');
      if (!menuBtn) {
        const wrapper = turn.querySelector('ms-prompt-options-menu, ms-response-options-menu');
        if (wrapper) {
          wrapper.style.visibility = 'visible'; wrapper.style.opacity = '1'; wrapper.style.display = 'block';
          menuBtn = wrapper.querySelector('button');
        }
      }
      if (!menuBtn) {
        const icons = turn.querySelectorAll('mat-icon, .material-symbols-outlined');
        for (const icon of icons) { if ((icon.innerText || "").includes('more_vert')) { menuBtn = icon.closest('button'); break; } }
      }

      if (menuBtn) {
        menuBtn.style.visibility = 'visible'; menuBtn.disabled = false;
        nativeClick(menuBtn);
        await sleep(600);

        const menuItems = document.querySelectorAll('.mat-mdc-menu-item');
        let deleteItem = null;
        for (const item of menuItems) {
          if (item.offsetParent === null) continue;
          const txt = (item.innerText || "").toLowerCase();
          const iconName = item.querySelector('mat-icon') ? item.querySelector('mat-icon').innerText : "";
          if (txt.includes('delete') || txt.includes('删除') || iconName.includes('delete')) { deleteItem = item; break; }
        }

        if (deleteItem) {
          nativeClick(deleteItem); count++; await sleep(600);
          const dialog = document.querySelector('mat-dialog-container');
          if (dialog) {
            let confirmBtn = dialog.querySelector('button.mat-primary');
            if (!confirmBtn) {
              const btns = dialog.querySelectorAll('button');
              for (const b of btns) { if (b.innerText.match(/Delete|Confirm|删除|确定/i)) { confirmBtn = b; break; } }
            }
            if (confirmBtn) { nativeClick(confirmBtn); await sleep(800); }
          }
        }
      }
      if (document.getElementById(id)) document.getElementById(id).style.outline = "none";
    }
    return count;
  }

  function DOM_Highlighter(targetId) {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.border = "3px solid var(--primary)";
      setTimeout(() => el.style.border = "none", 1500);
    }
  }

  // === 6. 控制逻辑 ===
  function startAutoSync() {
    if (isMonitoring) return;
    isMonitoring = true;
    manualScan(true);
    autoSyncTimer = setInterval(() => { if (!btnDelete.disabled && isOpen) manualScan(false); }, 2000);
  }

  function stopAutoSync() { isMonitoring = false; clearInterval(autoSyncTimer); }

  let isMonitoring = false; // Fix: 声明变量

  function manualScan(forceScroll) {
    const shouldScroll = forceScroll || isFirstLoad;

    if (forceScroll && listEl.children.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-sub);">⏳ 同步中...</div>';
    }

    const { nodes, activeNodeIndex } = DOM_Scanner();
    headerEl.innerText = `对话管理 (${nodes.length})`;

    const dataChanged = hasChanged(currentNodes, nodes);

    if (dataChanged || forceScroll || filterText) { // 如果有搜索词，也强制刷新
      currentNodes = nodes;
      render(nodes, activeNodeIndex, shouldScroll);
    } else {
      if (shouldScroll) scrollToBottom();
      else updateActiveHighlight(activeNodeIndex);
    }
    isFirstLoad = false;
  }

  function hasChanged(oldN, newN) {
    if (!oldN || !newN) return true;
    if (oldN.length !== newN.length) return true;
    if (oldN.length > 0 && oldN[oldN.length - 1].targetId !== newN[newN.length - 1].targetId) return true;
    return false;
  }

  function scrollToBottom() {
    setTimeout(() => { if (listEl.lastElementChild) listEl.lastElementChild.scrollIntoView({ behavior: 'auto', block: 'end' }); }, 100);
  }

  function render(nodes, activeIndex, shouldScroll) {
    listEl.innerHTML = '';

    // 1. 过滤
    const visibleNodes = nodes.filter(n => matchFilter(n.text).matched);

    if (visibleNodes.length === 0) {
      listEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-sub);">${filterText ? '无匹配结果' : '暂无对话'}</div>`;
      return;
    }

    visibleNodes.forEach((node, idx) => { // 注意：这里的 idx 是渲染列表的 index
      const card = document.createElement('div');
      card.className = 'card';
      // 使用原始 node.id (在 nodes 数组中的 index) 来作为 ID 标识，方便查找
      // 但渲染时 card 的 id 用渲染 index 防止重复? 不，应该用 node.id
      card.id = 'ais-card-' + node.id;

      const totalSegments = node.idsGroup.length;
      const mediaCount = Math.max(0, totalSegments - 3);
      const badge = mediaCount > 0 ? `<span class="media-badge">📎 ${mediaCount} 附件</span>` : '';
      const starKey = node.hash;
      const { html } = matchFilter(node.text); // 获取高亮 HTML

      chrome.storage.local.get([starKey], (r) => {
        const isStarred = r[starKey] === true;
        if (isStarred) card.classList.add('starred');

        card.innerHTML = `
          <div class="star-icon ${isStarred ? 'active' : ''}">★</div>
          <div class="card-row">
            <input type="checkbox" class="card-chk" data-ids-group='${JSON.stringify(node.idsGroup)}' data-target-id="${node.targetId}" data-index="${node.id}">
            <div class="card-text">${html} ${badge}</div>
          </div>
        `;

        // 事件绑定
        const chk = card.querySelector('.card-chk');

        // --- 点击文本跳转 ---
        card.querySelector('.card-text').onclick = () => {
          DOM_Highlighter(node.targetId);
          updateActiveHighlight(node.id); // 使用原始 ID 高亮
        };

        // --- 星标 ---
        card.querySelector('.star-icon').onclick = (e) => {
          e.stopPropagation();
          const newState = !card.classList.contains('starred');
          if (newState) { card.classList.add('starred'); e.target.classList.add('active'); }
          else { card.classList.remove('starred'); e.target.classList.remove('active'); }
          chrome.storage.local.set({ [starKey]: newState });
        };

        // --- Checkbox 逻辑 (Shift 多选) ---
        chk.onclick = (e) => {
          // 处理 Shift 连选 (只在手动点击时触发)
          if (e.shiftKey && lastCheckedIndex !== -1) {
            const start = Math.min(lastCheckedIndex, node.id);
            const end = Math.max(lastCheckedIndex, node.id);

            // 选中区间内的所有 visible nodes (还是 all nodes? 通常是 visible)
            // 考虑到用户可能在搜索状态下 Shift 选，应该只选 visible 的
            // 但这里简单起见，且为了数据一致性，我们遍历当前渲染列表

            const checkboxes = listEl.querySelectorAll('.card-chk');
            let inRange = false;
            checkboxes.forEach(box => {
              const boxIdx = parseInt(box.dataset.index);
              if (boxIdx === start || boxIdx === end) {
                inRange = !inRange; // 简单的 toggle 逻辑可能有一点 bug 如果 start==end
                box.checked = true; // 总是设为 checked
                if (start === end) inRange = false;
              } else if (boxIdx > start && boxIdx < end) {
                box.checked = true;
              }
            });
          }

          if (chk.checked) lastCheckedIndex = node.id;
          else lastCheckedIndex = -1; // 取消选中时重置？或者保留上一个？一般保留上一个
          updateBtn();
        };

        // --- Alt 刷选逻辑 ---
        card.onmouseenter = (e) => {
          if (isAltDragging) {
            chk.checked = !chk.checked; // 翻转状态
            chk.dispatchEvent(new Event('change')); // 触发 updateBtn
            updateBtn();
          }
        };

        listEl.appendChild(card);
      });
    });

    updateBtn();
    setTimeout(() => { if (shouldScroll) { scrollToBottom(); updateActiveHighlight(nodes.length - 1); } else { updateActiveHighlight(activeIndex); } }, 150);
  }

  function updateActiveHighlight(index) {
    shadow.querySelectorAll('.card.current').forEach(el => el.classList.remove('current'));
    if (index >= 0) {
      const target = shadow.getElementById('ais-card-' + index);
      if (target) target.classList.add('current');
    }
  }

  function updateBtn() {
    const n = shadow.querySelectorAll('.card-chk:checked').length;
    btnDelete.innerText = n ? `删除 (${n})` : '删除选中';
    if (n) btnDelete.classList.add('active'); else btnDelete.classList.remove('active');
  }

  btnDelete.onclick = async () => {
    const chks = shadow.querySelectorAll('.card-chk:checked');
    if (!chks.length) return;
    let allTargetIds = [];
    chks.forEach(c => {
      try { const group = JSON.parse(c.dataset.idsGroup); allTargetIds = allTargetIds.concat(group); }
      catch (e) { allTargetIds.push(c.dataset.targetId); }
    });
    allTargetIds = [...new Set(allTargetIds)];
    if (!confirm(`确定删除 ${chks.length} 组对话吗？`)) return;
    btnDelete.innerText = "⏳ 清理中..."; btnDelete.disabled = true;
    try {
      await DOM_Deleter(allTargetIds);
      setTimeout(() => { manualScan(false); btnDelete.disabled = false; btnDelete.innerText = "删除选中"; btnDelete.classList.remove('active'); }, 2000);
    } catch (e) { alert("删除出错: " + e.message); btnDelete.disabled = false; }
  };

  function escape(s) { return s ? s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) : ''; }

})();