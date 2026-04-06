# GitHub Actions Secrets Template

在仓库中按以下路径添加：

- `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

## Required (Cloudflare Pages)

| Name | Value format | Example |
| --- | --- | --- |
| `CLOUDFLARE_PROJECT_NAME` | Cloudflare Pages 项目名（不是 URL） | `edu-publish` |
| `CLOUDFLARE_API_TOKEN` | 具有 Pages Deploy 权限的 API Token | `***` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID | `***` |
| `CLOUDFLARE_PAGES_TEST_URL` | test 分支预览环境完整 HTTPS URL，不带末尾 `/` | `https://test.edu-publish.pages.dev` |
| `CLOUDFLARE_PAGES_URL` | main 分支生产环境完整 HTTPS URL，不带末尾 `/` | `https://edu-publish.pages.dev` |

## Required (R2 attachments)

| Name | Value format | Example |
| --- | --- | --- |
| `R2_PUBLIC_BASE_URL` | R2 对外访问基础 URL，不带末尾 `/` | `https://pub-r2.example.com` |
| `R2_BUCKET` | R2 Bucket 名称 | `edu-publish` |
| `R2_S3_ENDPOINT` | S3 兼容 endpoint（含 account id） | `https://<accountid>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | R2 Access Key ID | `***` |
| `R2_SECRET_ACCESS_KEY` | R2 Secret Access Key | `***` |

## Notes

- Secret 的值不要额外加引号。
- `CLOUDFLARE_PROJECT_NAME` 仅用于 `wrangler pages deploy --project-name`，不用于拼接 URL。
- `CLOUDFLARE_PAGES_TEST_URL` 与 `CLOUDFLARE_PAGES_URL` 必须填写真实可访问域名，工作流不会自动回退推导。
