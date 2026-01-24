// background.js - Manifest V3 修正版

// 这是一个 Service Worker，它的生命周期和普通页面不同
// 必须确保在 Service Worker 正确启动后，再进行 API 注册

// 1. 当插件被安装或更新时触发
chrome.runtime.onInstalled.addListener(() => {
    console.log("AI Studio Manager: Plugin installed/updated.");
    // 在这里注册一次 onCliked 事件监听器
    registerActionHandler();
});

// 2. 当浏览器启动时触发 (如果 Service Worker 被卸载了，也会重新启动)
chrome.runtime.onStartup.addListener(() => {
    console.log("AI Studio Manager: Browser started.");
    registerActionHandler();
});

// 3. 注册点击事件监听器的函数
function registerActionHandler() {
    // 确保 chrome.sidePanel 和 chrome.action 都可用
    if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
        chrome.sidePanel
            .setPanelBehavior({ openPanelOnActionClick: true })
            .catch((error) => console.error("AI Studio Manager: 侧边栏配置失败:", error));
    } else {
        console.warn("AI Studio Manager: chrome.sidePanel API not available. Ensure browser supports Manifest V3 Side Panels.");
    }

    // 注册点击图标事件
    if (chrome.action && chrome.action.onClicked) {
        chrome.action.onClicked.addListener((tab) => {
            // 确保只在 AI Studio 页面上操作
            if (tab.url && tab.url.includes("aistudio.google.com")) {
                // 发送消息给 content.js 来切换面板
                chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_PANEL" })
                    .catch(error => {
                        console.error("AI Studio Manager: Failed to send message to content script:", error);
                        // 错误原因可能是 content script 还没有注入，或者被卸载了
                        // 此时可以尝试重新加载页面，或者提示用户
                    });
            }
        });
    } else {
        console.warn("AI Studio Manager: chrome.action.onClicked API not available.");
    }
}

// 再次强调：Manifest V3 的 Service Worker 在空闲时会被浏览器终止。
// 因此，监听器需要注册在顶层（onInstalled, onStartup），或者在收到事件时动态注册。
// 上面的写法是在顶层注册，这样是最标准的做法。