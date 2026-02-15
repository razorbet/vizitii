# ВизитИИ — vizitii.ru

AI-Администратор для сферы услуг.

## Деплой

Автоматический деплой на reg.ru через GitHub Actions при пуше в `main`.

### Настройка Secrets

В настройках репозитория → Settings → Secrets and variables → Actions, добавь:

| Secret | Значение |
|--------|----------|
| `FTP_SERVER` | IP-адрес сервера |
| `FTP_USERNAME` | FTP логин |
| `FTP_PASSWORD` | FTP пароль |

### Ручной деплой

```bash
git add .
git commit -m "update: ..."
git push origin main
```

Деплой запустится автоматически.
