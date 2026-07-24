# Supabase 数据库安装

1. 打开 Supabase 项目。
2. 进入 `SQL Editor`，新建查询。
3. 完整复制 `setup.sql` 的内容并执行。
4. 确认结果显示 `Success. No rows returned`。

`setup.sql` 会创建论文项目、共享成员、RLS 策略和受控 RPC 函数。
每个论文项目最多 6 人（含所有者），角色分为：

- `owner`：管理成员、编辑论文；
- `editor`：查看和编辑论文；
- `viewer`：只能查看论文。

所有者输入成员邮箱后，成员使用完全相同的邮箱登录 KNUT Thesis Studio，
系统会自动接受邀请并显示共享论文。不要在浏览器或仓库中保存 Supabase
Secret/Service Role Key。
