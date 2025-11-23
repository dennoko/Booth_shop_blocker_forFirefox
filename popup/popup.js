/**
 * ポップアップUI - ブロック済みショップの一覧表示と管理
 */

(async function() {
  'use strict';

  const shopListElement = document.getElementById('shopList');
  const emptyStateElement = document.getElementById('emptyState');
  const blockedCountElement = document.getElementById('blockedCount');

  /**
   * 日時をフォーマット
   */
  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  }

  /**
   * HTMLエスケープ
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * ショップカードのHTML作成
   */
  function createShopCard(shopId, shopData) {
    const card = document.createElement('div');
    card.className = 'shop-card';
    card.setAttribute('data-shop-id', shopId);
    
    const shopUrl = `https://${shopId}.booth.pm/`;
    const displayName = shopData.name || shopId;
    const reason = shopData.reason || '（理由なし）';
    const dateStr = formatDate(shopData.timestamp);
    
    card.innerHTML = `
      <div class="shop-card-header">
        <div class="shop-info">
          <a href="${escapeHtml(shopUrl)}" target="_blank" class="shop-name" title="${escapeHtml(displayName)}">
            ${escapeHtml(displayName)}
          </a>
          <div class="shop-id">@${escapeHtml(shopId)}</div>
        </div>
        <button class="unblock-btn" data-shop-id="${escapeHtml(shopId)}" title="ブロック解除">
          🔓
        </button>
      </div>
      <div class="shop-card-body">
        <div class="reason-label">ブロック理由:</div>
        <div class="reason-text">${escapeHtml(reason)}</div>
      </div>
      <div class="shop-card-footer">
        <div class="blocked-date">ブロック日時: ${dateStr}</div>
      </div>
    `;
    
    return card;
  }

  /**
   * ブロック解除処理
   */
  async function handleUnblock(shopId, shopName) {
    if (!confirm(`"${shopName}" のブロックを解除しますか？`)) {
      return;
    }
    
    try {
      // ストレージから削除
      const result = await browser.storage.local.get('blockedShops');
      const blockedShops = result.blockedShops || {};
      
      delete blockedShops[shopId];
      
      await browser.storage.local.set({ blockedShops });
      
      // UIから削除
      const card = document.querySelector(`.shop-card[data-shop-id="${shopId}"]`);
      if (card) {
        card.style.opacity = '0';
        card.style.transform = 'translateX(-20px)';
        setTimeout(() => {
          card.remove();
          updateUI();
        }, 200);
      }
    } catch (error) {
      console.error('Failed to unblock shop:', error);
      alert('ブロック解除に失敗しました');
    }
  }

  /**
   * UI更新
   */
  function updateUI() {
    const cards = shopListElement.querySelectorAll('.shop-card');
    const count = cards.length;
    
    blockedCountElement.textContent = count;
    
    if (count === 0) {
      shopListElement.style.display = 'none';
      emptyStateElement.style.display = 'block';
    } else {
      shopListElement.style.display = 'block';
      emptyStateElement.style.display = 'none';
    }
  }

  /**
   * ショップリストを表示
   */
  async function displayShopList() {
    try {
      const result = await browser.storage.local.get('blockedShops');
      const blockedShops = result.blockedShops || {};
      
      // リストをクリア
      shopListElement.innerHTML = '';
      
      // ショップをタイムスタンプ順（新しい順）にソート
      const sortedShops = Object.entries(blockedShops)
        .sort((a, b) => b[1].timestamp - a[1].timestamp);
      
      // カードを作成
      sortedShops.forEach(([shopId, shopData]) => {
        const card = createShopCard(shopId, shopData);
        shopListElement.appendChild(card);
      });
      
      // ブロック解除ボタンにイベントリスナーを追加
      const unblockButtons = shopListElement.querySelectorAll('.unblock-btn');
      unblockButtons.forEach(button => {
        button.addEventListener('click', async () => {
          const shopId = button.getAttribute('data-shop-id');
          const shopName = blockedShops[shopId]?.name || shopId;
          await handleUnblock(shopId, shopName);
        });
      });
      
      updateUI();
    } catch (error) {
      console.error('Failed to load blocked shops:', error);
      shopListElement.innerHTML = '<div class="error">データの読み込みに失敗しました</div>';
    }
  }

  /**
   * ストレージ変更を監視
   */
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.blockedShops) {
      displayShopList();
    }
  });

  // 初期化
  await displayShopList();
})();
