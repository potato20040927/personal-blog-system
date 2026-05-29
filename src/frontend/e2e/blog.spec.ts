import { expect, test, type Page } from '@playwright/test';

async function registerAndLogin(page: Page, username: string) {
  await page.goto('/register');

  await page.getByPlaceholder('Username').fill(username);
  await page.getByPlaceholder('Password').fill('password123');
  await page.locator('form').getByRole('button', { name: '註冊' }).click();

  await expect(page).toHaveURL(/\/login$/);

  await page.getByPlaceholder('Username').fill(username);
  await page.getByPlaceholder('Password').fill('password123');
  await page.locator('form').getByRole('button', { name: '登入' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: new RegExp(`登出 \\(${username}\\)`) })).toBeVisible();
}

async function openSeedPost(page: Page) {
  await page.goto('/');
  await expect(page.getByText('E2E 測試文章')).toBeVisible();
  await page.getByText('E2E 測試文章').first().click();
  await expect(page).toHaveURL(/\/post\/1$/);
}

test('visitor can browse from home page to a post detail page', async ({ page }) => {
  await openSeedPost(page);

  await expect(page.getByRole('heading', { name: 'E2E 測試文章' })).toBeVisible();
  await expect(page.getByText('這是一篇給端對端測試使用的文章內容。')).toBeVisible();
  await expect(page.getByRole('heading', { name: '留言' })).toBeVisible();
  await expect(page.getByText('登入後即可留言。')).toBeVisible();
});

test('registered user can log in and add a comment on a post', async ({ page }) => {
  await registerAndLogin(page, 'e2e_commenter');

  await openSeedPost(page);
  await page.getByPlaceholder('留下你的想法...').fill('這是一則 E2E 留言');
  await page.getByRole('button', { name: '送出留言' }).click();

  await expect(page.getByText('這是一則 E2E 留言')).toBeVisible();
  await expect(page.getByText('e2e_commenter')).toBeVisible();
});

test('visitor is redirected to login when trying to like a post', async ({ page }) => {
  await openSeedPost(page);

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('請先登入才能按讚');
    await dialog.accept();
  });

  await page.getByTestId('like-button').click();

  await expect(page).toHaveURL(/\/login$/);
});

test('logged-in user can like a post and keep the count after refresh', async ({ page }) => {
  await registerAndLogin(page, 'e2e_liker');
  await openSeedPost(page);

  const likeButton = page.getByTestId('like-button');
  await expect(likeButton).toContainText('0');

  await likeButton.click();
  await expect(likeButton).toContainText('1');

  await page.reload();
  await expect(page.getByTestId('like-button')).toContainText('1');
});

test('logged-in user can create a nested reply and expand the thread', async ({ page }) => {
  await registerAndLogin(page, 'e2e_replier');
  await openSeedPost(page);

  await page.getByPlaceholder('留下你的想法...').fill('E2E 巢狀根留言');
  await page.getByRole('button', { name: '送出留言' }).click();

  const rootComment = page.locator('li.comment-item').filter({ hasText: 'E2E 巢狀根留言' });
  await expect(rootComment).toBeVisible();

  await rootComment.getByRole('button', { name: '回覆' }).click();
  await rootComment.locator('textarea').fill('E2E 巢狀回覆');
  await rootComment.getByRole('button', { name: '送出回覆' }).click();

  await expect(page.getByText('E2E 巢狀回覆')).toBeVisible();
  await expect(page.getByText(/B\d+-1/)).toBeVisible();

  await rootComment.getByRole('button', { name: '收合回覆' }).click();
  await expect(page.getByText('E2E 巢狀回覆')).not.toBeVisible();
  await rootComment.getByRole('button', { name: '查看其他1則留言' }).click();
  await expect(page.getByText('E2E 巢狀回覆')).toBeVisible();
});

test('comment author can edit and delete their own comment', async ({ page }) => {
  await registerAndLogin(page, 'e2e_editor');
  await openSeedPost(page);

  await page.getByPlaceholder('留下你的想法...').fill('E2E 待編輯留言');
  await page.getByRole('button', { name: '送出留言' }).click();

  const comment = page.locator('li.comment-item').filter({ hasText: 'E2E 待編輯留言' });
  await expect(comment).toBeVisible();

  await comment.getByRole('button', { name: '編輯' }).click();
  await comment.locator('textarea').fill('E2E 已編輯留言');
  await page.locator('form.comment-edit-form').getByRole('button', { name: '儲存' }).click();

  const editedComment = page.locator('li.comment-item').filter({ hasText: 'E2E 已編輯留言' });
  await expect(editedComment).toBeVisible();
  await expect(editedComment.getByText('已編輯')).toBeVisible();

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('確定要刪除這則留言嗎？');
    await dialog.accept();
  });

  await editedComment.getByRole('button', { name: '刪除' }).click();

  await expect(page.getByText('E2E 已編輯留言')).not.toBeVisible();
});
