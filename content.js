// content.js - V33 文件名过滤 & 完美显示版

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
    }
    .panel-container.open { transform: translateX(0); opacity: 1; }

    .header { padding: 15px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--bg-panel); border-radius: 12px 12px 0 0; }
    .header h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--text-main); }
    .close-btn { background: none; border: none; color: var(--text-sub); cursor: pointer; font-size: 20px; padding: 0 5px; }
    .close-btn:hover { color: var(--text-main); }
    
    .toolbar { padding: 10px; display: flex; gap: 8px; background: var(--bg-panel); border-bottom: 1px solid var(--border); }
    .btn { flex: 1; padding: 8px; border: none; border-radius: 4px; font-size: 13px; font-weight: 600; cursor: pointer; color: #fff; }
    .btn-refresh { background: var(--primary); }
    .btn-delete { background: var(--danger); opacity: 0.5; pointer-events: none; }
    .btn-delete.active { opacity: 1; pointer-events: auto; }

    .list { flex: 1; overflow-y: auto; padding: 10px; scroll-behavior: smooth; position: relative; }
    
    .card { background: var(--bg-card); border: 1px solid var(--border); padding: 12px; margin-bottom: 8px; border-radius: 6px; position: relative; border-left: 4px solid transparent; }
    .card:hover { background: var(--bg-hover); border-color: var(--text-sub); }
    .card.current { border-left-color: var(--primary); background: var(--bg-hover); }
    .card.starred { border: 1px solid var(--star-active); }
    
    .card-row { display: flex; gap: 10px; align-items: flex-start; padding-right: 20px; }
    .card-chk { margin-top: 4px; transform: scale(1.2); cursor: pointer; }
    .card-text { font-size: 14px; color: var(--text-main); line-height: 1.5; font-weight: 500; cursor: pointer; word-break: break-all; }
    
    .star-icon { position: absolute; top: 10px; right: 8px; cursor: pointer; color: var(--text-sub); font-size: 18px; }
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
    <div class="header"><h3>对话管理</h3><button class="close-btn">×</button></div>
    <div class="toolbar"><button class="btn btn-refresh">🔄 刷新</button><button class="btn btn-delete">🗑️ 删除选中</button></div>
    <div class="list" id="node-list"><div style="text-align:center; padding:40px; color:var(--text-sub); font-size:13px;">正在加载...</div></div>
    <button class="to-bottom-btn" title="直达底部">⬇</button>
  `;

  const floatBall = document.createElement('div');
  floatBall.className = 'float-ball';
  floatBall.title = "打开对话列表";
  floatBall.innerHTML = `<svg viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="currentColor"/></svg>`;

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

  // === 3. 面板逻辑 ===
  let isOpen = false;
  let currentNodes = [];
  let autoSyncTimer = null;
  let isFirstLoad = true;

  const listEl = container.querySelector('#node-list');
  const headerEl = container.querySelector('.header h3');
  const btnRefresh = container.querySelector('.btn-refresh');
  const btnDelete = container.querySelector('.btn-delete');
  const btnClose = container.querySelector('.close-btn');
  const btnToBottom = container.querySelector('.to-bottom-btn');

  function togglePanel() {
    isOpen = !isOpen;
    if (isOpen) {
      container.classList.add('open');
      floatBall.style.opacity = '0'; floatBall.style.pointerEvents = 'none';
      manualScan(true);
      startAutoSync();
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

  btnClose.onclick = togglePanel;
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

          // 严格模型过滤
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
                // 【核心修复】检测并屏蔽文件名
                // 1. "X_Spider_GUI.py 9,568 tokens" 这种元数据
                // 2. 纯文件名 "X_Spider_GUI.py" (短且带后缀)

                const isTokenMetadata = fullText.match(/\d+\s?tokens/i);

                // 检查是否像文件名 (无空格，有点，扩展名2-5位，长度<50)
                const isFilename = /^[^\s]+\.[a-zA-Z0-9]{2,5}$/.test(fullText) && fullText.length < 50;

                const isJunk = isTokenMetadata || isFilename;

                if (!isJunk) {
                  // 这是真正的用户对话
                  if (!bestTextFound || isDefaultText || text.startsWith("📷") || text.startsWith("📄")) {
                    text = fullText.substring(0, 150);
                    bestTextFound = true; isDefaultText = false;
                  } else if (bestTextFound) {
                    if (!text.includes(fullText.substring(0, 20))) text += " " + fullText.substring(0, 50);
                  }
                } else {
                  // 如果是 junk (文件名)，且当前啥文字都没找到，给个更友好的标记
                  if (!bestTextFound && (text === "📷 [图片/文件]" || isDefaultText)) {
                    // 提取文件名部分展示
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

  // === 5. 删除器 ===
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

  function manualScan(forceScroll) {
    const shouldScroll = forceScroll || isFirstLoad;

    if (forceScroll && listEl.children.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-sub);">⏳ 同步中...</div>';
    }

    const { nodes, activeNodeIndex } = DOM_Scanner();
    headerEl.innerText = `对话管理 (${nodes.length})`;

    const dataChanged = hasChanged(currentNodes, nodes);

    if (dataChanged || forceScroll) {
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
    if (!nodes || nodes.length === 0) { listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-sub);">暂无对话</div>'; return; }

    nodes.forEach((node, idx) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.id = 'ais-card-' + idx;

      const totalSegments = node.idsGroup.length;
      const mediaCount = Math.max(0, totalSegments - 3);
      const badge = mediaCount > 0 ? `<span class="media-badge">📎 ${mediaCount} 附件</span>` : '';
      const starKey = node.hash;

      chrome.storage.local.get([starKey], (r) => {
        const isStarred = r[starKey] === true;
        if (isStarred) card.classList.add('starred');

        card.innerHTML = `
          <div class="star-icon ${isStarred ? 'active' : ''}">★</div>
          <div class="card-row">
            <input type="checkbox" class="card-chk" data-ids-group='${JSON.stringify(node.idsGroup)}' data-target-id="${node.targetId}">
            <div class="card-text">${escape(node.text)} ${badge}</div>
          </div>
        `;

        card.querySelector('.card-text').onclick = () => {
          DOM_Highlighter(node.targetId);
          updateActiveHighlight(idx);
        };
        card.querySelector('.star-icon').onclick = (e) => {
          e.stopPropagation();
          const newState = !card.classList.contains('starred');
          if (newState) { card.classList.add('starred'); e.target.classList.add('active'); }
          else { card.classList.remove('starred'); e.target.classList.remove('active'); }
          chrome.storage.local.set({ [starKey]: newState });
        };
        card.querySelector('.card-chk').onchange = updateBtn;
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