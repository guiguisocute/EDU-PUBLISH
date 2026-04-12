# SKILLS — 项目级 skill 安装约定

> **你是一个 AI agent，正在为 EDU-PUBLISH 项目准备运行时所需的本地 skills。**
> 在执行 `.agent/SETUP.md` 或任何 archive -> content 自动处理前，先完成本文件中的准备动作。

## 目标

将 `https://github.com/guiguisocute/EDU-PUBLISH-skills` 中当前项目依赖的 skills 安装到项目根目录下的 `./skills/`。

- `./skills/` 是项目本地依赖目录，已被 `.gitignore` 忽略
- 安装完成后，后续 agent 应按任务需要读取 `./skills/<skill-name>/SKILL.md`
- 如果某个 skill 已存在，不要覆盖；只安装缺失项

## 必装 skill 列表

- `skills/edup-reconcile`
- `skills/edup-incremental-process`
- `skills/edup-map-source`
- `skills/edup-merge-supplement`
- `skills/edup-parse-and-create-cards`
- `skills/edup-validate-and-push`
- `skills/edup-write-conclusion`
- `skills/edup-write-worklog`

## 安装方式

使用 git sparse checkout 拉取 skill 仓库并复制缺失项：

```bash
REPO="guiguisocute/EDU-PUBLISH-skills"
REF="${EDU_PUBLISH_SKILLS_REF:-main}"
SKILLS_DIR="./skills"

REQUIRED_SKILLS=(
  edup-reconcile
  edup-incremental-process
  edup-map-source
  edup-merge-supplement
  edup-parse-and-create-cards
  edup-validate-and-push
  edup-write-conclusion
  edup-write-worklog
)

# 检查是否有需要安装的 skill
needs_install=false
for skill in "${REQUIRED_SKILLS[@]}"; do
  if [ ! -d "$SKILLS_DIR/$skill" ]; then
    needs_install=true
    break
  fi
done

if [ "$needs_install" = false ]; then
  echo "All skills already installed."
  exit 0
fi

# 临时目录用于 sparse checkout
tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

git clone --depth 1 --branch "$REF" --filter=blob:none --sparse \
  "https://github.com/$REPO.git" "$tmpdir" 2>/dev/null

cd "$tmpdir"
git sparse-checkout set skills/
cd - > /dev/null

# 逐个复制缺失的 skill
mkdir -p "$SKILLS_DIR"
for skill in "${REQUIRED_SKILLS[@]}"; do
  src="$tmpdir/skills/$skill"
  dst="$SKILLS_DIR/$skill"
  if [ -d "$dst" ]; then
    echo "skip: $skill (already exists)"
  elif [ -d "$src" ]; then
    cp -r "$src" "$dst"
    echo "installed: $skill"
  else
    echo "WARNING: $skill not found in $REPO@$REF"
  fi
done
```

如果需要切换 skill 仓库分支，可在执行前设置环境变量：

```bash
EDU_PUBLISH_SKILLS_REF=dev
```

## 安装后校验

确认 8 个 skill 都已就绪：

```bash
ls \
  skills/edup-reconcile/SKILL.md \
  skills/edup-incremental-process/SKILL.md \
  skills/edup-map-source/SKILL.md \
  skills/edup-merge-supplement/SKILL.md \
  skills/edup-parse-and-create-cards/SKILL.md \
  skills/edup-validate-and-push/SKILL.md \
  skills/edup-write-conclusion/SKILL.md \
  skills/edup-write-worklog/SKILL.md
```

## 使用约定

- 增量入口与批处理节奏：优先参考 `edup-incremental-process`
- QQ/archive 到卡片生成：优先参考 `edup-parse-and-create-cards`、`edup-merge-supplement`、`edup-map-source`
- 每日对账与收尾：优先参考 `edup-reconcile`、`edup-write-conclusion`、`edup-write-worklog`
- 推送前校验与分支动作：优先参考 `edup-validate-and-push`

如果缺少任何一个 required skill，不要继续执行后续自动化链路。
