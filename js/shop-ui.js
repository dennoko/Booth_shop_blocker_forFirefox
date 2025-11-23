/**
 * ショップページUI - ブロック/解除ボタンの追加と管理
 */

(function() {
  'use strict';

  let currentShopId = null;
  let currentShopName = null;

  /**
   * 現在のページからショップ情報を取得
   */
  function getCurrentShopInfo() {
    const hostname = window.location.hostname;
    const match = hostname.match(/^([^.]+)\.booth\.pm$/);
    
    if (match && match[1] !== 'accounts' && match[1] !== 'www') {
      currentShopId = match[1];
      
      // ショップ名を取得
      const shopNameElement = document.querySelector('.shop-name-label, .home-link-container__nickname');
      if (shopNameElement) {
        currentShopName = shopNameElement.textContent.trim();
      } else {
        currentShopName = currentShopId;
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * ブロックボタンのHTML作成
   */
  function createBlockButton(isBlocked) {
    const button = document.createElement('button');
    button.className = 'booth-shop-blocker-btn';
    button.setAttribute('data-blocked', isBlocked ? 'true' : 'false');
    
    if (isBlocked) {
      button.textContent = '🔓 ブロック解除';
      button.style.backgroundColor = '#666';
    } else {
      button.textContent = '🚫 このショップをブロック';
      button.style.backgroundColor = '#e74a31';
    }
    
    return button;
  }

  /**
   * メモ表示エリアの作成
   */
  function createMemoDisplay(reason) {
    if (!reason) return null;
    
    const memoDiv = document.createElement('div');
    memoDiv.className = 'booth-shop-blocker-memo';
    memoDiv.innerHTML = `
      <div class="memo-label">ブロック理由:</div>
      <div class="memo-content">${escapeHtml(reason)}</div>
    `;
    
    return memoDiv;
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
   * ブロック処理
   */
  async function handleBlock() {
    const reason = prompt('このショップをブロックする理由を入力してください（任意）:', '');
    
    // キャンセルされた場合は何もしない
    if (reason === null) {
      return;
    }
    
    const success = await BoothShopStorage.blockShop(currentShopId, currentShopName, reason);
    
    if (success) {
      alert('ショップをブロックしました');
      updateUI(true, reason);
    } else {
      alert('ブロックに失敗しました');
    }
  }

  /**
   * ブロック解除処理
   */
  async function handleUnblock() {
    if (!confirm(`"${currentShopName}" のブロックを解除しますか？`)) {
      return;
    }
    
    const success = await BoothShopStorage.unblockShop(currentShopId);
    
    if (success) {
      alert('ブロックを解除しました');
      updateUI(false, '');
    } else {
      alert('ブロック解除に失敗しました');
    }
  }

  /**
   * UIの更新
   */
  function updateUI(isBlocked, reason = '') {
    const container = document.querySelector('.booth-shop-blocker-container');
    if (!container) return;
    
    // 既存のボタンとメモを削除
    const oldButton = container.querySelector('.booth-shop-blocker-btn');
    const oldMemo = container.querySelector('.booth-shop-blocker-memo');
    if (oldButton) oldButton.remove();
    if (oldMemo) oldMemo.remove();
    
    // 新しいボタンを作成
    const button = createBlockButton(isBlocked);
    button.addEventListener('click', isBlocked ? handleUnblock : handleBlock);
    container.appendChild(button);
    
    // メモを表示
    if (isBlocked && reason) {
      const memoDiv = createMemoDisplay(reason);
      if (memoDiv) {
        container.appendChild(memoDiv);
      }
    }
  }

  /**
   * UIコンテナをページに追加
   */
  async function injectUI() {
    // ショップページかどうか確認
    if (!getCurrentShopInfo()) {
      return;
    }
    
    // 既に追加済みの場合はスキップ
    if (document.querySelector('.booth-shop-blocker-container')) {
      return;
    }
    
    // 挿入位置を探す（グローバルナビの右側）
    const targetElement = document.querySelector('.shop-global-nav__follow-button, .shop-global-nav');
    if (!targetElement) {
      console.warn('Could not find insertion point for shop blocker UI');
      return;
    }
    
    // コンテナを作成
    const container = document.createElement('div');
    container.className = 'booth-shop-blocker-container';
    
    // 現在のブロック状態を確認
    const shopInfo = await BoothShopStorage.getShopInfo(currentShopId);
    const isBlocked = shopInfo !== null;
    const reason = shopInfo ? shopInfo.reason : '';
    
    // ボタンを作成
    const button = createBlockButton(isBlocked);
    button.addEventListener('click', isBlocked ? handleUnblock : handleBlock);
    container.appendChild(button);
    
    // ブロック済みの場合はメモも表示
    if (isBlocked && reason) {
      const memoDiv = createMemoDisplay(reason);
      if (memoDiv) {
        container.appendChild(memoDiv);
      }
    }
    
    // DOMに追加
    if (targetElement.classList.contains('shop-global-nav__follow-button')) {
      targetElement.parentNode.insertBefore(container, targetElement);
    } else {
      targetElement.appendChild(container);
    }
  }

  /**
   * ストレージ変更を監視
   */
  function observeStorageChanges() {
    browser.storage.onChanged.addListener(async (changes, areaName) => {
      if (areaName !== 'local' || !changes.blockedShops || !currentShopId) {
        return;
      }
      
      const newBlockedShops = changes.blockedShops.newValue || {};
      const isBlocked = currentShopId in newBlockedShops;
      const reason = isBlocked ? newBlockedShops[currentShopId].reason : '';
      
      updateUI(isBlocked, reason);
    });
  }

  /**
   * 初期化
   */
  async function init() {
    await injectUI();
    observeStorageChanges();
  }

  // DOM読み込み完了後に初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
