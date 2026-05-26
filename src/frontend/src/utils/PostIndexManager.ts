import { PostBST } from './PostBST';

/**
 * PostIndexManager
 * 負責管理多個 BST 索引，支持高效的增量更新 (O(log n))。
 */
export class PostIndexManager<T> {
  private createdBST: PostBST<T>;
  private updatedBST: PostBST<T>;

  constructor(
    getCreatedKey: (item: T) => number,
    getUpdatedKey: (item: T) => number
  ) {
    this.createdBST = new PostBST(getCreatedKey);
    this.updatedBST = new PostBST(getUpdatedKey);
  }

  // INSERT (O log n)
  // 直接向兩棵樹插入新節點
  insert(item: T) {
    this.createdBST.insert(item);
    this.updatedBST.insert(item);
  }

  // DELETE (O log n)
  // 透過 PostBST 內部實作的節點刪除邏輯，直接從樹中移除
  delete(target: T) {
    this.createdBST.delete(target);
    this.updatedBST.delete(target);
  }

  // UPDATE (O log n)
  // 先刪除舊節點，再插入新節點。
  update(oldItem: T, newItem: T) {
    // 1. 從索引中移除舊資料
    this.delete(oldItem);
    // 2. 插入新資料
    this.insert(newItem);
  }

  // READ (O n)
  // 遍歷樹以獲取排序後的結果
  getCreatedDesc() {
    return this.createdBST.reverse();
  }

  getCreatedAsc() {
    return this.createdBST.inorder();
  }

  getUpdatedDesc() {
    return this.updatedBST.reverse();
  }

  getUpdatedAsc() {
    return this.updatedBST.inorder();
  }

  // REBUILD (O n log n)
  // 僅在初始化或資料流發生不可預期的大幅變動時使用
  rebuild(items: T[]) {
    this.createdBST.clear();
    this.updatedBST.clear();

    items.forEach(item => this.insert(item));
  }
}