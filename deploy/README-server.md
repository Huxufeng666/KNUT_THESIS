# KNUT Thesis Studio 多用户服务器部署

生产服务器使用 Supabase 登录验证。每个登录用户只会访问
`/var/lib/knut-thesis/users/<Supabase user id>` 对应的隔离工作区。

## 启动

```bash
cp .env.production.example .env.production
nano .env.production
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

容器只绑定到服务器的 `127.0.0.1:4173`，外部用户不能直接绕过
Nginx 访问 Node.js 服务。

## Nginx

```bash
sudo cp deploy/nginx/knut-thesis.conf /etc/nginx/sites-available/knut-thesis
sudo ln -s /etc/nginx/sites-available/knut-thesis /etc/nginx/sites-enabled/knut-thesis
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

正式使用域名后，应使用 Certbot 配置 HTTPS，并在 Supabase Authentication
的 URL Configuration 中添加正式的 `https://` 地址。

## SSH 管理限制

不要关闭当前 SSH 会话后再修改防火墙。先确认研究室固定公网 IP 或 VPN
网段，然后只允许该来源连接 22 端口：

```bash
sudo ufw allow from <研究室固定IP或VPN网段> to any port 22 proto tcp
sudo ufw delete allow 22/tcp
sudo ufw status numbered
```

在确认固定 IP 之前不要删除现有的 SSH 规则，否则可能锁死服务器。
