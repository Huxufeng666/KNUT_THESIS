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

## 正式域名和 HTTPS

1. 在域名服务商处添加 `A` 记录，将域名指向服务器公网 IP
   `210.119.146.237`。
2. 复制域名版 Nginx 配置，并把 `YOUR_DOMAIN` 替换为实际域名：

```bash
sed 's/YOUR_DOMAIN/你的域名/g' deploy/nginx/knut-thesis-domain.conf.example \
  > /tmp/knut-thesis.conf
sudo cp /tmp/knut-thesis.conf /etc/nginx/sites-available/knut-thesis
sudo ln -sfn /etc/nginx/sites-available/knut-thesis /etc/nginx/sites-enabled/knut-thesis
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

3. DNS 生效且 HTTP 可访问后，申请并自动配置免费 HTTPS 证书：

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名 --redirect
sudo certbot renew --dry-run
```

4. 在 Supabase `Authentication → URL Configuration` 中设置：

```text
Site URL: https://你的域名
Redirect URLs: https://你的域名/**
```

Google OAuth 的 Authorized redirect URI 仍然使用 Supabase 提供的回调地址，
不要改成编辑器域名：

```text
https://prpeqoezuopbdavrdayx.supabase.co/auth/v1/callback
```

项目已将 `supabase-js` 打包在本机，不会在打开编辑器时从公共 CDN 下载。
邮箱登录是默认入口，Google 登录仅作为备用。

## SSH 管理限制

不要关闭当前 SSH 会话后再修改防火墙。先确认研究室固定公网 IP 或 VPN
网段，然后只允许该来源连接 22 端口：

```bash
sudo ufw allow from <研究室固定IP或VPN网段> to any port 22 proto tcp
sudo ufw delete allow 22/tcp
sudo ufw status numbered
```

在确认固定 IP 之前不要删除现有的 SSH 规则，否则可能锁死服务器。
