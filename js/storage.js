/**
 * ストレージ管理モジュール
 * ブロック済みショップの保存・取得・削除を管理
 */

const BoothShopStorage = {
  STORAGE_KEY: 'blockedShops',

  /**
   * 全てのブロック済みショップを取得
   * @returns {Promise<Object>} ブロック済みショップのオブジェクト
   */
  async getAllBlocked() {
    try {
      const result = await browser.storage.local.get(this.STORAGE_KEY);
      return result[this.STORAGE_KEY] || {};
    } catch (error) {
      console.error('Failed to get blocked shops:', error);
      return {};
    }
  },

  /**
   * 特定のショップがブロックされているか確認
   * @param {string} shopId - ショップID（サブドメイン）
   * @returns {Promise<boolean>}
   */
  async isBlocked(shopId) {
    const blocked = await this.getAllBlocked();
    return shopId in blocked;
  },

  /**
   * ショップをブロックリストに追加
   * @param {string} shopId - ショップID（サブドメイン）
   * @param {string} shopName - ショップ名
   * @param {string} reason - ブロック理由
   * @returns {Promise<boolean>} 成功したかどうか
   */
  async blockShop(shopId, shopName, reason = '') {
    try {
      const blocked = await this.getAllBlocked();
      blocked[shopId] = {
        name: shopName,
        reason: reason,
        timestamp: Date.now()
      };
      await browser.storage.local.set({ [this.STORAGE_KEY]: blocked });
      return true;
    } catch (error) {
      console.error('Failed to block shop:', error);
      return false;
    }
  },

  /**
   * ショップをブロックリストから削除
   * @param {string} shopId - ショップID（サブドメイン）
   * @returns {Promise<boolean>} 成功したかどうか
   */
  async unblockShop(shopId) {
    try {
      const blocked = await this.getAllBlocked();
      delete blocked[shopId];
      await browser.storage.local.set({ [this.STORAGE_KEY]: blocked });
      return true;
    } catch (error) {
      console.error('Failed to unblock shop:', error);
      return false;
    }
  },

  /**
   * ショップ情報を取得
   * @param {string} shopId - ショップID
   * @returns {Promise<Object|null>} ショップ情報
   */
  async getShopInfo(shopId) {
    const blocked = await this.getAllBlocked();
    return blocked[shopId] || null;
  },

  /**
   * ブロック理由を更新
   * @param {string} shopId - ショップID
   * @param {string} reason - 新しいブロック理由
   * @returns {Promise<boolean>} 成功したかどうか
   */
  async updateReason(shopId, reason) {
    try {
      const blocked = await this.getAllBlocked();
      if (blocked[shopId]) {
        blocked[shopId].reason = reason;
        await browser.storage.local.set({ [this.STORAGE_KEY]: blocked });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update reason:', error);
      return false;
    }
  }
};

// グローバルに公開（他のスクリプトから使用可能にする）
if (typeof window !== 'undefined') {
  window.BoothShopStorage = BoothShopStorage;
}
