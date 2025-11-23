/**
 * コンテンツスクリプト - 商品一覧ページでブロック済みショップの商品を非表示
 */

(function() {
  'use strict';

  /**
   * URLからショップIDを抽出
   * @param {string} url - ショップページのURL
   * @returns {string|null} ショップID（サブドメイン）
   */
  function extractShopId(url) {
    if (!url) return null;
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // サブドメイン形式: shopname.booth.pm
      const match = hostname.match(/^([^.]+)\.booth\.pm$/);
      if (match && match[1] !== 'accounts' && match[1] !== 'www') {
        return match[1];
      }
    } catch (error) {
      console.error('Failed to parse URL:', error);
    }
    
    return null;
  }

  /**
   * 商品カードからショップIDを取得
   * @param {HTMLElement} itemCard - 商品カード要素
   * @returns {string|null} ショップID
   */
  function getShopIdFromItemCard(itemCard) {
    // ショップ名のアンカータグを探す
    const shopLink = itemCard.querySelector('.item-card__shop-name-anchor');
    if (!shopLink) return null;
    
    const href = shopLink.getAttribute('href');
    return extractShopId(href);
  }

  /**
   * 商品カードを非表示にする
   * @param {HTMLElement} itemCard - 商品カード要素
   */
  function hideItemCard(itemCard) {
    itemCard.style.display = 'none';
    itemCard.setAttribute('data-blocked-shop', 'true');
  }

  /**
   * 商品カードの表示を復元
   * @param {HTMLElement} itemCard - 商品カード要素
   */
  function showItemCard(itemCard) {
    itemCard.style.display = '';
    itemCard.removeAttribute('data-blocked-shop');
  }

  /**
   * 単一の商品カードを処理
   * @param {HTMLElement} itemCard - 商品カード要素
   * @param {Object} blockedShops - ブロック済みショップのオブジェクト
   */
  async function processItemCard(itemCard, blockedShops) {
    // 既に処理済みの場合はスキップ
    if (itemCard.hasAttribute('data-shop-blocker-processed')) {
      return;
    }
    
    itemCard.setAttribute('data-shop-blocker-processed', 'true');
    
    const shopId = getShopIdFromItemCard(itemCard);
    if (!shopId) return;
    
    // ショップIDをデータ属性として保存
    itemCard.setAttribute('data-shop-id', shopId);
    
    // ブロック済みの場合は非表示
    if (blockedShops && shopId in blockedShops) {
      hideItemCard(itemCard);
    }
  }

  /**
   * ページ内の全商品カードを処理
   */
  async function processAllItemCards() {
    const blockedShops = await BoothShopStorage.getAllBlocked();
    const itemCards = document.querySelectorAll('.item-card');
    
    itemCards.forEach(itemCard => {
      processItemCard(itemCard, blockedShops);
    });
  }

  /**
   * MutationObserverで動的に追加される商品を監視
   */
  function observeNewItems() {
    const blockedShopsPromise = BoothShopStorage.getAllBlocked();
    
    const observer = new MutationObserver(async (mutations) => {
      const blockedShops = await blockedShopsPromise;
      
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // 追加されたノード自体が商品カードの場合
            if (node.classList && node.classList.contains('item-card')) {
              processItemCard(node, blockedShops);
            }
            
            // 追加されたノードの子孫に商品カードがある場合
            const itemCards = node.querySelectorAll && node.querySelectorAll('.item-card');
            if (itemCards) {
              itemCards.forEach(itemCard => {
                processItemCard(itemCard, blockedShops);
              });
            }
          }
        });
      }
    });
    
    // body全体を監視
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return observer;
  }

  /**
   * ストレージ変更を監視してリアルタイム更新
   */
  function observeStorageChanges() {
    browser.storage.onChanged.addListener(async (changes, areaName) => {
      if (areaName !== 'local' || !changes.blockedShops) {
        return;
      }
      
      const newBlockedShops = changes.blockedShops.newValue || {};
      const itemCards = document.querySelectorAll('.item-card[data-shop-id]');
      
      itemCards.forEach(itemCard => {
        const shopId = itemCard.getAttribute('data-shop-id');
        if (!shopId) return;
        
        if (shopId in newBlockedShops) {
          hideItemCard(itemCard);
        } else {
          showItemCard(itemCard);
        }
      });
    });
  }

  /**
   * 初期化処理
   */
  async function init() {
    // 現在のページが商品一覧ページかどうか確認
    const isItemListPage = 
      window.location.hostname === 'booth.pm' || 
      /\.booth\.pm$/.test(window.location.hostname);
    
    if (!isItemListPage) {
      return;
    }
    
    // 既存の商品カードを処理
    await processAllItemCards();
    
    // 動的に追加される商品を監視
    observeNewItems();
    
    // ストレージ変更を監視
    observeStorageChanges();
  }

  // DOM読み込み完了後に初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
