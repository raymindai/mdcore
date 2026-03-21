// Context menu: right-click → Save to mdfy.cc
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-to-mdfy",
    title: "Save to mdfy.cc",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "save-to-mdfy" && info.selectionText) {
    const encoded = encodeURIComponent(info.selectionText);
    chrome.tabs.create({
      url: `https://mdfy.cc/?paste=${encoded}`,
    });
  }
});
