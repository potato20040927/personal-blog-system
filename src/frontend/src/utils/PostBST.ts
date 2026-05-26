type Node<T> = {
  item: T;
  key: number;
  height: number;
  left: Node<T> | null;
  right: Node<T> | null;
};

export class PostBST<T = unknown> {
  private root: Node<T> | null = null;
  private getKey: (item: T) => number;

  constructor(getKey: (item: T) => number) {
    this.getKey = getKey;
  }

  private getHeight(node: Node<T> | null): number {
    return node ? node.height : 0;
  }

  private getBalance(node: Node<T> | null): number {
    return node ? this.getHeight(node.left) - this.getHeight(node.right) : 0;
  }

  private updateHeight(node: Node<T>) {
    node.height = Math.max(this.getHeight(node.left), this.getHeight(node.right)) + 1;
  }

  // 右旋 (LL Case)
  private rotateRight(y: Node<T>): Node<T> {
    const x = y.left!;
    const T2 = x.right;
    x.right = y;
    y.left = T2;
    this.updateHeight(y);
    this.updateHeight(x);
    return x;
  }

  // 左旋 (RR Case)
  private rotateLeft(x: Node<T>): Node<T> {
    const y = x.right!;
    const T2 = y.left;
    y.left = x;
    x.right = T2;
    this.updateHeight(x);
    this.updateHeight(y);
    return y;
  }

  // INSERT (O log n)
  insert(item: T) {
    this.root = this._insert(this.root, item);
  }

  private _insert(node: Node<T> | null, item: T): Node<T> {
    if (!node) {
      return { item, key: this.getKey(item), height: 1, left: null, right: null };
    }

    const key = this.getKey(item);
    if (key < node.key) {
      node.left = this._insert(node.left, item);
    } else {
      node.right = this._insert(node.right, item);
    }

    // 1. 更新高度
    this.updateHeight(node);

    // 2. 獲取平衡因子並檢查是否失衡
    const balance = this.getBalance(node);

    // LL Case
    if (balance > 1 && key < (node.left?.key || 0)) {
      return this.rotateRight(node);
    }
    // RR Case
    if (balance < -1 && key >= (node.right?.key || 0)) {
      return this.rotateLeft(node);
    }
    // LR Case
    if (balance > 1 && key >= (node.left?.key || 0)) {
      node.left = this.rotateLeft(node.left!);
      return this.rotateRight(node);
    }
    // RL Case
    if (balance < -1 && key < (node.right?.key || 0)) {
      node.right = this.rotateRight(node.right!);
      return this.rotateLeft(node);
    }

    return node;
  }

  // DELETE (O log n)
  delete(item: T) {
    const key = this.getKey(item);
    this.root = this._delete(this.root, key);
  }

  private _delete(node: Node<T> | null, key: number): Node<T> | null {
    if (!node) return null;

    if (key < node.key) {
      node.left = this._delete(node.left, key);
    } else if (key > node.key) {
      node.right = this._delete(node.right, key);
    } else {
      // found node

      if (!node.left || !node.right) {
        node = node.left || node.right;
      } else {
        const temp = this._getMin(node.right);
        node.item = temp.item;
        node.key = temp.key;
        node.right = this._delete(node.right, temp.key);
      }
    }

    if (!node) return null;

    // AVL rebalance
    this.updateHeight(node);

    const balance = this.getBalance(node);

    if (balance > 1 && this.getBalance(node.left) >= 0)
      return this.rotateRight(node);

    if (balance > 1 && this.getBalance(node.left) < 0) {
      node.left = this.rotateLeft(node.left!);
      return this.rotateRight(node);
    }

    if (balance < -1 && this.getBalance(node.right) <= 0)
      return this.rotateLeft(node);

    if (balance < -1 && this.getBalance(node.right) > 0) {
      node.right = this.rotateRight(node.right!);
      return this.rotateLeft(node);
    }

    return node;
  }

  private _getMin(node: Node<T>): Node<T> {
    let curr = node;
    while (curr.left) curr = curr.left;
    return curr;
  }

  inorder(): T[] {
    const res: T[] = [];
    this._inorder(this.root, res);
    return res;
  }

  private _inorder(node: Node<T> | null, res: T[]) {
    if (!node) return;
    this._inorder(node.left, res);
    res.push(node.item);
    this._inorder(node.right, res);
  }

  reverse(): T[] {
    const res: T[] = [];
    this._reverseInorder(this.root, res);
    return res;
  }

  private _reverseInorder(node: Node<T> | null, res: T[]) {
    if (!node) return;
    this._reverseInorder(node.right, res);
    res.push(node.item);
    this._reverseInorder(node.left, res);
  }

  clear() {
    this.root = null;
  }
}